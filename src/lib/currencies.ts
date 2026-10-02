// Currencies the app offers in Settings. No imports, so prefs and money can both use it.

export const CURRENCIES = [
  { code: 'INR', label: 'Indian rupee (₹)' },
  { code: 'USD', label: 'US dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'British pound (£)' },
  { code: 'AED', label: 'UAE dirham' },
  { code: 'SGD', label: 'Singapore dollar' },
  { code: 'AUD', label: 'Australian dollar' },
  { code: 'CAD', label: 'Canadian dollar' },
  { code: 'JPY', label: 'Japanese yen (¥)' },
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]['code']

export function isCurrency(code: unknown): code is CurrencyCode {
  return CURRENCIES.some((c) => c.code === code)
}
