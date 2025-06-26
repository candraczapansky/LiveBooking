import { IStorage } from './storage';

interface ExternalTimeEntry {
  id: string;
  staffId: number;
  staffName: string;
  clockInTime: string;
  clockOutTime?: string;
  date: string;
  totalHours?: number;
  status: 'clocked_in' | 'clocked_out';
}

interface ExternalTimeClockResponse {
  entries: ExternalTimeEntry[];
  summary: {
    totalActiveStaff: number;
    totalHoursToday: number;
    totalHoursWeek: number;
  };
}

export class TimeClockSyncService {
  private externalApiUrl = 'https://salon-staff-dashboard-candraczapansky.replit.app';
  
  constructor(private storage: IStorage) {}

  async fetchExternalTimeClockData(): Promise<ExternalTimeClockResponse | null> {
    try {
      // Try multiple potential API endpoints
      const endpoints = [
        '/api/time-entries',
        '/api/timeclock',
        '/api/clock-entries',
        '/api/time-clock'
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${this.externalApiUrl}${endpoint}`);
          if (response.ok) {
            const data = await response.json();
            console.log(`Successfully fetched data from ${endpoint}:`, data);
            return data;
          }
        } catch (error) {
          console.log(`Failed to fetch from ${endpoint}:`, error);
          continue;
        }
      }

      // If no API endpoints work, try to parse the main page for data
      const mainPageResponse = await fetch(this.externalApiUrl);
      if (mainPageResponse.ok) {
        const html = await mainPageResponse.text();
        
        // Look for embedded JSON data or scripts containing time clock data
        const jsonMatch = html.match(/window\.__TIME_CLOCK_DATA__\s*=\s*({.*?});/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[1]);
          console.log('Found embedded time clock data:', data);
          return data;
        }

        // Look for any JSON-like data structures in script tags
        const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gs);
        if (scriptMatches) {
          for (const script of scriptMatches) {
            try {
              const jsonData = script.match(/({.*"entries".*})/);
              if (jsonData) {
                const data = JSON.parse(jsonData[1]);
                console.log('Found time clock data in script:', data);
                return data;
              }
            } catch (e) {
              continue;
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error fetching external time clock data:', error);
      return null;
    }
  }

  async syncTimeClockData(): Promise<void> {
    try {
      const externalData = await this.fetchExternalTimeClockData();
      
      if (!externalData) {
        console.log('No external time clock data available');
        return;
      }

      // Sync each time entry
      for (const entry of externalData.entries) {
        await this.syncTimeEntry(entry);
      }

      console.log(`Successfully synced ${externalData.entries.length} time clock entries`);
    } catch (error) {
      console.error('Error syncing time clock data:', error);
    }
  }

  private async syncTimeEntry(externalEntry: ExternalTimeEntry): Promise<void> {
    try {
      // Check if staff member exists in our system
      const staff = await this.storage.getStaffByName(externalEntry.staffName);
      
      if (!staff) {
        console.log(`Staff member not found: ${externalEntry.staffName}`);
        return;
      }

      // Check if this time entry already exists
      const existingEntry = await this.storage.getTimeClockEntryByExternalId(externalEntry.id);
      
      if (existingEntry) {
        // Update existing entry
        await this.storage.updateTimeClockEntry(existingEntry.id, {
          clockOutTime: externalEntry.clockOutTime ? new Date(externalEntry.clockOutTime) : null,
          totalHours: externalEntry.totalHours || 0,
          status: externalEntry.status
        });
      } else {
        // Create new entry
        await this.storage.createTimeClockEntry({
          staffId: staff.id,
          date: new Date(externalEntry.date),
          clockInTime: new Date(externalEntry.clockInTime),
          clockOutTime: externalEntry.clockOutTime ? new Date(externalEntry.clockOutTime) : null,
          totalHours: externalEntry.totalHours || 0,
          status: externalEntry.status,
          externalId: externalEntry.id
        });
      }
    } catch (error) {
      console.error(`Error syncing time entry for ${externalEntry.staffName}:`, error);
    }
  }

  // Method to generate mock data for demonstration if external source is unavailable
  async generateMockTimeClockData(): Promise<void> {
    const staff = await this.storage.getAllStaff();
    
    if (staff.length === 0) {
      console.log('No staff members found for mock data generation');
      return;
    }

    const today = new Date();
    const mockEntries = [
      {
        staffId: staff[0].id,
        date: today,
        clockInTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0),
        clockOutTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 0),
        totalHours: 8,
        status: 'clocked_out' as const,
        externalId: `mock-${staff[0].id}-${today.toISOString().split('T')[0]}`
      }
    ];

    for (const entry of mockEntries) {
      try {
        await this.storage.createTimeClockEntry(entry);
        console.log(`Created mock time clock entry for staff ${entry.staffId}`);
      } catch (error) {
        console.error('Error creating mock time entry:', error);
      }
    }
  }
}