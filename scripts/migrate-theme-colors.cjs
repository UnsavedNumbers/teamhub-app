/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.resolve(__dirname, '../src');
const BACKUP_DIR = path.resolve(__dirname, '../backups');

// Color map: exact matches to tokens
const COLOR_MAP = {
    // Primary Blue
    '#137fec': { token: 'var(--org-btn-primary-bg, var(--pa-theme-action-primary, #137fec))', class: 'org-btn-primary' },
    '#0d6bc2': { token: 'var(--org-btn-primary-hover, var(--pa-theme-action-hover, #0d6bc2))', class: 'org-btn-primary:hover' },
    '#0b5ba0': { token: 'var(--org-btn-primary-active, var(--pa-theme-action-active, #0b5ba0))', class: 'org-btn-primary:active' },

    // Opacity variants (approximate)
    'rgba(19, 127, 236, 0.1)': { token: 'var(--org-badge-primary-bg, var(--pa-theme-surface-accent, rgba(19, 127, 236, 0.1)))', class: 'org-badge-primary' },
    'rgba(19, 127, 236, 0.15)': { token: 'var(--org-highlight-bg, var(--pa-theme-surface-highlight, rgba(19, 127, 236, 0.15)))' },

    // Text
    '#ffffff': { context: 'text-on-primary', token: 'var(--org-btn-primary-text, #ffffff)' },
};

// Taildwind Arbitrary Value Regex
const TAILWIND_BG_REGEX = /bg-\[#137fec\]/g;
const TAILWIND_TEXT_REGEX = /text-\[#137fec\]/g;
const TAILWIND_BORDER_REGEX = /border-\[#137fec\]/g;

// Hardcoded HEX Regex
const HEX_REGEX = /#137fec/gi;

function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
}

function processFile(filePath, dryRun = true) {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let modified = false;

    // Strategy 1: Replace Tailwind Arbitrary Values with Utility Classes
    if (TAILWIND_BG_REGEX.test(newContent)) {
        console.log(`[Suggested] ${path.relative(TARGET_DIR, filePath)}: Replace bg-[#137fec] with org-btn-primary or bg-[var(--org-btn-primary-bg)]`);
        if (!dryRun) {
            // Use utility class if it seems to be a button, otherwise variable
            // This is heuristic, risky to auto-replace globally with class
            // Safer to use variable: bg-[var(--org-btn-primary-bg)]
            newContent = newContent.replace(TAILWIND_BG_REGEX, 'bg-[var(--org-btn-primary-bg)]');
            modified = true;
        }
    }

    if (TAILWIND_TEXT_REGEX.test(newContent)) {
        console.log(`[Suggested] ${path.relative(TARGET_DIR, filePath)}: Replace text-[#137fec] with text-[var(--org-link-color)]`);
        if (!dryRun) {
            newContent = newContent.replace(TAILWIND_TEXT_REGEX, 'text-[var(--org-link-color)]');
            modified = true;
        }
    }

    // Strategy 2: Hex replacements in styles/JSX
    if (HEX_REGEX.test(newContent)) {
        console.log(`[Found #137fec] ${path.relative(TARGET_DIR, filePath)}`);
        // We define a Replacer function
        if (!dryRun) {
            newContent = newContent.replace(HEX_REGEX, 'var(--org-btn-primary-bg, #137fec)');
            modified = true;
        }
    }

    if (modified && !dryRun) {
        console.log(`[UPDATED] ${filePath}`);
        fs.writeFileSync(filePath, newContent, 'utf8');
    }
}

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts') || dirPath.endsWith('.css')) {
                callback(dirPath);
            }
        }
    });
}

function main() {
    const args = process.argv.slice(2);
    const dryRun = !args.includes('--apply');

    console.log(`Starting Migration Scan... (Dry Run: ${dryRun})`);

    if (!dryRun) {
        ensureBackupDir();
    }

    walkDir(TARGET_DIR, (filePath) => {
        // Skip node_modules etc
        if (filePath.includes('node_modules')) return;
        processFile(filePath, dryRun);
    });

    console.log('Done.');
}

main();
