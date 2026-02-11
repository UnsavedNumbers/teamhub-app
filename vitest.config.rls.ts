/**
 * Vitest configuration for RLS Contract Tests
 *
 * Separate from the main vite.config.ts to:
 * 1. Not require jsdom (these are API-level tests, no DOM)
 * 2. Point to the RLS-specific setup file
 * 3. Only include contract spec files
 * 4. Use longer timeouts (remote DB + auth)
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./tests/rls-contract/setup.ts'],
        include: ['tests/rls-contract/specs/**/*.contract.spec.ts'],
        testTimeout: 30_000,   // individual test needs time for network calls
        hookTimeout: 120_000,  // beforeAll seed can take a while
        sequence: {
            // Run spec files sequentially to share seeded state
            concurrent: false,
        },
        // env file for test secrets
        env: {},
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: true, // Share state across spec files
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
