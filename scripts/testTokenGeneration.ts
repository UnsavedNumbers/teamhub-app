import { generateTokens } from '../src/utils/themeTokens.js'
import { getTheme } from '../src/config/themes.js'

// Test token generation
const defaultTheme = getTheme('default')
const lightTokens = generateTokens(defaultTheme, false)
const darkTokens = generateTokens(defaultTheme, true)

console.log('=== Light Mode Tokens ===')
console.log('Primary Button BG:', lightTokens['--org-btn-primary-bg'])
console.log('Secondary Button BG:', lightTokens['--org-btn-secondary-bg'])
console.log('Text Primary:', lightTokens['--org-text-primary'])
console.log('Surface Card:', lightTokens['--org-surface-card'])
console.log('Border Default:', lightTokens['--org-border-default'])
console.log('Status Success:', lightTokens['--org-status-success'])

console.log('\n=== Dark Mode Tokens ===')
console.log('Primary Button BG:', darkTokens['--org-btn-primary-bg'])
console.log('Text Primary:', darkTokens['--org-text-primary'])
console.log('Surface Card:', darkTokens['--org-surface-card'])
console.log('Border Default:', darkTokens['--org-border-default'])

console.log('\n✅ Token generation successful!')
