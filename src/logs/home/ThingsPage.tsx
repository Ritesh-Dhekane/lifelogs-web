// Home › Things: items you own (with warranties) and documents (with expiry dates).

import { useLiveQuery } from 'dexie-react-hooks'
import { Package, Plus, Search } from 'lucide-react'
import { createElement, useState } from 'react'
import { useSearchParams } from 'react-router'

import { Card, EmptyState, Segmented } from '../../components/ui'
import type { Thing, ThingKind } from '../../data/db'
import { getAttachment, listThings } from '../../data/things'
import { toDay } from '../../lib/days'
import { formatMoney } from '../../lib/money'
import { useImageBytes } from '../lift/photos/useImageBytes'
import { thingCategory } from './labels'
import { expiryText } from './stats'
import { ThingSheet } from './ThingSheet'

type Filter = 'all' | ThingKind

export function ThingsPage() {
  const things = useLiveQuery(listThings)
  const [params, setParams] = useSearchParams()
  const [now] = useState(() => new Date())
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const today = toDay(now)

  if (!things) return null

  const add = params.get('add') // "item" | "document"
  const openId = params.get('open')
  const editing = openId ? (things.find((t) => t.id === openId) ?? null) : null
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const shown = things.filter(
    (t) =>
      (filter === 'all' || t.kind === filter) &&
      words.every((w) =>
        [t.name, t.place ?? '', t.note ?? '', thingCategory(t.kind, t.category).label]
          .join(' ')
          .toLowerCase()
          .includes(w),
      ),
  )

  function close() {
    setParams({}, { replace: true })
  }

  return (
    <div className="flex flex-col gap-3 pb-16">
      {things.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nothing here yet"
          text="Add the things whose warranties matter and the papers that expire — passport, insurance, licence. You'll be reminded before dates run out."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => setParams({ add: 'item' }, { replace: true })}
                className="h-11 rounded-full bg-accent px-5 font-semibold text-on-accent"
              >
                Add item
              </button>
              <button
                type="button"
                onClick={() => setParams({ add: 'document' }, { replace: true })}
                className="h-11 rounded-full bg-card px-5 font-semibold"
              >
                Add document
              </button>
            </div>
          }
        />
      ) : (
        <>
          <label className="flex h-11 items-center gap-2 rounded-full bg-card px-4 focus-within:ring-2 focus-within:ring-accent">
            <Search className="size-4 text-ink-2" />
            <span className="sr-only">Search things</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, place, note"
              className="flex-1 bg-transparent text-body outline-none"
            />
          </label>
          <Segmented<Filter>
            size="sm"
            label="Show"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'item', label: 'Items' },
              { value: 'document', label: 'Documents' },
            ]}
          />
          {shown.length === 0 ? (
            <p className="py-8 text-center text-label text-ink-2">Nothing matches.</p>
          ) : (
            <Card as="div" className="flex flex-col divide-y divide-line px-0 py-1">
              {shown.map((thing) => (
                <ThingRow
                  key={thing.id}
                  thing={thing}
                  today={today}
                  onOpen={() => setParams({ open: thing.id }, { replace: true })}
                />
              ))}
            </Card>
          )}
        </>
      )}

      {things.length > 0 && (
        <button
          type="button"
          onClick={() =>
            setParams({ add: filter === 'document' ? 'document' : 'item' }, { replace: true })
          }
          className="fixed right-4 bottom-[calc(88px+env(safe-area-inset-bottom))] z-30 flex h-12 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-on-accent shadow-float active:scale-95 lg:bottom-8"
        >
          <Plus className="size-5" /> Add
        </button>
      )}

      <ThingSheet
        open={add === 'item' || add === 'document' || editing !== null}
        onClose={close}
        thing={editing}
        startKind={add === 'document' ? 'document' : 'item'}
      />
    </div>
  )
}

function ThingRow({ thing, today, onOpen }: { thing: Thing; today: string; onOpen: () => void }) {
  const category = thingCategory(thing.kind, thing.category)
  const expiry = expiryText(thing, today)
  const details = [
    thing.place,
    thing.priceMinor ? formatMoney(thing.priceMinor) : null,
    thing.kind === 'document' ? 'Document' : null,
  ].filter(Boolean)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-card-2"
    >
      {thing.photoId ? (
        <Thumb thing={thing} />
      ) : (
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-home/12 text-home-ink">
          {createElement(category.icon, { className: 'size-5', 'aria-hidden': true })}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body">{thing.name}</span>
        <span className="block truncate text-label text-ink-2">
          {details.join(' · ') || category.label}
        </span>
      </span>
      {expiry && (
        <span
          className={`max-w-[42%] shrink-0 text-right text-label ${
            expiry.urgent ? 'font-medium text-home-ink' : 'text-ink-2'
          }`}
        >
          {expiry.text}
        </span>
      )}
    </button>
  )
}

function Thumb({ thing }: { thing: Thing }) {
  const attachment = useLiveQuery(() => getAttachment(thing.photoId), [thing.photoId])
  const img = useImageBytes(attachment?.thumb, attachment?.mime)
  return <img ref={img} alt="" className="size-11 shrink-0 rounded-xl bg-card-2 object-cover" />
}
