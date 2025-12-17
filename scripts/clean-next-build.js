#!/usr/bin/env node

/**
 * Clean Next.js build directory
 * This script safely removes the .next folder to fix file locking issues on Windows
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextDir = path.join(process.cwd(), '.next');

console.log('🧹 Cleaning Next.js build directory...');

if (fs.existsSync(nextDir)) {
  try {
    // Use rimraf-style recursive deletion for Windows compatibility
    function deleteRecursive(dirPath) {
      if (fs.existsSync(dirPath)) {
        fs.readdirSync(dirPath).forEach((file) => {
          const curPath = path.join(dirPath, file);
          if (fs.lstatSync(curPath).isDirectory()) {
            deleteRecursive(curPath);
          } else {
            try {
              fs.unlinkSync(curPath);
            } catch (err) {
              // File might be locked, try again after a short delay
              setTimeout(() => {
                try {
                  fs.unlinkSync(curPath);
                } catch (e) {
                  console.warn(`⚠️  Could not delete ${curPath}, you may need to close the dev server first`);
                }
              }, 100);
            }
          }
        });
        try {
          fs.rmdirSync(dirPath);
        } catch (err) {
          console.warn(`⚠️  Could not remove directory ${dirPath}, you may need to close the dev server first`);
        }
      }
    }

    deleteRecursive(nextDir);
    console.log('✅ Successfully cleaned .next directory');
    console.log('💡 You can now restart your dev server with: npm run dev:full');
  } catch (error) {
    console.error('❌ Error cleaning .next directory:', error.message);
    console.log('\n💡 Manual steps:');
    console.log('   1. Stop the dev server (Ctrl+C)');
    console.log('   2. Manually delete the .next folder');
    console.log('   3. Restart with: npm run dev:full');
    process.exit(1);
  }
} else {
  console.log('ℹ️  .next directory does not exist, nothing to clean');
}

