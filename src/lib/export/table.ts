// A plain table that both writers understand. Dates stay as text in the rows — calendar days as
// "YYYY-MM-DD", moments as ISO timestamps, months as "YYYY-MM" — and each writer turns them into
// what its format needs (Excel dates, or local "YYYY-MM-DD HH:mm" text in CSV).

export type ColumnType =
  | 'text'
  | 'integer'
  | 'decimal' // up to 2 decimals (kg, litres, km/L)
  | 'money' // in major units (rupees, dollars), already converted from minor units
  | 'day' // "YYYY-MM-DD"
  | 'datetime' // ISO timestamp, shown in local time
  | 'month' // "YYYY-MM"
  | 'boolean'

export interface Column {
  header: string
  type: ColumnType
  width?: number // in characters, for Excel
}

export type Cell = string | number | boolean | null

export interface ExportTable {
  name: string // sheet name (≤ 31 characters, no []:*?/\)
  columns: Column[]
  rows: Cell[][]
}

const pad = (n: number) => String(n).padStart(2, '0')

// Local wall-clock parts of an ISO timestamp.
export function localParts(iso: string) {
  const d = new Date(iso)
  return {
    y: d.getFullYear(),
    m: d.getMonth() + 1,
    d: d.getDate(),
    h: d.getHours(),
    min: d.getMinutes(),
  }
}

export function localDateTimeText(iso: string): string {
  const p = localParts(iso)
  return `${p.y}-${pad(p.m)}-${pad(p.d)} ${pad(p.h)}:${pad(p.min)}`
}
