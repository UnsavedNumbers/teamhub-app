/**
 * CSS Variable Constants
 * 
 * Use these constants instead of raw strings to prevent typos and enable autocomplete.
 * These map to variables defined in src/styles/platformAdmin.css
 */
export const CSS_VARS = {
    // Colors - Neutral Ramp
    paN0: 'var(--pa-n0)',
    paN25: 'var(--pa-n25)',
    paN50: 'var(--pa-n50)',
    paN100: 'var(--pa-n100)',
    paN200: 'var(--pa-n200)',
    paN300: 'var(--pa-n300)',
    paN400: 'var(--pa-n400)',
    paN500: 'var(--pa-n500)',
    paN600: 'var(--pa-n600)',
    paN700: 'var(--pa-n700)',
    paN800: 'var(--pa-n800)',
    paN900: 'var(--pa-n900)',

    // Semantic Colors
    paInk: 'var(--pa-ink)',
    paWhite: 'var(--pa-white)',
    paGray: 'var(--pa-gray)',
    paSuccess: 'var(--pa-success)',
    paSuccessBg: 'var(--pa-success-bg)',
    paWarning: 'var(--pa-warning)',
    paWarningBg: 'var(--pa-warning-bg)',
    paDanger: 'var(--pa-danger)',
    paDangerBg: 'var(--pa-danger-bg)',
    paInfo: 'var(--pa-info)',
    paInfoBg: 'var(--pa-info-bg)',

    // Text Colors (Dark Mode aware)
    paTextPrimary: 'var(--pa-text-primary)',
    paTextSecondary: 'var(--pa-text-secondary)',
    paTextMuted: 'var(--pa-text-muted)',

    // Spacing
    paSpace1: 'var(--pa-space-1)',
    paSpace2: 'var(--pa-space-2)',
    paSpace3: 'var(--pa-space-3)',
    paSpace4: 'var(--pa-space-4)',
    paSpace5: 'var(--pa-space-5)',
    paSpace6: 'var(--pa-space-6)',
    paSpace7: 'var(--pa-space-7)',
    paSpace8: 'var(--pa-space-8)',
    paSpace9: 'var(--pa-space-9)',

    // Z-Index
    zLoader: 'var(--z-loader)',
    zBackdrop: 'var(--z-backdrop)',
    zBottomSheet: 'var(--z-bottom-sheet)',
    zDrawer: 'var(--z-drawer)',
    zNav: 'var(--z-nav)',
} as const
