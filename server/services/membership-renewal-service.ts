import { IStorage } from "../storage.js";
import LoggerService from "../utils/logger.js";

interface MembershipRenewalService {
  start(): void;
  stop(): void;
  processRenewals(): Promise<void>;
}

export class MembershipAutoRenewalService implements MembershipRenewalService {
  private storage: IStorage;
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private checkInterval = 60 * 60 * 1000; // Check every hour

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  start() {
    if (this.intervalId) {
      LoggerService.warn("Membership renewal service already running");
      return;
    }

    LoggerService.info("Starting membership auto-renewal service");
    
    // Run immediately on start
    this.processRenewals().catch((error) => {
      LoggerService.error("Error processing renewals on startup", error);
    });

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.processRenewals().catch((error) => {
        LoggerService.error("Error processing renewals", error);
      });
    }, this.checkInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      LoggerService.info("Stopped membership auto-renewal service");
    }
  }

  async processRenewals() {
    if (this.isProcessing) {
      LoggerService.debug("Renewal processing already in progress, skipping");
      return;
    }

    this.isProcessing = true;
    const today = new Date();
    const currentDay = today.getDate();

    try {
      LoggerService.info("Starting membership renewal check", { 
        date: today.toISOString(), 
        dayOfMonth: currentDay 
      });

      // Get all active client memberships with auto-renewal enabled
      const memberships = await this.storage.getExpiringMemberships();
      
      for (const clientMembership of memberships) {
        try {
          // If the membership has reached/passed its end date, automatically disable auto-renewal
          const endDate = new Date(clientMembership.endDate);
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
          if (endDate <= todayStart) {
            await this.storage.updateClientMembership(clientMembership.id, {
              autoRenew: false,
              active: false,
            });
            LoggerService.info("Auto-renewal disabled for expired membership", {
              clientMembershipId: clientMembership.id,
              endDate: endDate.toISOString(),
            });
            // Skip renewal attempts once auto-renew is turned off
            continue;
          }

          // Check if this membership needs renewal
          if (!this.shouldRenew(clientMembership, today)) {
            continue;
          }

          await this.renewMembership(clientMembership);
        } catch (error: any) {
          LoggerService.error("Error renewing membership", {
            clientMembershipId: clientMembership.id,
            error: error.message || error
          });
          
          // Update failure count
          await this.storage.updateClientMembership(clientMembership.id, {
            renewalFailureCount: (clientMembership.renewalFailureCount || 0) + 1,
            lastRenewalAttempt: new Date()
          });
        }
      }

      LoggerService.info("Completed membership renewal check");
    } catch (error) {
      LoggerService.error("Error in renewal processing", { error: (error as any).message || error });
    } finally {
      this.isProcessing = false;
    }
  }

  private shouldRenew(clientMembership: any, today: Date): boolean {
    // Check if auto-renewal is enabled
    if (!clientMembership.autoRenew) {
      return false;
    }

    // Check if we have a payment method
    if (!clientMembership.paymentMethodId) {
      LoggerService.warn("No payment method for auto-renewal", {
        clientMembershipId: clientMembership.id
      });
      return false;
    }

    // Check if membership is expiring soon (within 7 days)
    const endDate = new Date(clientMembership.endDate);
    const daysUntilExpiry = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry > 7) {
      return false; // Not expiring soon
    }

    // Check if today is the renewal day or if we're past the renewal day and haven't renewed yet
    const renewalDay = clientMembership.renewalDate || 1;
    const currentDay = today.getDate();
    
    // If we haven't attempted renewal today
    if (clientMembership.lastRenewalAttempt) {
      const lastAttempt = new Date(clientMembership.lastRenewalAttempt);
      if (
        lastAttempt.getFullYear() === today.getFullYear() &&
        lastAttempt.getMonth() === today.getMonth() &&
        lastAttempt.getDate() === today.getDate()
      ) {
        return false; // Already attempted today
      }
    }

    // Check if it's the renewal day or we're past it
    if (currentDay >= renewalDay || daysUntilExpiry <= 0) {
      return true;
    }

    return false;
  }

  private async renewMembership(clientMembership: any) {
    LoggerService.info("Renewing membership", {
      clientMembershipId: clientMembership.id,
      clientId: clientMembership.clientId,
      membershipId: clientMembership.membershipId
    });

    // Get membership details
    const membership = await this.storage.getMembership(clientMembership.membershipId);
    if (!membership) {
      throw new Error("Membership not found");
    }

    // Get client details
    const client = await this.storage.getUserById(clientMembership.clientId);
    if (!client) {
      throw new Error("Client not found");
    }

    // Process payment using saved payment method
    const paymentResult = await this.processAutoPayment(
      client,
      membership,
      clientMembership.paymentMethodId
    );

    if (paymentResult.success) {
      // Calculate new dates
      const newStartDate = new Date(clientMembership.endDate);
      newStartDate.setDate(newStartDate.getDate() + 1);
      
      const newEndDate = new Date(newStartDate);
      newEndDate.setDate(newEndDate.getDate() + membership.duration);

      // Update membership with new dates
      await this.storage.updateClientMembership(clientMembership.id, {
        startDate: newStartDate,
        endDate: newEndDate,
        lastRenewalAttempt: new Date(),
        renewalFailureCount: 0 // Reset failure count on success
      });

      // Create payment record
      await this.storage.createPayment({
        clientId: client.id,
        clientMembershipId: clientMembership.id,
        amount: membership.price,
        totalAmount: membership.price,
        method: "card",
        status: "completed",
        type: "membership_renewal",
        description: `Auto-renewal for ${membership.name}`,
        helcimPaymentId: paymentResult.paymentId,
        paymentDate: new Date(),
        processedAt: new Date()
      });

      LoggerService.info("Membership renewed successfully", {
        clientMembershipId: clientMembership.id,
        newEndDate: newEndDate.toISOString()
      });

      // Send confirmation email to client
      await this.sendRenewalConfirmation(client, membership, newEndDate);
    } else {
      throw new Error(`Payment failed: ${paymentResult.error}`);
    }
  }

  private async processAutoPayment(
    client: any,
    membership: any,
    paymentMethodId: string
  ): Promise<{ success: boolean; paymentId?: string; error?: string }> {
    try {
      const apiToken = process.env.HELCIM_API_TOKEN;
      if (!apiToken) {
        return { success: false, error: "Helcim API not configured" };
      }

      // Parse the payment method ID which should contain customerId and cardId
      const [customerId, cardId] = paymentMethodId.split(":");
      
      if (!customerId || !cardId) {
        return { success: false, error: "Invalid payment method ID format" };
      }

      // Process payment with saved card via Helcim
      const response = await fetch(`${process.env.HELCIM_API_URL || 'https://api.helcim.com/v2'}/payment/purchase`, {
        method: 'POST',
        headers: {
          'api-token': apiToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerCode: customerId,
          cardId: cardId,
          amount: membership.price,
          currency: 'USD',
          invoice: {
            invoiceNumber: `MEM-${Date.now()}`,
            description: `Auto-renewal: ${membership.name}`
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { 
          success: false, 
          error: errorData.message || "Payment processing failed" 
        };
      }

      const result = await response.json();
      
      return {
        success: true,
        paymentId: result.transaction?.transactionId || result.transactionId
      };
    } catch (error: any) {
      LoggerService.error("Error processing auto-payment", { error: error.message || error });
      return { 
        success: false, 
        error: error.message || "Payment processing error" 
      };
    }
  }

  private async sendRenewalConfirmation(client: any, membership: any, newEndDate: Date) {
    try {
      // This would integrate with your email service
      LoggerService.info("Sending renewal confirmation email", {
        clientEmail: client.email,
        membershipName: membership.name
      });

      // TODO: Implement actual email sending
      // await emailService.send({
      //   to: client.email,
      //   subject: `Membership Renewed: ${membership.name}`,
      //   template: 'membership-renewal',
      //   data: {
      //     clientName: `${client.firstName} ${client.lastName}`,
      //     membershipName: membership.name,
      //     amount: membership.price,
      //     newEndDate: newEndDate.toLocaleDateString()
      //   }
      // });
    } catch (error) {
      LoggerService.error("Error sending renewal confirmation", { error: (error as any).message || error });
      // Don't throw - email failure shouldn't fail the renewal
    }
  }
}

// Export factory function
export function createMembershipRenewalService(storage: IStorage): MembershipRenewalService {
  return new MembershipAutoRenewalService(storage);
}
