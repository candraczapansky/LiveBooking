import type { IStorage } from "./storage";
import { SquareClient } from "square";
import { sendEmail } from "./email";
import { sendSMS } from "./sms";

export class AutoRenewalService {
  private storage: IStorage;
  private squareClient: SquareClient;

  constructor(storage: IStorage, squareClient: SquareClient) {
    this.storage = storage;
    this.squareClient = squareClient;
  }

  // Check for memberships that need renewal and process them
  async processAutoRenewals(): Promise<void> {
    try {
      console.log("Checking for memberships that need auto-renewal...");
      
      // Get all active memberships with auto-renewal enabled
      const autoRenewMemberships = await this.getExpiredAutoRenewMemberships();
      
      if (autoRenewMemberships.length === 0) {
        console.log("No memberships need renewal at this time");
        return;
      }

      console.log(`Found ${autoRenewMemberships.length} memberships to renew`);

      for (const clientMembership of autoRenewMemberships) {
        await this.renewMembership(clientMembership);
      }
    } catch (error) {
      console.error("Error processing auto-renewals:", error);
    }
  }

  // Get expired memberships that have auto-renewal enabled
  private async getExpiredAutoRenewMemberships(): Promise<any[]> {
    try {
      const allClientMemberships = await this.storage.getAllClientMemberships();
      const now = new Date();
      
      return allClientMemberships.filter(cm => {
        const endDate = new Date(cm.endDate);
        return cm.autoRenew && 
               cm.active && 
               endDate <= now && 
               (cm.renewalFailureCount || 0) < 3; // Stop after 3 failures
      });
    } catch (error) {
      console.error("Error fetching auto-renew memberships:", error);
      return [];
    }
  }

  // Renew a specific membership
  private async renewMembership(clientMembership: any): Promise<void> {
    try {
      console.log(`Attempting to renew membership ${clientMembership.id} for client ${clientMembership.clientId}`);

      // Get client and membership details
      const client = await this.storage.getUser(clientMembership.clientId);
      const membership = await this.storage.getMembership(clientMembership.membershipId);

      if (!client || !membership) {
        console.error(`Missing client or membership data for renewal ${clientMembership.id}`);
        return;
      }

      // Process payment if payment method is stored
      let paymentSuccessful = false;
      let paymentId = null;

      if (clientMembership.paymentMethodId) {
        try {
          const paymentResult = await this.processRenewalPayment(
            clientMembership.paymentMethodId,
            membership.price,
            client,
            membership
          );
          paymentSuccessful = true;
          paymentId = paymentResult.payment.id;
        } catch (error) {
          console.error(`Payment failed for membership renewal ${clientMembership.id}:`, error);
          await this.handleRenewalFailure(clientMembership, client, membership, error);
          return;
        }
      } else {
        // No payment method stored - notify client
        await this.notifyPaymentMethodNeeded(client, membership, clientMembership);
        return;
      }

      if (paymentSuccessful) {
        // Extend the membership
        const newStartDate = new Date();
        const newEndDate = new Date();
        newEndDate.setDate(newEndDate.getDate() + membership.duration);

        await this.storage.updateClientMembership(clientMembership.id, {
          startDate: newStartDate,
          endDate: newEndDate,
          renewalFailureCount: 0,
          lastRenewalAttempt: new Date()
        });

        // Create payment record
        await this.storage.createPayment({
          clientId: client.id,
          clientMembershipId: clientMembership.id,
          amount: membership.price,
          method: "card",
          status: "completed",
          type: "membership_renewal",
          description: `Auto-renewal: ${membership.name}`,
          squarePaymentId: paymentId,
          paymentDate: new Date()
        });

        // Notify client of successful renewal
        await this.notifyRenewalSuccess(client, membership, newEndDate);
        
        console.log(`Successfully renewed membership ${clientMembership.id}`);
      }
    } catch (error) {
      console.error(`Error renewing membership ${clientMembership.id}:`, error);
      await this.handleRenewalFailure(clientMembership, null, null, error);
    }
  }

  // Process payment for renewal using stored payment method
  private async processRenewalPayment(
    paymentMethodId: string,
    amount: number,
    client: any,
    membership: any
  ): Promise<any> {
    try {
      const paymentsApi = this.squareClient.payments;
      
      const requestBody = {
        sourceId: paymentMethodId,
        amountMoney: {
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'USD'
        },
        idempotencyKey: `renewal-${Date.now()}-${Math.random()}`,
        note: `Auto-renewal: ${membership.name} for ${client.firstName} ${client.lastName}`,
        autocomplete: true
      };

      const response = await paymentsApi.createPayment(requestBody);
      
      if (response.result.payment?.status !== 'COMPLETED') {
        throw new Error(`Payment failed with status: ${response.result.payment?.status}`);
      }

      return response.result;
    } catch (error) {
      console.error("Square payment error during renewal:", error);
      throw error;
    }
  }

  // Handle renewal failure
  private async handleRenewalFailure(
    clientMembership: any,
    client: any,
    membership: any,
    error: any
  ): Promise<void> {
    try {
      const failureCount = (clientMembership.renewalFailureCount || 0) + 1;
      
      await this.storage.updateClientMembership(clientMembership.id, {
        renewalFailureCount: failureCount,
        lastRenewalAttempt: new Date()
      });

      // If client data is available, notify them
      if (client && membership) {
        if (failureCount >= 3) {
          // Disable auto-renewal and deactivate membership after 3 failures
          await this.storage.updateClientMembership(clientMembership.id, {
            autoRenew: false,
            active: false
          });
          await this.notifyRenewalCancelled(client, membership);
        } else {
          await this.notifyRenewalFailed(client, membership, failureCount);
        }
      }
    } catch (updateError) {
      console.error("Error updating renewal failure:", updateError);
    }
  }

