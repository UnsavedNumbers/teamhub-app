#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

const result = spawnSync('npx', ['tsx', 'src/preflight/index.ts'], {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
})

if (typeof result.status === 'number') {
  process.exit(result.status)
}

process.exit(1)
