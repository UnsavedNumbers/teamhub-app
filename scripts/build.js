#!/usr/bin/env node
/**
 * Build script that detects the branch and runs the appropriate build command
 * 
 * Cloudflare Pages sets CF_PAGES_BRANCH during builds.
 * GitHub Actions sets GITHUB_REF_NAME or GITHUB_HEAD_REF.
 * For local builds, defaults to production mode.
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Detect branch from environment variables
const branch = 
  process.env.CF_PAGES_BRANCH ||           // Cloudflare Pages
  process.env.GITHUB_REF_NAME ||           // GitHub Actions (push events)
  process.env.GITHUB_HEAD_REF ||           // GitHub Actions (PR events)
  null;

console.log(`[build] Detected branch: ${branch || 'unknown (defaulting to prod)'}`);

// Determine build mode based on branch
let buildMode = 'prod';
let buildCommand = 'build:prod';

if (branch === 'demo') {
  buildMode = 'demo';
  buildCommand = 'build:demo';
  console.log('[build] Using demo mode build');
} else {
  console.log('[build] Using production mode build');
}

// Run TypeScript type checking
console.log('[build] Running TypeScript type check...');
try {
  execSync('tsc --noEmit --skipLibCheck', {
    cwd: projectRoot,
    stdio: 'inherit',
  });
  console.log('[build] ✓ TypeScript type check passed');
} catch (error) {
  console.error('[build] ✗ TypeScript type check failed');
  process.exit(1);
}

// Run Vite build with the appropriate mode
console.log(`[build] Running Vite build in ${buildMode} mode...`);
try {
  execSync(`vite build --mode ${buildMode}`, {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      // Ensure Vite uses the correct mode
      NODE_ENV: buildMode === 'prod' ? 'production' : 'development',
    },
  });
  console.log(`[build] ✓ Build completed successfully in ${buildMode} mode`);
} catch (error) {
  console.error(`[build] ✗ Build failed in ${buildMode} mode`);
  process.exit(1);
}
