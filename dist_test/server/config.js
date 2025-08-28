// Configuration file for environment variables and database
export const config = {
    // OpenAI Configuration
    openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '500'),
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    },
    // SendGrid Configuration
    sendgrid: {
        apiKey: process.env.SENDGRID_API_KEY || '',
        fromEmail: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
    },
    // Helcim Configuration
    helcim: {
        apiToken: process.env.HELCIM_API_TOKEN || '',
        apiUrl: process.env.HELCIM_API_URL || 'https://api.helcim.com/v2',
        terminalDeviceCode: process.env.HELCIM_TERMINAL_DEVICE_CODE || 'xog5',
    },
    // Database Configuration
    database: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/salon_management',
    },
    // Server Configuration
    server: {
        port: parseInt(process.env.PORT || '5000'),
        nodeEnv: process.env.NODE_ENV || 'development',
    }
};
// Database-backed configuration
export class DatabaseConfig {
    constructor(storage) {
        this.cache = new Map();
        this.cacheExpiry = new Map();
        this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
        this.storage = storage;
    }
    isCacheValid(key) {
        const expiry = this.cacheExpiry.get(key);
        return expiry ? Date.now() < expiry : false;
    }
    setCache(key, value) {
        this.cache.set(key, value);
        this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
    }
    clearCache(key) {
        if (key) {
            this.cache.delete(key);
            this.cacheExpiry.delete(key);
        }
        else {
            this.cache.clear();
            this.cacheExpiry.clear();
        }
    }
    async getConfig(key) {
        // Check cache first
        if (this.isCacheValid(key)) {
            return this.cache.get(key);
        }
        try {
            const config = await this.storage.getSystemConfig(key);
            if (config && config.isActive) {
                this.setCache(key, config.value);
                return config.value;
            }
            return null;
        }
        catch (error) {
            console.error(`Error getting config for key ${key}:`, error);
            return null;
        }
    }
    async setConfig(key, value, description, category = 'general', isEncrypted = false) {
        try {
            const existingConfig = await this.storage.getSystemConfig(key);
            if (existingConfig) {
                await this.storage.updateSystemConfig(key, value, description);
            }
            else {
                await this.storage.setSystemConfig({
                    key,
                    value,
                    description,
                    category,
                    isEncrypted,
                    isActive: true
                });
            }
            // Clear cache for this key
            this.clearCache(key);
        }
        catch (error) {
            console.error(`Error setting config for key ${key}:`, error);
            throw error;
        }
    }
    async getConfigByCategory(category) {
        try {
            const configs = await this.storage.getSystemConfigByCategory(category);
            const result = {};
            for (const config of configs) {
                if (config.isActive) {
                    result[config.key] = config.value;
                }
            }
            return result;
        }
        catch (error) {
            console.error(`Error getting configs for category ${category}:`, error);
            return {};
        }
    }
    async deleteConfig(key) {
        try {
            const result = await this.storage.deleteSystemConfig(key);
            this.clearCache(key);
            return result;
        }
        catch (error) {
            console.error(`Error deleting config for key ${key}:`, error);
            return false;
        }
    }
    // Convenience methods for common configs
    async getOpenAIKey() {
        // Force clear cache for OpenAI key to ensure fresh data
        this.clearCache('openai_api_key');
        return this.getConfig('openai_api_key');
    }
    async setOpenAIKey(apiKey) {
        await this.setConfig('openai_api_key', apiKey, 'OpenAI API Key for AI services', 'ai', true);
    }
    async getSendGridKey() {
        return this.getConfig('sendgrid_api_key');
    }
    async setSendGridKey(apiKey) {
        await this.setConfig('sendgrid_api_key', apiKey, 'SendGrid API Key for email services', 'email', true);
    }
    async getSendGridFromEmail() {
        return this.getConfig('sendgrid_from_email');
    }
    async setSendGridFromEmail(email) {
        await this.setConfig('sendgrid_from_email', email, 'SendGrid verified sender email', 'email');
    }
}
// Helper function to validate required configuration
export async function validateConfig(dbConfig) {
    const errors = [];
    if (dbConfig) {
        const openaiKey = await dbConfig.getOpenAIKey();
        const sendgridKey = await dbConfig.getSendGridKey();
        if (!openaiKey) {
            errors.push('OpenAI API key is not configured');
        }
        if (!sendgridKey) {
            errors.push('SendGrid API key is not configured');
        }
    }
    else {
        // Fallback to environment variables
        if (!config.openai.apiKey) {
            errors.push('OPENAI_API_KEY is not configured');
        }
        if (!config.sendgrid.apiKey) {
            errors.push('SENDGRID_API_KEY is not configured');
        }
    }
    return {
        isValid: errors.length === 0,
        errors
    };
}
// Helper function to get configuration status
export async function getConfigStatus(dbConfig) {
    if (dbConfig) {
        const openaiKey = await dbConfig.getOpenAIKey();
        const sendgridKey = await dbConfig.getSendGridKey();
        const sendgridEmail = await dbConfig.getSendGridFromEmail();
        return {
            openai: {
                configured: !!openaiKey,
                model: config.openai.model,
            },
            sendgrid: {
                configured: !!sendgridKey,
                fromEmail: sendgridEmail || config.sendgrid.fromEmail,
            },
            database: {
                configured: !!config.database.url,
            }
        };
    }
    else {
        // Fallback to environment variables
        return {
            openai: {
                configured: !!config.openai.apiKey,
                model: config.openai.model,
            },
            sendgrid: {
                configured: !!config.sendgrid.apiKey,
                fromEmail: config.sendgrid.fromEmail,
            },
            database: {
                configured: !!config.database.url,
            }
        };
    }
}
