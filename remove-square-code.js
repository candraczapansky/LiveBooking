#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routesFile = path.join(__dirname, 'server', 'routes.ts');
let content = fs.readFileSync(routesFile, 'utf8');

console.log('🧹 Removing all Square-related code...');

// Remove Square import
content = content.replace(/import \{ SquareClient, SquareEnvironment \} from "square";\s*\n/, '');

// Remove Square client initialization
content = content.replace(/\/\/ Initialize Square[\s\S]*?\/\/ Square API clients will be accessed directly from squareClient\s*\n/, '');

// Remove squareClient parameter from registerPaymentRoutes
content = content.replace(/registerPaymentRoutes\(app, storage, squareClient\);/, 'registerPaymentRoutes(app, storage);');

// Remove all Square payment routes
content = content.replace(/\/\/ Square payment routes for appointment checkout and POS[\s\S]*?app\.post\("\/api\/create-payment"[\s\S]*?}\);/, '');

// Remove Square Terminal routes
content = content.replace(/\/\/ Square Terminal integration for in-person payments[\s\S]*?app\.post\("\/api\/square-terminal\/payment"[\s\S]*?}\);/, '');

// Remove Square Terminal status route
content = content.replace(/\/\/ Get Square Terminal status[\s\S]*?app\.get\("\/api\/square-terminal\/status"[\s\S]*?}\);/, '');

// Remove Square Terminal checkout route
content = content.replace(/\/\/ Create Square Terminal checkout session[\s\S]*?app\.post\("\/api\/square-terminal\/checkout"[\s\S]*?}\);/, '');

// Remove Square connection test route
content = content.replace(/\/\/ Test Square connection[\s\S]*?app\.get\("\/api\/test-square-connection"[\s\S]*?}\);/, '');

// Remove any remaining Square references
content = content.replace(/squareAccessToken/g, 'null');
content = content.replace(/process\.env\.SQUARE_LOCATION_ID/g, 'null');
content = content.replace(/process\.env\.SQUARE_APPLICATION_ID/g, 'null');

console.log('✅ Square code removed successfully!');

// Write the cleaned content back
fs.writeFileSync(routesFile, content, 'utf8');
console.log('📝 File updated:', routesFile);
