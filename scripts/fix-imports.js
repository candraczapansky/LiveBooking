#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative, sep } from 'path';
import { fileURLToPath } from 'url';

console.log('🔧 Fixing ES module import paths for deployment...');

// Get all JavaScript files recursively
function getJsFiles(dir) {
  const files = [];
  try {
    const items = readdirSync(dir);
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        files.push(...getJsFiles(fullPath));
      } else if (item.endsWith('.js')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Directory doesn't exist, skip
  }
  return files;
}

// Find all JavaScript files in the dist/server directory
const jsFiles = getJsFiles('dist/server');

let filesFixed = 0;
let totalReplacements = 0;

for (const filePath of jsFiles) {
  try {
    const content = readFileSync(filePath, 'utf8');
    let updatedContent = content;
    let replacements = 0;

    // Fix @shared imports to use relative paths
    // Calculate relative path from current file to shared directory
    const currentDir = dirname(filePath);
    const sharedPath = join('dist', 'shared');
    let relativePath = relative(currentDir, sharedPath);
    
    // Normalize path separators and ensure proper format for imports
    relativePath = relativePath.replace(/\\/g, '/');
    if (relativePath && !relativePath.startsWith('.')) {
      relativePath = './' + relativePath;
    }
    if (!relativePath) {
      relativePath = './shared';
    }
    
    // Replace @shared/schema.js with correct relative path
    const regex = /from\s+["']@shared\/([^"']+)["']/g;
    updatedContent = updatedContent.replace(regex, (match, module) => {
      replacements++;
      const relativeImport = `${relativePath}/${module}`;
      return `from "${relativeImport}"`;
    });

    // Also handle import statements at the beginning of lines
    const importRegex = /import\s+([^"']*?)\s+from\s+["']@shared\/([^"']+)["']/g;
    updatedContent = updatedContent.replace(importRegex, (match, imports, module) => {
      replacements++;
      const relativeImport = `${relativePath}/${module}`;
      return `import ${imports} from "${relativeImport}"`;
    });

    // Handle dynamic imports (await import())
    const dynamicImportRegex = /import\(\s*["']@shared\/([^"']+)["']\s*\)/g;
    updatedContent = updatedContent.replace(dynamicImportRegex, (match, module) => {
      replacements++;
      const relativeImport = `${relativePath}/${module}`;
      return `import("${relativeImport}")`;
    });

    if (replacements > 0) {
      writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`✅ Fixed ${replacements} imports in ${filePath}`);
      filesFixed++;
      totalReplacements += replacements;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

console.log(`\n🎉 Import fix complete!`);
console.log(`   Files processed: ${jsFiles.length}`);
console.log(`   Files fixed: ${filesFixed}`);
console.log(`   Total replacements: ${totalReplacements}`);