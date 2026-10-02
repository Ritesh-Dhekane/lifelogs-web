// CSV for one table: comma-separated, quoted where needed, CRLF line ends, and a UTF-8 BOM so
// Excel shows ₹ and other non-ASCII text correctly. Numbers stay plain (1250.5, not "₹1,250.50")
// so spreadsheets can add them up.

import { localDateTimeText, type Cell, type ExportTable } from './table'

// Text a spreadsheet would run as a formula ("=HYPERLINK(…)", "+1…", "@SUM…") gets a leading
// apostrophe. Only for text columns: real numbers (including negative ones) are left alone.
const FORMULA_START = /^[=+\-@\t\r]/

function quote(text: string): string {
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function cellText(cell: Cell, type: ExportTable['columns'][number]['type']): string {
  if (cell === null || cell === '') return ''
  switch (type) {
    case 'datetime':
      return localDateTimeText(String(cell))
    case 'boolean':
      return cell ? 'Yes' : 'No'
    case 'integer':
    case 'decimal':
    case 'money':
      return typeof cell === 'number' ? String(Math.round(cell * 100) / 100) : String(cell)
    case 'day':
    case 'month':
      return String(cell)
    case 'text': {
      const text = String(cell)
      return FORMULA_START.test(text) ? `'${text}` : text
    }
  }
}

export function toCsv(table: ExportTable): string {
  const lines = [
    table.columns.map((c) => quote(c.header)).join(','),
    ...table.rows.map((row) =>
      row.map((cell, i) => quote(cellText(cell, table.columns[i]!.type))).join(','),
    ),
  ]
  return '﻿' + lines.join('\r\n') + '\r\n'
}
