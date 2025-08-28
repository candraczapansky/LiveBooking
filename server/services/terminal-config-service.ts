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

      // Store in database with upsert to allow re-initialization
      let terminalConfig;
      try {
        const dbClient: any = (this.storage as any).db ?? (await import('../db.js')).db;
        const upsertSql = sql`INSERT INTO terminal_configurations (
            terminal_id, location_id, api_token, device_code, is_active, created_at, updated_at
          ) VALUES (
            ${config.terminalId}, ${config.locationId}, ${encryptedToken}, ${config.deviceCode}, true, NOW(), NOW()
          )
          ON CONFLICT (location_id, terminal_id)
          DO UPDATE SET
            api_token = EXCLUDED.api_token,
            device_code = EXCLUDED.device_code,
            is_active = true,
            updated_at = NOW()
          RETURNING *` as any;
        const result: any = await dbClient.execute(upsertSql);
        terminalConfig = result?.rows || result;
      } catch (e: any) {
        // Auto-create table on first use if missing
        const message = String(e?.message || e);
        if (message.includes('relation') && message.includes('terminal_configurations')) {
          console.warn('⚠️ terminal_configurations not found. Creating it now...');
          const dbClient: any = (this.storage as any).db ?? (await import('../db.js')).db;
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
          await dbClient.execute(createSql as any);
          // Retry insert
          const retryUpsert = sql`INSERT INTO terminal_configurations (
              terminal_id, location_id, api_token, device_code, is_active, created_at, updated_at
            ) VALUES (
              ${config.terminalId}, ${config.locationId}, ${encryptedToken}, ${config.deviceCode}, true, NOW(), NOW()
            )
            ON CONFLICT (location_id, terminal_id)
            DO UPDATE SET
              api_token = EXCLUDED.api_token,
              device_code = EXCLUDED.device_code,
              is_active = true,
              updated_at = NOW()
            RETURNING *` as any;
          const retryResult: any = await dbClient.execute(retryUpsert);
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
      const dbClient: any = (this.storage as any).db ?? (await import('../db.js')).db;
      const sel = sql`SELECT * FROM terminal_configurations WHERE location_id = ${locationId} AND is_active = true LIMIT 1` as any;
      const res: any = await dbClient.execute(sel);
      const config = res?.rows || res || [];

      if (!config.length) {
        return null;
      }

      // Decrypt and map to expected camelCase fields
      const row: any = config[0];
      const decryptedToken = await decrypt(row.api_token);

      return {
        terminalId: String(row.terminal_id ?? row.terminalId ?? ''),
        deviceCode: String(row.device_code ?? row.deviceCode ?? ''),
        locationId: String(row.location_id ?? row.locationId ?? ''),
        apiToken: decryptedToken,
      } as any;
    } catch (error: any) {
      const message = String(error?.message || error);
      if (message.includes('relation') && message.includes('terminal_configurations')) {
        // Auto-create table if it doesn't exist, then return null (no config yet)
        try {
          console.warn('⚠️ terminal_configurations not found during read. Creating it now...');
          const dbClient: any = (this.storage as any).db ?? (await import('../db.js')).db;
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
          await dbClient.execute(createSql as any);
          return null;
        } catch (createErr) {
          console.error('❌ Failed to auto-create terminal_configurations table:', createErr);
        }
      }
      console.error('❌ Error getting terminal configuration:', error);
      throw error;
    }
  }

  /**
   * Fallback: get any active terminal configuration when locationId is missing
   */
  async getAnyActiveTerminalConfig(): Promise<TerminalConfig | null> {
    try {
      const dbClient: any = (this.storage as any).db ?? (await import('../db.js')).db;
      const sel = sql`SELECT * FROM terminal_configurations WHERE is_active = true ORDER BY updated_at DESC LIMIT 1` as any;
      const res: any = await dbClient.execute(sel);
      const config = res?.rows || res || [];
      if (!config.length) return null;
      const row: any = config[0];
      const decryptedToken = await decrypt(row.api_token);
      return {
        terminalId: String(row.terminal_id ?? row.terminalId ?? ''),
        deviceCode: String(row.device_code ?? row.deviceCode ?? ''),
        locationId: String(row.location_id ?? row.locationId ?? ''),
        apiToken: decryptedToken,
      } as any;
    } catch (error: any) {
      console.error('❌ Error getting fallback terminal configuration:', error);
      return null;
    }
  }

  /**
   * Get terminal configuration by device code
   */
  async getTerminalConfigByDeviceCode(deviceCode: string): Promise<TerminalConfig | null> {
    try {
      const dbClient: any = (this.storage as any).db ?? (await import('../db.js')).db;
      const sel = sql`SELECT * FROM terminal_configurations WHERE device_code = ${deviceCode} AND is_active = true LIMIT 1` as any;
      const res: any = await dbClient.execute(sel);
      const config = res?.rows || res || [];

      if (!config.length) {
        return null;
      }

      // Decrypt and map to expected camelCase fields
      const row: any = config[0];
      const decryptedToken = await decrypt(row.api_token);

      return {
        terminalId: String(row.terminal_id ?? row.terminalId ?? ''),
        deviceCode: String(row.device_code ?? row.deviceCode ?? ''),
        locationId: String(row.location_id ?? row.locationId ?? ''),
        apiToken: decryptedToken,
      } as TerminalConfig;
    } catch (error: any) {
      const message = String(error?.message || error);
      if (message.includes('relation') && message.includes('terminal_configurations')) {
        // Auto-create table if it doesn't exist, then return null (no config yet)
        try {
          console.warn('⚠️ terminal_configurations not found during read by device code. Creating it now...');
          const dbClient: any = (this.storage as any).db ?? (await import('../db.js')).db;
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
          await dbClient.execute(createSql as any);
          return null;
        } catch (createErr) {
          console.error('❌ Failed to auto-create terminal_configurations table:', createErr);
        }
      }
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
      const dbClient: any = (this.storage as any).db ?? (await import('../db.js')).db;
      const fields: string[] = [];
      const values: any[] = [];
      if (updates.terminalId) { fields.push(`terminal_id = $${fields.length + 1}`); values.push(updates.terminalId); }
      if (updates.deviceCode) { fields.push(`device_code = $${fields.length + 1}`); values.push(updates.deviceCode); }
      if (updates.apiToken) { fields.push(`api_token = $${fields.length + 1}`); values.push(updates.apiToken); }
      if (typeof updates.isActive === 'boolean') { fields.push(`is_active = $${fields.length + 1}`); values.push(updates.isActive); }
      fields.push(`updated_at = NOW()`);
      const updateSql = `UPDATE terminal_configurations SET ${fields.join(', ')} WHERE location_id = $${fields.length + 1} RETURNING *`;
      const result: any = await dbClient.execute({ text: updateSql, args: [...values, locationId] } as any);
      const rows = result?.rows || result || [];
      const row: any = rows[0];
      if (!row) return row;
      // Map to camelCase if present
      return {
        terminalId: String(row.terminal_id ?? row.terminalId ?? ''),
        deviceCode: String(row.device_code ?? row.deviceCode ?? ''),
        locationId: String(row.location_id ?? row.locationId ?? ''),
        apiToken: String(row.api_token ?? row.apiToken ?? ''),
        isActive: Boolean(row.is_active ?? row.isActive ?? true),
      } as any;
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
      const dbClient: any = (this.storage as any).db ?? (await import('../db.js')).db;
      const deactivateSql = sql`UPDATE terminal_configurations SET is_active = false, updated_at = NOW() WHERE location_id = ${locationId}` as any;
      await dbClient.execute(deactivateSql);

      return true;
    } catch (error: any) {
      console.error('❌ Error deactivating terminal configuration:', error);
      throw error;
    }
  }
}
