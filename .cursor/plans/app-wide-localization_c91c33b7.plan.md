---
name: app-wide-localization
overview: Turn the existing custom `src/i18n` utilities into an app-wide, reactive localization system (provider + hooks), add Spanish support, and migrate key UI surfaces off hardcoded strings in a systematic, incremental way.
todos:
  - id: i18n-runtime
    content: Refactor/extend `src/i18n/index.ts` to support `Locale`, `getLocale()`, safe interpolation, fallback rules, and dictionary registration for `en` + `es` (from a single translations file).
    status: pending
  - id: react-provider
    content: Add `I18nProvider` + hooks (`useT`, `useLocale`) and wire provider into `src/main.tsx` with SSR-safe guards and persistence.
    status: pending
  - id: translations-single-file
    content: Replace per-locale files with a single `src/i18n/translations.ts` exporting `{ en, es }` (same schema for both).
    status: pending
  - id: settings-switcher
    content: Add a language selector to `src/pages/Settings.tsx` using `useLocale()`, with accessible labels and a default based on stored/browser locale.
    status: pending
  - id: initial-migration
    content: Migrate a small, high-signal set of UI strings to `t()` (start with Settings + one portal heading) using a consistent key naming scheme.
    status: pending
  - id: verify
    content: Verify persistence, rerendering on switch, missing-key behavior, and param interpolation; spot-check existing `t()` call sites still work.
    status: pending
---

# App-wide localization system (custom i18n + en/es)

## Goal

Provide a single, app-wide localization mechanism that:

- Supports **en + es** initially (easy to extend)
- Has a **React provider** so locale changes re-render the UI
- Offers ergonomic APIs: `useT()` / `useLocale()` and optional `<Trans>`-style helper for interpolation
- Persists the chosen locale (e.g. localStorage) and optionally reads the browser default
- Gradually replaces hardcoded UI strings without needing a “big bang” rewrite

## Current state (what we’ll build on)

- You already have a typed translation dictionary and `t()` function:
- `src/i18n/en.ts`
- `src/i18n/index.ts` (module-level `activeLocale`, `setLocale()`, `t()`)
- Usage today is limited (mostly billing/license):
- `src/components/LicenseGate.tsx`, `src/hooks/useLicense.ts`, `src/api/billing.ts`, etc.
- There is **no** initialization in `src/main.tsx`/`src/App.tsx`, so locale is not app-wide nor reactive.

## Design

### 1) Core i18n runtime

Refactor `src/i18n/index.ts` from a “global module variable” to a small runtime that can be driven by React:

- Keep the dictionary and typed keys approach.
- Add:
- `Locale` type (`'en' | 'es'`)
- `getLocale()`
- `format(template, params)` (keep your `{{param}}` interpolation)
- `hasKey(locale, key)` (optional but helps debugging)

#### Translations source (single file; no per-locale files)

- New: `src/i18n/translations.ts`
- Exports `translations = { en: { ... }, es: { ... } }` in one place
- Enforces same schema by typing `es` as `typeof en`
- Keeps keys discoverable and avoids splitting locales into multiple files

### 2) React integration (app-wide)

Add a provider and hooks:

- New: `src/i18n/I18nProvider.tsx`
- Holds `locale` in React state
- Exposes `setLocale(locale)` and `t(key, params)`
- Initializes locale from:
- localStorage (preferred)
- else `navigator.language` mapping (`es-*` -> `es`, default `en`)
- Writes locale to localStorage on change
- New: `src/i18n/useI18n.ts` (or `src/i18n/hooks.ts`)
- `useT()` returns the `t` function from context
- `useLocale()` returns `{ locale, setLocale }`

Wire provider at the root:

- Update `src/main.tsx` to wrap `<App />` with `<I18nProvider>` (outside router is fine).

### 3) Spanish translations (kept in the single translations file)

- Add `es` alongside `en` inside `src/i18n/translations.ts`.
- Start with:
- `common.*`
- Any already-used keys in billing/license to keep parity

### 4) Locale switcher UI

Add a minimal UI entry-point so the system is “real”:

- Portal: add language control in `src/pages/Settings.tsx` (best user-facing place)
- Use `useLocale()` to switch between English/Spanish
- Optional admin location later (e.g., `src/layouts/AdminLayout.tsx` top bar)

### 5) Incremental string migration strategy

Avoid trying to translate the entire UI at once. Do this in order:

