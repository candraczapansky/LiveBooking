import { z } from 'zod';
import type { IStorage } from '../storage.js';
import { encrypt, decrypt } from '../utils/encryption.js';

// Terminal configuration schema
const TerminalConfigSchema = z.object({
  id: z.string().optional(), // Database ID
  terminalId: z.string(),
  deviceCode: z.string(), // Shown on the device during pairing
  locationId: z.string(),
  apiToken: z.string(),
  isActive: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

type TerminalConfig = z.infer<typeof TerminalConfigSchema>;

export class TerminalConfigService {
  constructor(private readonly storage: IStorage) {}

  /**
   * Save terminal configuration with encrypted API token
   */
  async saveTerminalConfig(config: Omit<TerminalConfig, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      // Validate config
      TerminalConfigSchema.parse(config);

      // Encrypt the API token before storing
      const encryptedToken = await encrypt(config.apiToken);

      // Store in database
      let terminalConfig;
      try {
        terminalConfig = await (this.storage as any).db.insert("terminal_configurations").values({
          terminalId: config.terminalId,
          locationId: config.locationId,
          apiToken: encryptedToken,
          deviceCode: config.deviceCode,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning().execute();
      } catch (e: any) {
        // Auto-create table on first use if missing
        const message = String(e?.message || e);
        if (message.includes('relation') && message.includes('terminal_configurations')) {
          console.warn('⚠️ terminal_configurations not found. Creating it now...');
          const sql = `
            CREATE TABLE IF NOT EXISTS terminal_configurations (
              id SERIAL PRIMARY KEY,
              terminal_id TEXT NOT NULL,
              location_id TEXT NOT NULL,
              api_token TEXT NOT NULL,
              device_code TEXT NOT NULL,
              is_active BOOLEAN DEFAULT true,
              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW(),
              UNIQUE(location_id, terminal_id)
            );
          `;
          await (this.storage as any).db.execute(sql as any);
          // Retry insert
          terminalConfig = await (this.storage as any).db.insert("terminal_configurations").values({
            terminalId: config.terminalId,
            locationId: config.locationId,
            apiToken: encryptedToken,
            deviceCode: config.deviceCode,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          }).returning().execute();
        } else {
          throw e;
        }
      }

      return terminalConfig[0];
    } catch (error: any) {
      console.error('❌ Error saving terminal configuration:', error);
      throw error;
    }
  }

  /**
   * Get terminal configuration by location ID
   */
  async getTerminalConfig(locationId: string): Promise<TerminalConfig | null> {
    try {
      const config = await (this.storage as any).db
        .select()
        .from("terminal_configurations")
        .where("locationId", "=", locationId)
        .where("isActive", "=", true)
        .limit(1)
        .execute();

      if (!config.length) {
        return null;
      }

      // Decrypt the API token
      const decryptedToken = await decrypt(config[0].apiToken);

      return {
        ...config[0],
        apiToken: decryptedToken,
      };
    } catch (error: any) {
      console.error('❌ Error getting terminal configuration:', error);
      throw error;
    }
  }

  /**
   * Get terminal configuration by device code
   */
  async getTerminalConfigByDeviceCode(deviceCode: string): Promise<TerminalConfig | null> {
    try {
      const config = await (this.storage as any).db
        .select()
        .from("terminal_configurations")
        .where("deviceCode", "=", deviceCode)
        .where("isActive", "=", true)
        .limit(1)
        .execute();

      if (!config.length) {
        return null;
      }

      const decryptedToken = await decrypt(config[0].apiToken);

      return {
        ...config[0],
        apiToken: decryptedToken,
      } as TerminalConfig;
    } catch (error: any) {
      console.error('❌ Error getting terminal configuration by device code:', error);
      throw error;
    }
  }

  /**
   * Update terminal configuration
   */
  async updateTerminalConfig(locationId: string, updates: Partial<TerminalConfig>) {
    try {
      // If updating API token, encrypt it
      if (updates.apiToken) {
        updates.apiToken = await encrypt(updates.apiToken);
      }

      const updated = await (this.storage as any).db
        .update("terminal_configurations")
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where("locationId", "=", locationId)
        .returning()
        .execute();

      return updated[0];
    } catch (error: any) {
      console.error('❌ Error updating terminal configuration:', error);
      throw error;
    }
  }

  /**
   * Deactivate terminal configuration
   */
  async deactivateTerminalConfig(locationId: string) {
    try {
      await (this.storage as any).db
        .update("terminal_configurations")
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where("locationId", "=", locationId)
        .execute();

      return true;
    } catch (error: any) {
      console.error('❌ Error deactivating terminal configuration:', error);
      throw error;
    }
  }
}
