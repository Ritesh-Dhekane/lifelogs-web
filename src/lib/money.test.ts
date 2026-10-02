import { describe, expect, it } from 'vitest'

import { amountInputValue, currencySymbol, formatMoney, parseAmount } from './money'

describe('money', () => {
  it('parses amounts typed in different ways', () => {
    expect(parseAmount('1250', 'INR')).toBe(125000)
    expect(parseAmount('1,250.5', 'INR')).toBe(125050)
    expect(parseAmount('₹ 99', 'INR')).toBe(9900)
    expect(parseAmount('12,50', 'EUR')).toBe(1250) // decimal comma
    expect(parseAmount('1,23,456', 'INR')).toBe(12345600) // Indian grouping
    expect(parseAmount('500', 'JPY')).toBe(500) // no minor units
    expect(parseAmount('0', 'INR')).toBeNull()
    expect(parseAmount('', 'INR')).toBeNull()
    expect(parseAmount('1.2.3', 'INR')).toBeNull()
  })

  it('formats with the right symbol, grouping and decimals', () => {
    expect(formatMoney(12345600, 'INR')).toBe('₹1,23,456')
    expect(formatMoney(125050, 'INR')).toBe('₹1,250.50')
    expect(formatMoney(1200, 'USD')).toBe('$12')
    expect(formatMoney(500, 'JPY')).toBe('¥500')
    expect(currencySymbol('INR')).toBe('₹')
  })

  it('turns stored amounts back into input text', () => {
    expect(amountInputValue(125050, 'INR')).toBe('1250.50')
    expect(amountInputValue(125000, 'INR')).toBe('1250')
  })
})
