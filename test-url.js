// Test script to verify URL generation
import { getPublicBaseUrl, getFormPublicUrl, getPublicUrl } from './dist_ts/server/utils/url.js';

// Set environment variables for testing
process.env.CUSTOM_DOMAIN = 'https://www.glofloapp.com';

console.log('Testing URL Generation with CUSTOM_DOMAIN set:');
console.log('================================');
console.log('Base URL:', getPublicBaseUrl());
console.log('Form URL (ID: 123):', getFormPublicUrl(123));
console.log('Form URL with Client (ID: 123, Client: 456):', getFormPublicUrl(123, 456));
console.log('Public URL (path: "review/789"):', getPublicUrl('review/789'));
console.log('================================\n');

// Test without CUSTOM_DOMAIN
delete process.env.CUSTOM_DOMAIN;
delete process.env.VITE_API_BASE_URL;
delete process.env.REPLIT_DOMAINS;

console.log('Testing URL Generation with no environment variables (fallback):');
console.log('================================');
console.log('Base URL:', getPublicBaseUrl());
console.log('Form URL (ID: 123):', getFormPublicUrl(123));
console.log('Form URL with Client (ID: 123, Client: 456):', getFormPublicUrl(123, 456));
console.log('================================');









