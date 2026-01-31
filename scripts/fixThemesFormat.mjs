import { readFileSync, writeFileSync } from 'fs';

const input = readFileSync('src/config/themes.expanded.ts', 'utf8');

// Add commas after property values, but not before closing braces/brackets
const fixed = input
  // Add comma after string values
  .replace(/('[^']*'|"[^"]*"|#[0-9A-Fa-f]{3,6})(\s*\n)/g, '$1,$2')
  // Add comma after closing braces that are followed by a property name
  .replace(/}(\s+)([a-z_][a-z0-9_]*:)/gi, '},$1$2')
  // Remove commas before closing braces/brackets
  .replace(/,(\s*[}\]])/g, '$1');

writeFileSync('src/config/themes.ts', fixed, 'utf8');
console.log('✅ Fixed themes.ts formatting');