- **Phase A (core correctness)**: ensure provider works; existing billing/license uses `t()` still work.
- **Phase B (high-signal portal screens)**:
- `src/pages/Marketing.tsx` (public landing)
- `src/pages/Login.tsx`, `src/pages/Signup.tsx` (auth-adjacent but not “auth logic”; if you want to exclude, we can skip)
- `src/pages/Dashboard.tsx` (top nav + key headings)
- `src/pages/Settings.tsx` (section headings + new language picker)
- **Phase C (other features)**: calendar, messages, travel, uniforms, tryouts.

Implementation detail:

- Prefer short keys like `portal.dashboard.title` rather than embedding page names in code.
- Translate only user-visible strings; keep internal enum/status values as-is.

### 6) Guardrails

- Add a dev-friendly fallback behavior:
- If key missing in active locale, fall back to `en`, else show the key.
- Add a small helper for type-safe keys (already present via `TranslationKey`).
- Keep server/API error strings as-is when they come from Supabase/Stripe; only local UI copy is translated.

## Likely pitfalls & chosen prevention approach (baked into implementation)

Below are the **top 10** issues likely to occur while implementing app-wide i18n here, with **two avoidance approaches** each. The plan adopts the **chosen** approach.

1) **Locale changes don’t re-render UI** (because `activeLocale` is module state)

- Approach A: keep module `activeLocale` and manually force re-renders (event emitter)
- Approach B (chosen): React context provider holds `locale` state; `t()` uses provider state

2) **Key drift between locales** (missing Spanish entries causing runtime fallbacks everywhere)

- Approach A: runtime-only fallback and accept partial coverage
- Approach B (chosen): type Spanish dictionary as `typeof en` so schema mismatches are compile-time errors (allow an intentional partial only if explicitly opted into)

3) **Missing keys hidden in production** (quiet fallback makes gaps hard to notice)

- Approach A: always fall back silently
- Approach B (chosen): keep fallback, but add an optional dev-only warning path for missing keys; return the key if missing in both locales

4) **Interpolation bugs / unsafe replacements** (`{{param}}` not replaced, wrong types)

- Approach A: ad-hoc string replacement at each call site
- Approach B (chosen): centralize interpolation in `format(template, params)` and keep params typed to `string | number`

5) **Inconsistent key naming** (hard to find/reuse strings; duplicates proliferate)

- Approach A: let each file invent keys
- Approach B (chosen): adopt a convention and enforce it during migration (e.g. `common.*`, `portal.*`, `admin.*`, `errors.*`)

6) **Locale persistence conflicts** (stored locale vs browser locale)

- Approach A: always use browser locale
- Approach B (chosen): precedence order `localStorage -> browser -> default`, encapsulated in provider init

7) **Non-browser runtime crash** (`navigator` / `localStorage` access during tests or non-DOM execution)

- Approach A: read `localStorage`/`navigator` at module top-level
- Approach B (chosen): access them inside provider initializer/effects with guards

8) **Over-scoping the migration** (too many string changes, high regression risk)

- Approach A: translate all screens immediately
- Approach B (chosen): “thin slice” first (Settings + one portal heading), then expand iteratively

9) **Breaking existing `t()` call sites** (today many files import `t` from `../i18n`)

- Approach A: force all callers to switch to hooks in one pass
- Approach B (chosen): keep a compatible `t()` export (still works) while adding `useT()` for React components; migrate gradually

10) **Translations organization & maintainability** (you don’t want many locale files)

- Approach A: one file per locale (and more as you add domains)
- Approach B (chosen): single `src/i18n/translations.ts` containing `{ en, es }` for now; can be split later only if it grows too large

### 7) Verification checklist

- Locale persists across refresh
- Switching locale re-renders visible UI text immediately
- No runtime crashes when locale is unknown
- Spot-check `t('common.loading')` in `LicenseGate` still renders correctly
- Spanish strings appear in Settings + at least one portal page heading

## Files likely to change / add

- `src/main.tsx` (wrap root with provider)
- `src/i18n/index.ts` (runtime improvements)
- `src/i18n/translations.ts` (new; contains `en` + `es` together)
- `src/i18n/en.ts` (may be removed after folding into `translations.ts`)
- `src/i18n/I18nProvider.tsx` (new)
- `src/i18n/useI18n.ts` (new)
- `src/pages/Settings.tsx` (language switcher + begin migration)

## Notes

This plan keeps your current lightweight, typed key system and makes it truly app-wide and reactive, without introducing new dependencies. To add another locale later, add another entry under `translations` in `src/i18n/translations.ts` (e.g., `fr`), matching the `en` schema.