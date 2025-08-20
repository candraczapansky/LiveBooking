import { IStorage } from "./storage.js";

interface CheckSoftwareConfig {
  providerId: number;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  companyId?: string;
  locationId?: string;
  config?: any;
}

interface PayrollCheckData {
  staffId: number;
  staffName: string;
  checkAmount: number;
  checkDate: Date;
  checkNumber?: string;
  payrollPeriod: {
    startDate: Date;
    endDate: Date;
  };
  earningsBreakdown: {
    totalHours?: number;
    totalServices?: number;
    totalCommission?: number;
    totalHourlyPay?: number;
    totalFixedPay?: number;
  };
}

interface CheckIssueResult {
  success: boolean;
  checkId?: string;
  providerCheckId?: string;
  checkNumber?: string;
  checkImageUrl?: string;
  error?: string;
}

export class CheckSoftwareService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  // Get all available check software providers
  async getProviders(): Promise<any[]> {
    try {
      return await this.storage.getCheckSoftwareProviders();
    } catch (error) {
      console.error('Error fetching check software providers:', error);
      return [];
    }
  }

  // Get active provider
  async getActiveProvider(): Promise<any | null> {
    try {
      const providers = await this.storage.getCheckSoftwareProviders();
      return providers.find(p => p.isActive) || null;
    } catch (error) {
      console.error('Error fetching active check software provider:', error);
      return null;
    }
  }

  // Create or update a provider
  async saveProvider(provider: any): Promise<any> {
    try {
      if (provider.id) {
        return await this.storage.updateCheckSoftwareProvider(provider.id, provider);
      } else {
        return await this.storage.createCheckSoftwareProvider(provider);
      }
    } catch (error) {
      console.error('Error saving check software provider:', error);
      throw error;
    }
  }

  // Issue a payroll check through the configured provider
  async issuePayrollCheck(payrollHistoryId: number, checkData: PayrollCheckData): Promise<CheckIssueResult> {
    try {
      const provider = await this.getActiveProvider();
      if (!provider) {
        return {
          success: false,
          error: 'No active check software provider configured'
        };
      }

      // Create payroll check record
      const payrollCheck = await this.storage.createPayrollCheck({
        payrollHistoryId,
        staffId: checkData.staffId,
        checkAmount: checkData.checkAmount,
        checkDate: checkData.checkDate,
        checkNumber: checkData.checkNumber,
        providerId: provider.id,
        status: 'pending'
      });

      // Issue check through provider
      const result = await this.issueCheckThroughProvider(provider, payrollCheck, checkData);

      // Update payroll check with provider response
      if (result.success) {
        await this.storage.updatePayrollCheck(payrollCheck.id, {
          providerCheckId: result.providerCheckId,
          checkNumber: result.checkNumber,
          checkImageUrl: result.checkImageUrl,
          status: 'issued',
          issueDate: new Date()
        });
      } else {
        await this.storage.updatePayrollCheck(payrollCheck.id, {
          status: 'error',
          notes: result.error
        });
      }

      // Log the API call
      await this.logApiCall(provider.id, 'create_check', result.success ? 'success' : 'error', {
        payrollCheckId: payrollCheck.id,
        checkData
      }, result, result.error);

      return result;

    } catch (error: any) {
      console.error('Error issuing payroll check:', error);
      return {
        success: false,
        error: error.message || 'Failed to issue payroll check'
      };
    }
  }

  // Issue check through specific provider
  private async issueCheckThroughProvider(provider: any, payrollCheck: any, checkData: PayrollCheckData): Promise<CheckIssueResult> {
    switch (provider.name.toLowerCase()) {
      case 'quickbooks':
        return await this.issueQuickBooksCheck(provider, payrollCheck, checkData);
      case 'square':
        return await this.issueSquareCheck(provider, payrollCheck, checkData);
      case 'gusto':
        return await this.issueGustoCheck(provider, payrollCheck, checkData);
      case 'adp':
        return await this.issueADPCheck(provider, payrollCheck, checkData);
      case 'paychex':
        return await this.issuePaychexCheck(provider, payrollCheck, checkData);
      default:
        return {
          success: false,
          error: `Unsupported check software provider: ${provider.name}`
        };
    }
  }

  // QuickBooks Payroll integration
  private async issueQuickBooksCheck(provider: any, payrollCheck: any, checkData: PayrollCheckData): Promise<CheckIssueResult> {
    try {
      // QuickBooks API integration would go here
      // This is a placeholder implementation
      const checkNumber = `QB${Date.now()}`;
      
      return {
        success: true,
        checkId: payrollCheck.id.toString(),
        providerCheckId: `qb_${Date.now()}`,
        checkNumber,
        checkImageUrl: `https://quickbooks.intuit.com/checks/${checkNumber}.pdf`
      };
    } catch (error: any) {
      return {
        success: false,
        error: `QuickBooks check issue failed: ${error.message}`
      };
    }
  }

  // Square Payroll integration
  private async issueSquareCheck(provider: any, payrollCheck: any, checkData: PayrollCheckData): Promise<CheckIssueResult> {
    try {
      // Square Payroll API integration would go here
      // This is a placeholder implementation
      const checkNumber = `SQ${Date.now()}`;
      
      return {
        success: true,
        checkId: payrollCheck.id.toString(),
        providerCheckId: `sq_${Date.now()}`,
        checkNumber,
        checkImageUrl: `https://squareup.com/payroll/checks/${checkNumber}.pdf`
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Square check issue failed: ${error.message}`
      };
    }
  }

  // Gusto Payroll integration
  private async issueGustoCheck(provider: any, payrollCheck: any, checkData: PayrollCheckData): Promise<CheckIssueResult> {
    try {
      // Gusto API integration would go here
      // This is a placeholder implementation
      const checkNumber = `GU${Date.now()}`;
      
      return {
        success: true,
        checkId: payrollCheck.id.toString(),
        providerCheckId: `gu_${Date.now()}`,
        checkNumber,
        checkImageUrl: `https://gusto.com/payroll/checks/${checkNumber}.pdf`
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Gusto check issue failed: ${error.message}`
      };
    }
  }

  // ADP Payroll integration
  private async issueADPCheck(provider: any, payrollCheck: any, checkData: PayrollCheckData): Promise<CheckIssueResult> {
    try {
      // ADP API integration would go here
      // This is a placeholder implementation
      const checkNumber = `ADP${Date.now()}`;
      
      return {
        success: true,
        checkId: payrollCheck.id.toString(),
        providerCheckId: `adp_${Date.now()}`,
        checkNumber,
        checkImageUrl: `https://adp.com/payroll/checks/${checkNumber}.pdf`
      };
    } catch (error: any) {
      return {
        success: false,
        error: `ADP check issue failed: ${error.message}`
      };
    }
  }

  // Paychex Payroll integration
  private async issuePaychexCheck(provider: any, payrollCheck: any, checkData: PayrollCheckData): Promise<CheckIssueResult> {
    try {
      // Paychex API integration would go here
      // This is a placeholder implementation
      const checkNumber = `PC${Date.now()}`;
      
      return {
        success: true,
        checkId: payrollCheck.id.toString(),
        providerCheckId: `pc_${Date.now()}`,
        checkNumber,
        checkImageUrl: `https://paychex.com/payroll/checks/${checkNumber}.pdf`
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Paychex check issue failed: ${error.message}`
      };
    }
  }

  // Void a payroll check
  async voidPayrollCheck(checkId: number, reason: string): Promise<boolean> {
    try {
      const check = await this.storage.getPayrollCheck(checkId);
      if (!check) {
        throw new Error('Payroll check not found');
      }

      const provider = await this.storage.getCheckSoftwareProvider(check.providerId);
      if (!provider) {
        throw new Error('Check software provider not found');
      }

      // Void check through provider
      const result = await this.voidCheckThroughProvider(provider, check);

      // Update check status
      await this.storage.updatePayrollCheck(checkId, {
        status: 'voided',
        voidDate: new Date(),
        voidReason: reason
      });

      // Log the API call
      await this.logApiCall(provider.id, 'void_check', result ? 'success' : 'error', {
        payrollCheckId: checkId,
        reason
      }, { success: result }, result ? undefined : 'Failed to void check');

      return result;

    } catch (error: any) {
      console.error('Error voiding payroll check:', error);
      return false;
    }
  }

  // Void check through specific provider
  private async voidCheckThroughProvider(provider: any, check: any): Promise<boolean> {
    switch (provider.name.toLowerCase()) {
      case 'quickbooks':
        return await this.voidQuickBooksCheck(provider, check);
      case 'square':
        return await this.voidSquareCheck(provider, check);
      case 'gusto':
        return await this.voidGustoCheck(provider, check);
      case 'adp':
        return await this.voidADPCheck(provider, check);
      case 'paychex':
        return await this.voidPaychexCheck(provider, check);
      default:
        console.error(`Unsupported check software provider for voiding: ${provider.name}`);
        return false;
    }
  }

  // Provider-specific void methods (placeholder implementations)
  private async voidQuickBooksCheck(provider: any, check: any): Promise<boolean> {
    // QuickBooks void check implementation
    return true;
  }

  private async voidSquareCheck(provider: any, check: any): Promise<boolean> {
    // Square void check implementation
    return true;
  }

  private async voidGustoCheck(provider: any, check: any): Promise<boolean> {
    // Gusto void check implementation
    return true;
  }

  private async voidADPCheck(provider: any, check: any): Promise<boolean> {
    // ADP void check implementation
    return true;
  }

  private async voidPaychexCheck(provider: any, check: any): Promise<boolean> {
    // Paychex void check implementation
    return true;
  }

  // Get payroll checks for a staff member
  async getPayrollChecks(staffId?: number, status?: string): Promise<any[]> {
    try {
      return await this.storage.getPayrollChecks(staffId, status);
    } catch (error) {
      console.error('Error fetching payroll checks:', error);
      return [];
    }
  }

  // Get check software logs
  async getCheckSoftwareLogs(providerId?: number, action?: string): Promise<any[]> {
    try {
      return await this.storage.getCheckSoftwareLogs(providerId, action);
    } catch (error) {
      console.error('Error fetching check software logs:', error);
      return [];
    }
  }

  // Log API calls
  private async logApiCall(
    providerId: number,
    action: string,
    status: string,
    requestData: any,
    responseData: any,
    errorMessage?: string
  ): Promise<void> {
    try {
      await this.storage.createCheckSoftwareLog({
        providerId,
        action,
        status,
        requestData: JSON.stringify(requestData),
        responseData: JSON.stringify(responseData),
        errorMessage,
        payrollCheckId: requestData.payrollCheckId
      });
    } catch (error) {
      console.error('Error logging API call:', error);
    }
  }
} 