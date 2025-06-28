// Automatic Payroll Synchronization System
// This module handles automatic triggers to sync payroll data to external dashboard

import { IStorage } from './storage';

interface PayrollSyncConfig {
  enabled: boolean;
  externalUrls: string[];
  retryAttempts: number;
  retryDelay: number;
}

class PayrollAutoSync {
  private storage: IStorage;
  private config: PayrollSyncConfig;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.config = {
      enabled: true,
      externalUrls: [
        'https://salonstaffdashboard.candraczapansky.repl.co/api/payroll-data',
        'https://salon-staff-dashboard.candraczapansky.repl.co/api/payroll-data',
        'https://salonstaffdashboard--candraczapansky.repl.co/api/payroll-data',
        'https://salon-staff-dashboard--candraczapansky.repl.co/api/payroll-data'
      ],
      retryAttempts: 3,
      retryDelay: 1000
    };
  }

  // Main trigger function - called when payroll-related data changes
  async triggerPayrollSync(staffId: number, changeType: 'appointment' | 'time_entry' | 'earnings' | 'manual') {
    if (!this.config.enabled) {
      console.log('Payroll auto-sync is disabled');
      return;
    }

    console.log(`[PayrollAutoSync] Triggered by ${changeType} for staff ${staffId}`);

    try {
      // Get staff information
      const staff = await this.storage.getStaff();
      const targetStaff = staff.find(s => s.id === staffId);
      
      if (!targetStaff) {
        console.log(`[PayrollAutoSync] Staff ${staffId} not found`);
        return;
      }

      // Calculate current month boundaries
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      // Prepare comprehensive payroll data
      const payrollData = await this.preparePayrollData(staffId, monthStart, monthEnd);
      
      // Attempt to sync with external dashboard
      const syncResult = await this.syncToExternalDashboard(payrollData);
      
      if (syncResult.success) {
        console.log(`[PayrollAutoSync] Successfully synced payroll data for ${targetStaff.title} (${payrollData.staffName})`);
      } else {
        console.log(`[PayrollAutoSync] Failed to sync payroll data for ${targetStaff.title} (${payrollData.staffName}): ${syncResult.error}`);
      }

    } catch (error) {
      console.error('[PayrollAutoSync] Error during automatic sync:', error);
    }
  }

  // Prepare comprehensive payroll data for sync
  private async preparePayrollData(staffId: number, monthStart: Date, monthEnd: Date) {
    // Get staff details
    const staff = await this.storage.getStaff();
    const targetStaff = staff.find(s => s.id === staffId);
    
    if (!targetStaff) {
      throw new Error(`Staff ${staffId} not found`);
    }

    // Get staff earnings for the month
    const staffEarnings = await this.storage.getStaffEarnings(staffId, monthStart);
    
    // Get time clock entries
    const staffTimeEntries = await this.storage.getTimeClockEntriesByStaffId(staffId, monthStart, monthEnd);

    // Calculate totals
    const totalEarnings = staffEarnings.reduce((sum: number, earning: any) => sum + earning.earningsAmount, 0);
    const totalHours = staffTimeEntries.reduce((sum: number, entry: any) => sum + (entry.totalHours || 0), 0);
    const totalServices = staffEarnings.length;

    // Get appointments for additional context
    const appointments = await this.storage.getAppointments();
    const staffAppointments = appointments.filter((apt: any) => 
      apt.staffId === staffId && 
      new Date(apt.appointmentDate) >= monthStart && 
      new Date(apt.appointmentDate) <= monthEnd
    );

    const totalRevenue = staffAppointments.reduce((sum: number, apt: any) => sum + (apt.totalPrice || 0), 0);

    return {
      staffId,
      userId: targetStaff.userId,
      staffName: `${targetStaff.user?.firstName || ''} ${targetStaff.user?.lastName || ''}`.trim(),
      email: targetStaff.user?.email || '',
      title: targetStaff.title,
      commissionType: targetStaff.commissionType,
      baseCommissionRate: targetStaff.commissionRate || 0,
      hourlyRate: targetStaff.hourlyRate || 0,
      fixedRate: targetStaff.fixedRate || 0,
      month: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
      monthStart: monthStart.toISOString(),
      monthEnd: monthEnd.toISOString(),
      totalHours,
      totalServices,
      totalRevenue,
      totalEarnings,
      earnings: staffEarnings,
      timeEntries: staffTimeEntries,
      appointments: staffAppointments,
      syncedAt: new Date().toISOString(),
      changeType: 'automatic_sync'
    };
  }

  // Sync data to external dashboard with retry logic
  private async syncToExternalDashboard(payrollData: any): Promise<{success: boolean, error?: string, url?: string}> {
    for (const url of this.config.externalUrls) {
      for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
        try {
          console.log(`[PayrollAutoSync] Attempting sync to ${url} (attempt ${attempt}/${this.config.retryAttempts})`);
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payrollData),
            signal: AbortSignal.timeout(5000) // 5 second timeout
          });

          if (response.ok) {
            console.log(`[PayrollAutoSync] Successfully synced to ${url}`);
            return { success: true, url };
          } else {
            console.log(`[PayrollAutoSync] HTTP ${response.status} from ${url}`);
          }
        } catch (error) {
          console.log(`[PayrollAutoSync] Attempt ${attempt} failed for ${url}:`, error);
          
          if (attempt < this.config.retryAttempts) {
            await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
          }
        }
      }
    }

    return { success: false, error: 'All sync attempts failed' };
  }

  // Configuration methods
  setEnabled(enabled: boolean) {
    this.config.enabled = enabled;
    console.log(`[PayrollAutoSync] Auto-sync ${enabled ? 'enabled' : 'disabled'}`);
  }

  addExternalUrl(url: string) {
    if (!this.config.externalUrls.includes(url)) {
      this.config.externalUrls.push(url);
      console.log(`[PayrollAutoSync] Added external URL: ${url}`);
    }
  }

  removeExternalUrl(url: string) {
    const index = this.config.externalUrls.indexOf(url);
    if (index > -1) {
      this.config.externalUrls.splice(index, 1);
      console.log(`[PayrollAutoSync] Removed external URL: ${url}`);
    }
  }

  getConfig() {
    return { ...this.config };
  }
}

export { PayrollAutoSync };