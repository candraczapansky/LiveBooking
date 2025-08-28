import { z } from 'zod';
import { sql } from 'drizzle-orm';
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
export class TerminalConfigService {
    constructor(storage) {
        this.storage = storage;
    }
    /**
     * Save terminal configuration with encrypted API token
     */
    async saveTerminalConfig(config) {
        try {
            // Validate config
            TerminalConfigSchema.parse(config);
            // Encrypt the API token before storing
            const encryptedToken = await encrypt(config.apiToken);
            // Store in database with upsert to allow re-initialization
            let terminalConfig;
            try {
                const dbClient = this.storage.db ?? (await import('../db.js')).db;
                const upsertSql = sql `INSERT INTO terminal_configurations (
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
          RETURNING *`;
                const result = await dbClient.execute(upsertSql);
                terminalConfig = result?.rows || result;
            }
            catch (e) {
                // Auto-create table on first use if missing
                const message = String(e?.message || e);
                if (message.includes('relation') && message.includes('terminal_configurations')) {
                    console.warn('⚠️ terminal_configurations not found. Creating it now...');
                    const dbClient = this.storage.db ?? (await import('../db.js')).db;
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
                    await dbClient.execute(createSql);
                    // Retry insert
                    const retryUpsert = sql `INSERT INTO terminal_configurations (
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
            RETURNING *`;
                    const retryResult = await dbClient.execute(retryUpsert);
                    terminalConfig = retryResult?.rows || retryResult;
                }
                else {
                    throw e;
                }
            }
            return terminalConfig[0];
        }
        catch (error) {
            console.error('❌ Error saving terminal configuration:', error);
            throw error;
        }
    }
    /**
     * Get terminal configuration by location ID
     */
    async getTerminalConfig(locationId) {
        try {
            const dbClient = this.storage.db ?? (await import('../db.js')).db;
            const sel = sql `SELECT * FROM terminal_configurations WHERE location_id = ${locationId} AND is_active = true LIMIT 1`;
            const res = await dbClient.execute(sel);
            const config = res?.rows || res || [];
            if (!config.length) {
                return null;
            }
            // Decrypt and map to expected camelCase fields
            const row = config[0];
            const decryptedToken = await decrypt(row.api_token);
            return {
                terminalId: String(row.terminal_id ?? row.terminalId ?? ''),
                deviceCode: String(row.device_code ?? row.deviceCode ?? ''),
                locationId: String(row.location_id ?? row.locationId ?? ''),
                apiToken: decryptedToken,
            };
        }
        catch (error) {
            const message = String(error?.message || error);
            if (message.includes('relation') && message.includes('terminal_configurations')) {
                // Auto-create table if it doesn't exist, then return null (no config yet)
                try {
                    console.warn('⚠️ terminal_configurations not found during read. Creating it now...');
                    const dbClient = this.storage.db ?? (await import('../db.js')).db;
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
                    await dbClient.execute(createSql);
                    return null;
                }
                catch (createErr) {
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
    async getAnyActiveTerminalConfig() {
        try {
            const dbClient = this.storage.db ?? (await import('../db.js')).db;
            const sel = sql `SELECT * FROM terminal_configurations WHERE is_active = true ORDER BY updated_at DESC LIMIT 1`;
            const res = await dbClient.execute(sel);
            const config = res?.rows || res || [];
            if (!config.length)
                return null;
            const row = config[0];
            const decryptedToken = await decrypt(row.api_token);
            return {
                terminalId: String(row.terminal_id ?? row.terminalId ?? ''),
                deviceCode: String(row.device_code ?? row.deviceCode ?? ''),
                locationId: String(row.location_id ?? row.locationId ?? ''),
                apiToken: decryptedToken,
            };
        }
        catch (error) {
            console.error('❌ Error getting fallback terminal configuration:', error);
            return null;
        }
    }
    /**
     * Get terminal configuration by device code
     */
    async getTerminalConfigByDeviceCode(deviceCode) {
        try {
            const dbClient = this.storage.db ?? (await import('../db.js')).db;
            const sel = sql `SELECT * FROM terminal_configurations WHERE device_code = ${deviceCode} AND is_active = true LIMIT 1`;
            const res = await dbClient.execute(sel);
            const config = res?.rows || res || [];
            if (!config.length) {
                return null;
            }
            // Decrypt and map to expected camelCase fields
            const row = config[0];
            const decryptedToken = await decrypt(row.api_token);
            return {
                terminalId: String(row.terminal_id ?? row.terminalId ?? ''),
                deviceCode: String(row.device_code ?? row.deviceCode ?? ''),
                locationId: String(row.location_id ?? row.locationId ?? ''),
                apiToken: decryptedToken,
            };
        }
        catch (error) {
            const message = String(error?.message || error);
            if (message.includes('relation') && message.includes('terminal_configurations')) {
                // Auto-create table if it doesn't exist, then return null (no config yet)
                try {
                    console.warn('⚠️ terminal_configurations not found during read by device code. Creating it now...');
                    const dbClient = this.storage.db ?? (await import('../db.js')).db;
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
                    await dbClient.execute(createSql);
                    return null;
                }
                catch (createErr) {
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
    async updateTerminalConfig(locationId, updates) {
        try {
            // If updating API token, encrypt it
            if (updates.apiToken) {
                updates.apiToken = await encrypt(updates.apiToken);
            }
            // Build dynamic update SQL
            const dbClient = this.storage.db ?? (await import('../db.js')).db;
            const fields = [];
            const values = [];
            if (updates.terminalId) {
                fields.push(`terminal_id = $${fields.length + 1}`);
                values.push(updates.terminalId);
            }
            if (updates.deviceCode) {
                fields.push(`device_code = $${fields.length + 1}`);
                values.push(updates.deviceCode);
            }
            if (updates.apiToken) {
                fields.push(`api_token = $${fields.length + 1}`);
                values.push(updates.apiToken);
            }
            if (typeof updates.isActive === 'boolean') {
                fields.push(`is_active = $${fields.length + 1}`);
                values.push(updates.isActive);
            }
            fields.push(`updated_at = NOW()`);
            const updateSql = `UPDATE terminal_configurations SET ${fields.join(', ')} WHERE location_id = $${fields.length + 1} RETURNING *`;
            const result = await dbClient.execute({ text: updateSql, args: [...values, locationId] });
            const rows = result?.rows || result || [];
            const row = rows[0];
            if (!row)
                return row;
            // Map to camelCase if present
            return {
                terminalId: String(row.terminal_id ?? row.terminalId ?? ''),
                deviceCode: String(row.device_code ?? row.deviceCode ?? ''),
                locationId: String(row.location_id ?? row.locationId ?? ''),
                apiToken: String(row.api_token ?? row.apiToken ?? ''),
                isActive: Boolean(row.is_active ?? row.isActive ?? true),
            };
        }
        catch (error) {
            console.error('❌ Error updating terminal configuration:', error);
            throw error;
        }
    }
    /**
     * Deactivate terminal configuration
     */
    async deactivateTerminalConfig(locationId) {
        try {
            const dbClient = this.storage.db ?? (await import('../db.js')).db;
            const deactivateSql = sql `UPDATE terminal_configurations SET is_active = false, updated_at = NOW() WHERE location_id = ${locationId}`;
            await dbClient.execute(deactivateSql);
            return true;
        }
        catch (error) {
            console.error('❌ Error deactivating terminal configuration:', error);
            throw error;
        }
    }
}
