import { en } from './en'

type Translations = typeof en

const dictionaries: Record<string, Translations> = {
  en,
}

const DEFAULT_LOCALE = 'en'
let activeLocale = DEFAULT_LOCALE

export type TranslationKey = FlattenObject<Translations>

type FlattenObject<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends Record<string, unknown>
      ? FlattenObject<T[K], `${Prefix}${K}.`>
      : never
}[keyof T & string]

function lookup(key: string, locale: string): string | undefined {
  const dict = dictionaries[locale]
  if (!dict) return undefined

  const segments = key.split('.')
  let current: unknown = dict

  for (const segment of segments) {
    if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[segment]
    } else {
      return undefined
    }
  }

  return typeof current === 'string' ? current : undefined
}

export function setLocale(locale: string) {
  if (dictionaries[locale]) {
    activeLocale = locale
  }
}

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const template = lookup(key, activeLocale) ?? lookup(key, DEFAULT_LOCALE) ?? String(key)
  if (!params) return template

  return Object.entries(params).reduce((acc, [paramKey, value]) => {
    return acc.split(`{{${paramKey}}}`).join(String(value))
  }, template)
}
