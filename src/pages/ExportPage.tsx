// Export: your data as an Excel workbook (one sheet per table) or a CSV file (one table), for a
// date range. Everything is made in the browser; nothing is uploaded.

import { useLiveQuery } from 'dexie-react-hooks'
import { Download, FileSpreadsheet, FileText, LoaderCircle } from 'lucide-react'
import { useState } from 'react'

import { Card, LogBadge, SectionLabel, Segmented } from '../components/ui'
import { DATASETS, type ExportRange } from '../lib/export/datasets'
import { toCsv } from '../lib/export/csv'
import { exportFileName, presetRange, RANGE_LABEL, type RangePreset } from '../lib/export/ranges'
import { toXlsxBlob } from '../lib/export/xlsx'
import { currencySymbol, minorDigits } from '../lib/money'
import { usePrefs } from '../lib/prefs'
import { LOGS } from '../logs/registry'

type Format = 'xlsx' | 'csv'

const READY_LOGS = LOGS.filter((log) => log.status === 'ready')

function download(blob: Blob, name: string) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000)
}

export function ExportPage() {
  const prefs = usePrefs()
  const [now] = useState(() => new Date())
  const [format, setFormat] = useState<Format>('xlsx')
  const [preset, setPreset] = useState<RangePreset>('all')
  const [custom, setCustom] = useState<ExportRange>({ from: null, to: null })
  // Excel: tables ticked (default: those of the logs you use). CSV: one table.
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(DATASETS.filter((d) => prefs.logs.enabled[d.log]).map((d) => d.id)),
  )
  const [single, setSingle] = useState<string>(
    () => DATASETS.find((d) => prefs.logs.enabled[d.log])?.id ?? DATASETS[0]!.id,
  )
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const range = presetRange(preset, now, custom)
  const ctx = { unit: prefs.units.weight, currency: prefs.currency, range }
  // Every table for the current range, rebuilt when data, range or units change (data is small).
  const tables = useLiveQuery(async () => {
    const built = await Promise.all(DATASETS.map((d) => d.build(ctx)))
    return new Map(DATASETS.map((d, i) => [d.id, built[i]!]))
  }, [range.from, range.to, ctx.unit, ctx.currency])

  const chosen =
    format === 'xlsx'
      ? DATASETS.filter((d) => picked.has(d.id))
      : DATASETS.filter((d) => d.id === single)
  const chosenTables = tables ? chosen.map((d) => tables.get(d.id)!).filter(Boolean) : []
  const rowCount = chosenTables.reduce((sum, t) => sum + t.rows.length, 0)

  function toggle(id: string) {
    setPicked((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function exportNow() {
    if (!chosenTables.length) return
    setBusy(true)
    setMessage(null)
    try {
      if (format === 'xlsx') {
        const blob = await toXlsxBlob(chosenTables, {
          symbol: currencySymbol(prefs.currency),
          decimals: minorDigits(prefs.currency),
        })
        const name = exportFileName('export', 'xlsx', now)
        download(blob, name)
        setMessage({
          kind: 'ok',
          text: `Saved ${name}: ${chosenTables.length} ${chosenTables.length === 1 ? 'sheet' : 'sheets'}, ${rowCount} rows.`,
        })
      } else {
        const table = chosenTables[0]!
        const name = exportFileName(single, 'csv', now)
        download(new Blob([toCsv(table)], { type: 'text/csv;charset=utf-8' }), name)
        setMessage({ kind: 'ok', text: `Saved ${name}: ${table.rows.length} rows.` })
      }
    } catch {
      setMessage({
        kind: 'error',
        text: "The file couldn't be made. Try again, or pick fewer tables.",
      })
    } finally {
      setBusy(false)
    }
  }

  const field =
    'h-11 rounded-xl bg-card-2 px-3 text-body outline-none focus:ring-2 focus:ring-accent'

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 pb-8">
      <SectionLabel>Format</SectionLabel>
      <Segmented<Format>
        label="Format"
        value={format}
        onChange={(value) => {
          setFormat(value)
          setMessage(null)
        }}
        options={[
          {
            value: 'xlsx',
            label: (
              <>
                <FileSpreadsheet className="size-4" /> Excel
              </>
            ),
          },
          {
            value: 'csv',
            label: (
              <>
                <FileText className="size-4" /> CSV
              </>
            ),
          },
        ]}
      />
      <p className="px-1 pt-1 text-label text-ink-2">
        {format === 'xlsx'
          ? 'One workbook with a sheet per table. Opens in Excel, Google Sheets and Numbers.'
          : 'One table as a plain CSV file — for importing into other apps.'}
      </p>

      <SectionLabel>Dates</SectionLabel>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Dates">
        {(Object.keys(RANGE_LABEL) as RangePreset[]).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={preset === value}
            onClick={() => setPreset(value)}
            className={`h-9 rounded-full px-4 text-label font-medium ${
              preset === value ? 'bg-accent text-on-accent' : 'bg-card'
            }`}
          >
            {RANGE_LABEL[value]}
          </button>
        ))}
      </div>
      {preset === 'custom' && (
        <div className="grid grid-cols-2 gap-3 pt-2">
          <label className="flex flex-col gap-1.5">
            <span className="px-1 text-label text-ink-2">From</span>
            <input
              type="date"
              value={custom.from ?? ''}
              onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value || null }))}
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="px-1 text-label text-ink-2">To</span>
            <input
              type="date"
              value={custom.to ?? ''}
              onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value || null }))}
              className={field}
            />
          </label>
        </div>
      )}
      <p className="px-1 pt-1 text-label text-ink-2">
        Applies to dated entries. Lists like categories, bills and things are always exported in
        full.
      </p>

      <SectionLabel>{format === 'xlsx' ? 'Tables' : 'Table'}</SectionLabel>
      {READY_LOGS.map((log) => {
        const sets = DATASETS.filter((d) => d.log === log.id)
        if (!sets.length) return null
        return (
          <Card key={log.id} as="div" className="flex flex-col gap-1 py-2">
            <div className="flex items-center gap-3 pb-1">
              <LogBadge
                icon={log.icon}
                colorClass={log.color.text}
                softClass={log.color.soft}
                size="sm"
              />
              <span className="text-body font-semibold">{log.name}</span>
            </div>
            {sets.map((d) => {
              const rows = tables?.get(d.id)?.rows.length
              const checked = format === 'xlsx' ? picked.has(d.id) : single === d.id
              return (
                <label
                  key={d.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-1 py-2"
                >
                  <input
                    type={format === 'xlsx' ? 'checkbox' : 'radio'}
                    name="export-table"
                    checked={checked}
                    onChange={() => (format === 'xlsx' ? toggle(d.id) : setSingle(d.id))}
                    className="size-5 shrink-0 accent-[var(--c-accent)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-body">{d.label}</span>
                    <span className="block text-label text-ink-2">{d.description}</span>
                  </span>
                  <span className="shrink-0 text-label text-ink-2 tnum">
                    {rows === undefined ? '…' : `${rows} ${rows === 1 ? 'row' : 'rows'}`}
                  </span>
                </label>
              )
            })}
          </Card>
        )
      })}

      {message && (
        <p
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`mt-2 rounded-xl px-4 py-3 text-label ${message.kind === 'error' ? 'bg-danger/10 text-danger' : 'bg-success-soft text-success'}`}
        >
          {message.text}
        </p>
      )}

      <button
        type="button"
        onClick={exportNow}
        disabled={busy || !tables || chosenTables.length === 0}
        className="mt-3 flex h-12 items-center justify-center gap-2 rounded-full bg-accent font-semibold text-on-accent active:scale-[0.98] disabled:opacity-50"
      >
        {busy ? <LoaderCircle className="size-5 animate-spin" /> : <Download className="size-5" />}
        {format === 'xlsx'
          ? `Download Excel file${chosenTables.length ? ` (${chosenTables.length} ${chosenTables.length === 1 ? 'sheet' : 'sheets'})` : ''}`
          : 'Download CSV'}
      </button>
      <p className="px-1 pt-1 text-center text-label text-ink-3">
        Made on this device; nothing is uploaded. Weights in {prefs.units.weight}, money in{' '}
        {prefs.currency}.
      </p>
    </div>
  )
}
