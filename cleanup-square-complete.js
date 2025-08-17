#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routesFile = path.join(__dirname, 'server', 'routes.ts');
let content = fs.readFileSync(routesFile, 'utf8');

console.log('🧹 Complete Square code cleanup...');

// Remove all Square-related code blocks completely
const patterns = [
  // Remove Square payment routes
  /\/\/ Square payment routes for appointment checkout and POS[\s\S]*?app\.post\("\/api\/create-payment"[\s\S]*?}\);[\s]*/g,
  
  // Remove Square Terminal routes
  /\/\/ Square Terminal integration for in-person payments[\s\S]*?app\.post\("\/api\/square-terminal\/payment"[\s\S]*?}\);[\s]*/g,
  
  // Remove Square Terminal status route
  /\/\/ Get Square Terminal status[\s\S]*?app\.get\("\/api\/square-terminal\/status"[\s\S]*?}\);[\s]*/g,
  
  // Remove Square Terminal checkout route
  /\/\/ Create Square Terminal checkout session[\s\S]*?app\.post\("\/api\/square-terminal\/checkout"[\s\S]*?}\);[\s]*/g,
  
  // Remove Square connection test route
  /\/\/ Test Square connection[\s\S]*?app\.get\("\/api\/test-square-connection"[\s\S]*?}\);[\s]*/g,
  
  // Remove any remaining broken Square code fragments
  /appointmentId: appointmentId \|\| null[\s]*}\);[\s]*console\.log\('Terminal payment record saved to database:'[\s\S]*?}\);[\s]*/g,
  
  // Remove broken checkout code
  /\/\/ Create checkout session for Square Terminal[\s\S]*?app\.post\("\/api\/square-terminal\/checkout"[\s\S]*?}\);[\s]*/g,
  
  // Remove any remaining Square API calls
  /fetch\('https:\/\/connect\.squareup\.com\/v2\/[\s\S]*?\);[\s]*/g,
  
  // Remove Square environment variables
  /process\.env\.SQUARE_[A-Z_]+/g,
  
  // Remove Square version headers
  /'Square-Version': '[^']*'/g,
  
  // Remove Square authorization headers
  /'Authorization': `Bearer \$\{null\}`/g,
  
  // Remove any remaining squarePaymentId references
  /squarePaymentId: [^,}]+/g,
  
  // Remove any remaining Square error handling
  /console\.error\('Square[^']*'/g,
  
  // Remove any remaining Square console logs
  /console\.log\('Square[^']*'/g,
  
  // Clean up any double newlines
  /\n\s*\n\s*\n/g,
  
  // Clean up any orphaned brackets
  /^\s*}\s*$/gm
];

patterns.forEach((pattern, index) => {
  const beforeLength = content.length;
  content = content.replace(pattern, '');
  const afterLength = content.length;
  if (beforeLength !== afterLength) {
    console.log(`✅ Pattern ${index + 1} removed ${beforeLength - afterLength} characters`);
  }
});

// Final cleanup - remove any remaining broken syntax
content = content.replace(/\n\s*}\s*\n\s*}/g, '\n}');
content = content.replace(/\n\s*}\s*\n\s*}/g, '\n}');

console.log('✅ Complete Square cleanup finished!');

// Write the cleaned content back
fs.writeFileSync(routesFile, content, 'utf8');
console.log('📝 File updated:', routesFile);
