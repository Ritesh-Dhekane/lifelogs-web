// Money is stored as whole minor units (paise, cents) so sums never drift. One currency for the
// whole app, chosen in Settings.

import type { CurrencyCode } from './currencies'
import { getPrefs } from './prefs'

export { CURRENCIES, isCurrency, type CurrencyCode } from './currencies'

// Digits after the decimal point (0 for yen).
export function minorDigits(currency: CurrencyCode): number {
  return (
    new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
      .maximumFractionDigits ?? 2
  )
}

// Indian digit grouping (1,23,456) for rupees, Western grouping otherwise.
function locale(currency: CurrencyCode): string {
  return currency === 'INR' ? 'en-IN' : 'en-US'
}

const formatters = new Map<string, Intl.NumberFormat>()
function formatter(currency: CurrencyCode, whole: boolean, compact: boolean): Intl.NumberFormat {
  const key = `${currency}-${whole}-${compact}`
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.NumberFormat(locale(currency), {
      style: 'currency',
      currency,
      ...(compact ? { notation: 'compact', maximumFractionDigits: 1 } : {}),
      ...(whole && !compact ? { maximumFractionDigits: 0, minimumFractionDigits: 0 } : {}),
    })
    formatters.set(key, f)
  }
  return f
}

export function toMajor(minor: number, currency: CurrencyCode): number {
  return minor / 10 ** minorDigits(currency)
}

// "₹1,250" (no decimals when there are none), "₹1,250.50", "$12.00".
export function formatMoney(
  minor: number,
  currency: CurrencyCode = getPrefs().currency,
  options: { compact?: boolean } = {},
): string {
  const major = toMajor(minor, currency)
  const whole = Number.isInteger(major)
  return formatter(currency, whole, Boolean(options.compact)).format(major)
}

// The currency sign alone, for input fields ("₹", "$").
export function currencySymbol(currency: CurrencyCode = getPrefs().currency): string {
  return (
    formatter(currency, true, false)
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value ?? currency
  )
}

// "1,250.5" / "1250,50" / "₹ 99" → minor units; null when it isn't a positive amount.
export function parseAmount(
  text: string,
  currency: CurrencyCode = getPrefs().currency,
): number | null {
  let cleaned = text.replace(/[^\d.,]/g, '')
  if (!cleaned) return null
  // A comma followed by exactly 1–2 digits at the end is a decimal comma.
  if (/,\d{1,2}$/.test(cleaned) && !cleaned.includes('.'))
    cleaned = cleaned.replace(/,(\d{1,2})$/, '.$1')
  cleaned = cleaned.replace(/,/g, '')
  if ((cleaned.match(/\./g) ?? []).length > 1) return null
  const value = Number(cleaned)
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value * 10 ** minorDigits(currency))
}

// Minor units → text for an input field ("1250.5" → "1250.50").
export function amountInputValue(
  minor: number,
  currency: CurrencyCode = getPrefs().currency,
): string {
  const digits = minorDigits(currency)
  const major = minor / 10 ** digits
  return Number.isInteger(major) ? String(major) : major.toFixed(digits)
}
