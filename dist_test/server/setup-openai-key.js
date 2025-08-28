import { DatabaseStorage } from "./storage.js";
import { DatabaseConfig } from "./config.js";
async function setupOpenAIKey() {
    try {
        console.log('Setting up OpenAI API key...');
        // Initialize storage
        const storage = new DatabaseStorage();
        // Initialize database config
        const dbConfig = new DatabaseConfig(storage);
        // Set the OpenAI API key
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.error('OPENAI_API_KEY environment variable is not set');
            process.exit(1);
        }
        await dbConfig.setOpenAIKey(apiKey);
        console.log('✅ OpenAI API key has been configured successfully!');
        // Verify the configuration
        const configuredKey = await dbConfig.getOpenAIKey();
        if (configuredKey) {
            console.log('✅ Configuration verified - API key is stored in database');
        }
        else {
            console.error('❌ Configuration verification failed');
            process.exit(1);
        }
        process.exit(0);
    }
    catch (error) {
        console.error('Error setting up OpenAI API key:', error);
        process.exit(1);
    }
}
// Run the setup
setupOpenAIKey();
