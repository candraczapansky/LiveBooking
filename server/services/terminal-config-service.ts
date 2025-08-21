import { z } from 'zod';
import { sql } from 'drizzle-orm';
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
        const insertSql = sql`INSERT INTO terminal_configurations (
          terminal_id, location_id, api_token, device_code, is_active, created_at, updated_at
        ) VALUES (
          ${config.terminalId}, ${config.locationId}, ${encryptedToken}, ${config.deviceCode}, true, NOW(), NOW()
        ) RETURNING *` as any;
        const result: any = await (this.storage as any).db.execute(insertSql);
        terminalConfig = result?.rows || result;
      } catch (e: any) {
        // Auto-create table on first use if missing
        const message = String(e?.message || e);
        if (message.includes('relation') && message.includes('terminal_configurations')) {
          console.warn('⚠️ terminal_configurations not found. Creating it now...');
          const createSql = `
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
);`;
          await (this.storage as any).db.execute(createSql as any);
          // Retry insert
          const retrySql = sql`INSERT INTO terminal_configurations (
            terminal_id, location_id, api_token, device_code, is_active, created_at, updated_at
          ) VALUES (
            ${config.terminalId}, ${config.locationId}, ${encryptedToken}, ${config.deviceCode}, true, NOW(), NOW()
          ) RETURNING *` as any;
          const retryResult: any = await (this.storage as any).db.execute(retrySql);
          terminalConfig = retryResult?.rows || retryResult;
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
      const sel = sql`SELECT * FROM terminal_configurations WHERE location_id = ${locationId} AND is_active = true LIMIT 1` as any;
      const res: any = await (this.storage as any).db.execute(sel);
      const config = res?.rows || res || [];

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
      const sel = sql`SELECT * FROM terminal_configurations WHERE device_code = ${deviceCode} AND is_active = true LIMIT 1` as any;
      const res: any = await (this.storage as any).db.execute(sel);
      const config = res?.rows || res || [];

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

      // Build dynamic update SQL
      const fields: string[] = [];
      const values: any[] = [];
      if (updates.terminalId) { fields.push(`terminal_id = $${fields.length + 1}`); values.push(updates.terminalId); }
      if (updates.deviceCode) { fields.push(`device_code = $${fields.length + 1}`); values.push(updates.deviceCode); }
      if (updates.apiToken) { fields.push(`api_token = $${fields.length + 1}`); values.push(updates.apiToken); }
      if (typeof updates.isActive === 'boolean') { fields.push(`is_active = $${fields.length + 1}`); values.push(updates.isActive); }
      fields.push(`updated_at = NOW()`);
      const updateSql = `UPDATE terminal_configurations SET ${fields.join(', ')} WHERE location_id = $${fields.length + 1} RETURNING *`;
      const result: any = await (this.storage as any).db.execute({ text: updateSql, args: [...values, locationId] } as any);
      const rows = result?.rows || result || [];
      return rows[0];
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
      const deactivateSql = sql`UPDATE terminal_configurations SET is_active = false, updated_at = NOW() WHERE location_id = ${locationId}` as any;
      await (this.storage as any).db.execute(deactivateSql);

      return true;
    } catch (error: any) {
      console.error('❌ Error deactivating terminal configuration:', error);
      throw error;
    }
  }
}