  // Notify client that renewal was successful
  private async notifyRenewalSuccess(client: any, membership: any, newEndDate: Date): Promise<void> {
    try {
      const message = `Your ${membership.name} membership has been successfully renewed and is now active until ${newEndDate.toLocaleDateString()}.`;
      
      // Send email notification
      if (client.email && client.emailAccountManagement) {
        await sendEmail({
          to: client.email,
          from: "noreply@beautybook.com",
          subject: "Membership Auto-Renewed Successfully",
          html: `
            <h2>Membership Renewed</h2>
            <p>Dear ${client.firstName || 'Valued Customer'},</p>
            <p>${message}</p>
            <p>Thank you for continuing with us!</p>
            <p>Best regards,<br>Your Beauty Team</p>
          `
        });
      }

      // Send SMS notification
      if (client.phone && client.smsAccountManagement) {
        await sendSMS(client.phone, `BeautyBook: ${message}`);
      }
    } catch (error) {
      console.error("Error sending renewal success notification:", error);
    }
  }

  // Notify client that renewal failed
  private async notifyRenewalFailed(client: any, membership: any, attemptCount: number): Promise<void> {
    try {
      const message = `Your ${membership.name} membership auto-renewal failed (attempt ${attemptCount}/3). Please update your payment method to continue your membership.`;
      
      // Send email notification
      if (client.email && client.emailAccountManagement) {
        await sendEmail({
          to: client.email,
          subject: "Membership Renewal Failed - Action Required",
          html: `
            <h2>Membership Renewal Failed</h2>
            <p>Dear ${client.firstName || 'Valued Customer'},</p>
            <p>${message}</p>
            <p>Please log in to your account or contact us to update your payment information.</p>
            <p>Best regards,<br>Your Beauty Team</p>
          `
        });
      }

      // Send SMS notification
      if (client.phone && client.smsAccountManagement) {
        await sendSMS(client.phone, `BeautyBook: ${message}`);
      }
    } catch (error) {
      console.error("Error sending renewal failure notification:", error);
    }
  }

  // Notify client that auto-renewal has been cancelled after multiple failures
  private async notifyRenewalCancelled(client: any, membership: any): Promise<void> {
    try {
      const message = `Your ${membership.name} membership auto-renewal has been cancelled after multiple payment failures. Your membership is now inactive.`;
      
      // Send email notification
      if (client.email && client.emailAccountManagement) {
        await sendEmail({
          to: client.email,
          subject: "Membership Auto-Renewal Cancelled",
          html: `
            <h2>Membership Auto-Renewal Cancelled</h2>
            <p>Dear ${client.firstName || 'Valued Customer'},</p>
            <p>${message}</p>
            <p>To reactivate your membership, please contact us or purchase a new membership.</p>
            <p>Best regards,<br>Your Beauty Team</p>
          `
        });
      }

      // Send SMS notification
      if (client.phone && client.smsAccountManagement) {
        await sendSMS(client.phone, `BeautyBook: ${message}`);
      }
    } catch (error) {
      console.error("Error sending cancellation notification:", error);
    }
  }

  // Notify client that payment method is needed for renewal
  private async notifyPaymentMethodNeeded(client: any, membership: any, clientMembership: any): Promise<void> {
    try {
      const message = `Your ${membership.name} membership is expiring but no payment method is stored for auto-renewal. Please update your payment method to continue.`;
      
      // Send email notification
      if (client.email && client.emailAccountManagement) {
        await sendEmail({
          to: client.email,
          subject: "Payment Method Required for Membership Renewal",
          html: `
            <h2>Payment Method Required</h2>
            <p>Dear ${client.firstName || 'Valued Customer'},</p>
            <p>${message}</p>
            <p>Please log in to your account to add a payment method and ensure uninterrupted service.</p>
            <p>Best regards,<br>Your Beauty Team</p>
          `
        });
      }

      // Send SMS notification
      if (client.phone && client.smsAccountManagement) {
        await sendSMS(client.phone, `BeautyBook: ${message}`);
      }

      // Increment failure count since we couldn't process
      await this.storage.updateClientMembership(clientMembership.id, {
        renewalFailureCount: (clientMembership.renewalFailureCount || 0) + 1,
        lastRenewalAttempt: new Date()
      });
    } catch (error) {
      console.error("Error sending payment method notification:", error);
    }
  }

  // Start the auto-renewal service (run daily)
  startService(): void {
    console.log("Starting Auto-Renewal Service...");
    
    // Run immediately
    this.processAutoRenewals();
    
    // Run every 24 hours (86400000 ms)
    setInterval(() => {
      this.processAutoRenewals();
    }, 24 * 60 * 60 * 1000);
  }

  // Manual trigger for testing
  async manualRenewalCheck(): Promise<{ processed: number; errors: number }> {
    console.log("Manual renewal check triggered");
    
    const autoRenewMemberships = await this.getExpiredAutoRenewMemberships();
    let processed = 0;
    let errors = 0;

    for (const membership of autoRenewMemberships) {
      try {
        await this.renewMembership(membership);
        processed++;
      } catch (error) {
        errors++;
      }
    }

    return { processed, errors };
  }
}