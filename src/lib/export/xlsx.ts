// Excel workbook: one sheet per table, typed cells (numbers, dates, yes/no), a bold frozen header
// and column widths. The writer library is loaded only when someone exports.

import type { CellObject, Sheet } from 'write-excel-file/browser'

import { localParts, type Cell, type Column, type ExportTable } from './table'

// write-excel-file turns a Date into an Excel date using its UTC fields, and Excel dates have no
// time zone. So pass a Date whose UTC fields are the local wall-clock time.
function wallClock(iso: string): Date {
  const p = localParts(iso)
  return new Date(Date.UTC(p.y, p.m - 1, p.d, p.h, p.min))
}

function dayDate(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1))
}

// Excel number format for money: the symbol in quotes, then the number.
export function moneyFormat(symbol: string, decimals: number): string {
  const safe = symbol.replace(/"/g, '')
  return `"${safe}"#,##0${decimals > 0 ? '.' + '0'.repeat(decimals) : ''}`
}

function cell(value: Cell, column: Column, money: string): CellObject | null {
  if (value === null || value === '') return null
  switch (column.type) {
    case 'datetime':
      return { value: wallClock(String(value)), type: Date, format: 'yyyy-mm-dd hh:mm' }
    case 'day':
      return { value: dayDate(String(value)), type: Date, format: 'yyyy-mm-dd' }
    case 'month':
      return { value: dayDate(`${value}-01`), type: Date, format: 'mmm yyyy' }
    case 'money':
      return { value: Number(value), type: Number, format: money }
    case 'decimal':
      return { value: Number(value), type: Number, format: '#,##0.##' }
    case 'integer':
      return { value: Number(value), type: Number, format: '#,##0' }
    case 'boolean':
      return { value: value ? 'Yes' : 'No', type: String }
    case 'text':
      // "@" keeps Excel from reading text like "1-2" as a date.
      return { value: String(value), type: String, format: '@' }
  }
}

// Sheet names: ≤ 31 characters, none of []:*?/\ and unique within the workbook.
export function sheetNames(names: string[]): string[] {
  const used = new Set<string>()
  return names.map((name) => {
    const base =
      name
        .replace(/[[\]:*?/\\]/g, ' ')
        .trim()
        .slice(0, 31) || 'Sheet'
    let candidate = base
    for (let i = 2; used.has(candidate.toLowerCase()); i++) {
      candidate = `${base.slice(0, 31 - String(i).length - 1)} ${i}`
    }
    used.add(candidate.toLowerCase())
    return candidate
  })
}

export async function toXlsxBlob(
  tables: ExportTable[],
  money: { symbol: string; decimals: number },
): Promise<Blob> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const format = moneyFormat(money.symbol, money.decimals)
  const names = sheetNames(tables.map((t) => t.name))
  const sheets: Sheet<Blob>[] = tables.map((table, i) => ({
    sheet: names[i]!,
    stickyRowsCount: 1,
    columns: table.columns.map((c) => ({ width: c.width ?? Math.max(10, c.header.length + 2) })),
    data: [
      table.columns.map((c) => ({
        value: c.header,
        type: String,
        fontWeight: 'bold' as const,
        backgroundColor: '#EFEFF4',
      })),
      ...table.rows.map((row) => row.map((value, col) => cell(value, table.columns[col]!, format))),
    ],
  }))
  return writeXlsxFile(sheets, { fontFamily: 'Calibri', fontSize: 11 }).toBlob()
}
