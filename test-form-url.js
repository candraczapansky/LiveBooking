/**
 * Test script to check form URL generation
 */
import { getFormPublicUrl, debugUrlConfig } from './dist/server/utils/url.js';

// Set environment variables to test
process.env.CUSTOM_DOMAIN = 'https://www.glofloapp.com';
process.env.VITE_API_BASE_URL = 'https://www.glofloapp.com';

// Display environment variables and generated URLs
console.log('\n===== Form URL Test =====');
debugUrlConfig();
console.log('\n');
console.log('Test URL for form ID 123:');
console.log(getFormPublicUrl(123));
console.log('\n');
console.log('Test URL for form ID 123 with client ID 456:');
console.log(getFormPublicUrl(123, 456));
console.log('\n===== End Test =====\n');









