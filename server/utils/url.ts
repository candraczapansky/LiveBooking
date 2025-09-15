/**
 * URL utilities for generating public-facing URLs
 */

/**
 * Get the public base URL for the application
 * Priority order:
 * 1. CUSTOM_DOMAIN environment variable
 * 2. VITE_API_BASE_URL environment variable  
 * 3. Replit domain (REPLIT_DOMAINS) - always use HTTPS
 * 4. Default: https://www.glofloapp.com
 */
export function getPublicBaseUrl(): string {
  // Check for custom domain first
  const customDomain = process.env.CUSTOM_DOMAIN;
  if (customDomain) {
    return customDomain.startsWith('http') ? customDomain : `https://${customDomain}`;
  }

  // Check for Vite API base URL
  const viteApiBaseUrl = process.env.VITE_API_BASE_URL;
  if (viteApiBaseUrl) {
    return viteApiBaseUrl.startsWith('http') ? viteApiBaseUrl : `https://${viteApiBaseUrl}`;
  }

  // Check for Replit domain - this should always be used when available
  const replitDomain = process.env.REPLIT_DOMAINS;
  if (replitDomain) {
    return replitDomain.startsWith('https://') ? replitDomain : `https://${replitDomain}`;
  }

  // Default to glofloapp.com with HTTPS in production
  // If no environment variables are set, use the production domain
  return 'https://glofloapp.com';
}

/**
 * Generate a public URL for a form
 * @param formId - The form ID
 * @param clientId - Optional client ID to include in the URL
 * @returns The complete public URL for the form
 */
export function getFormPublicUrl(formId: number | string, clientId?: number | string): string {
  const baseUrl = getPublicBaseUrl();
  const formUrl = clientId 
    ? `${baseUrl}/forms/${formId}?clientId=${clientId}` 
    : `${baseUrl}/forms/${formId}`;
  
  return formUrl;
}

/**
 * Generate a public URL for any path
 * @param path - The path (without leading slash)
 * @returns The complete public URL
 */
export function getPublicUrl(path: string): string {
  const baseUrl = getPublicBaseUrl();
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${baseUrl}/${cleanPath}`;
}

/**
 * Debug function to log current URL configuration
 */
export function debugUrlConfig(): void {
  console.log('[URL DEBUG] Environment variables:');
  console.log(`  CUSTOM_DOMAIN: ${process.env.CUSTOM_DOMAIN || 'not set'}`);
  console.log(`  VITE_API_BASE_URL: ${process.env.VITE_API_BASE_URL || 'not set'}`);
  console.log(`  REPLIT_DOMAINS: ${process.env.REPLIT_DOMAINS || 'not set'}`);
  console.log(`  REPL_ID: ${process.env.REPL_ID || 'not set'}`);
  console.log(`  REPL_OWNER: ${process.env.REPL_OWNER || 'not set'}`);
  console.log(`  REPL_SLUG: ${process.env.REPL_SLUG || 'not set'}`);
  console.log(`[URL DEBUG] Generated base URL: ${getPublicBaseUrl()}`);
} 