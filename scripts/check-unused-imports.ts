/**
 * Check Unused Imports Script
 *
 * Analyzes service files to identify unused fake data imports.
 * Only reports imports that are safe to remove (not used in USE_FAKE_DATA branch).
 *
 * Usage: npx tsx scripts/check-unused-imports.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { parse } from '@typescript-eslint/parser'
import type { TSESTree } from '@typescript-eslint/types'

interface ImportInfo {
    file: string
    importPath: string
    importedNames: string[]
    usedInFakeDataBranch: boolean
    usedOutsideFakeDataBranch: boolean
}

/**
 * Check if a file exists
 */
function fileExists(filePath: string): boolean {
    try {
        return fs.statSync(filePath).isFile()
    } catch {
        return false
    }
}

/**
 * Get all service files
 */
function getServiceFiles(): string[] {
    const servicesDir = path.join(process.cwd(), 'src', 'data', 'services')
    if (!fs.existsSync(servicesDir)) {
        console.error(`Services directory not found: ${servicesDir}`)
        return []
    }

    return fs
        .readdirSync(servicesDir)
        .filter((file) => file.endsWith('.ts') && file !== 'index.ts' && file !== 'queryHelpers.ts' && file !== 'responseHelpers.ts')
        .map((file) => path.join(servicesDir, file))
}

/**
 * Parse a TypeScript file and extract import information
 */
function parseImports(filePath: string): ImportInfo[] {
    const content = fs.readFileSync(filePath, 'utf-8')
    const ast = parse(content, {
        ecmaVersion: 2020,
        sourceType: 'module',
    })

    const imports: ImportInfo[] = []
    const fakeDataImports: Set<string> = new Set()

    // Walk the AST to find imports
    function walk(node: TSESTree.Node): void {
        if (node.type === 'ImportDeclaration') {
            const source = node.source.value as string

            // Check if it's a fake data import
            if (source.includes('../fake/') || source.includes('fake')) {
                const importedNames: string[] = []

                if (node.specifiers) {
                    for (const spec of node.specifiers) {
                        if (spec.type === 'ImportSpecifier') {
                            const name = spec.imported.name
                            importedNames.push(name)
                            fakeDataImports.add(name)
                        } else if (spec.type === 'ImportDefaultSpecifier') {
                            importedNames.push('default')
                        } else if (spec.type === 'ImportNamespaceSpecifier') {
                            importedNames.push('*')
                        }
                    }
                }

                imports.push({
                    file: filePath,
                    importPath: source,
                    importedNames,
                    usedInFakeDataBranch: false,
                    usedOutsideFakeDataBranch: false,
                })
            }
        }

        // Recursively walk child nodes
        if ('body' in node && Array.isArray(node.body)) {
            for (const child of node.body) {
                walk(child as TSESTree.Node)
            }
        }
        if ('children' in node && Array.isArray(node.children)) {
            for (const child of node.children) {
                walk(child as TSESTree.Node)
            }
        }
    }

    walk(ast)

    // Check usage in USE_FAKE_DATA branches
    function checkUsage(node: TSESTree.Node, inFakeDataBranch: boolean): void {
        if (node.type === 'Identifier') {
            const name = node.name
            if (fakeDataImports.has(name)) {
                const importInfo = imports.find((imp) => imp.importedNames.includes(name))
                if (importInfo) {
                    if (inFakeDataBranch) {
                        importInfo.usedInFakeDataBranch = true
                    } else {
                        importInfo.usedOutsideFakeDataBranch = true
                    }
                }
            }
        }

        // Check if we're entering a USE_FAKE_DATA branch
        let newInFakeDataBranch = inFakeDataBranch
        if (
            node.type === 'IfStatement' &&
            node.test.type === 'Identifier' &&
            node.test.name === 'USE_FAKE_DATA'
        ) {
            newInFakeDataBranch = true
        }

        // Recursively check child nodes
        if ('body' in node && Array.isArray(node.body)) {
            for (const child of node.body) {
                checkUsage(child as TSESTree.Node, newInFakeDataBranch)
            }
        }
        if ('children' in node && Array.isArray(node.children)) {
            for (const child of node.children) {
                checkUsage(child as TSESTree.Node, newInFakeDataBranch)
            }
        }
        if ('consequent' in node) {
            checkUsage(node.consequent as TSESTree.Node, newInFakeDataBranch)
        }
        if ('alternate' in node) {
            checkUsage(node.alternate as TSESTree.Node, inFakeDataBranch)
        }
    }

    checkUsage(ast, false)

    return imports
}

/**
 * Main function
 */
function main(): void {
    console.log('Checking for unused fake data imports in service files...\n')

    const serviceFiles = getServiceFiles()
    const unusedImports: ImportInfo[] = []

    for (const file of serviceFiles) {
        if (!fileExists(file)) {
            console.warn(`File not found: ${file}`)
            continue
        }

        try {
            const imports = parseImports(file)
            for (const imp of imports) {
                // Import is unused if it's only used in fake data branch (which won't run when USE_FAKE_DATA = false)
                // But we should be conservative - only mark as unused if not used at all
                // Actually, we want to find imports that are NOT used in the fake data branch
                // because those are definitely unused
                if (!imp.usedInFakeDataBranch && !imp.usedOutsideFakeDataBranch) {
                    unusedImports.push(imp)
                }
            }
        } catch (error) {
            console.error(`Error parsing ${file}:`, error)
        }
    }

    if (unusedImports.length === 0) {
        console.log('✓ No unused fake data imports found.')
        return
    }

    console.log(`Found ${unusedImports.length} potentially unused import(s):\n`)

    for (const imp of unusedImports) {
        const relativePath = path.relative(process.cwd(), imp.file)
        console.log(`  ${relativePath}`)
        console.log(`    Import: ${imp.importPath}`)
        console.log(`    Names: ${imp.importedNames.join(', ')}`)
        console.log(`    Status: Not used in code`)
        console.log('')
    }

    console.log('\n⚠️  Note: Manually verify these imports are truly unused before removing.')
    console.log('    Some imports may be used in ways this script cannot detect.')
}

// Run if executed directly
if (require.main === module) {
    main()
}

export { main as checkUnusedImports }
