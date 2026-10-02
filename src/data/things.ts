// Things you own and documents you hold: names, dates and an optional photo. Document numbers
// and scans are deliberately not asked for.

import type { ImageData } from './photos'
import { db, newId, nowIso, type Attachment, type Thing, type ThingKind } from './db'

export interface ThingInput {
  kind: ThingKind
  name: string
  category: string
  place?: string | null
  boughtOn?: string | null
  priceMinor?: number | null
  expiresOn?: string | null
  remindDays?: number
  note?: string | null
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function clean(text: string | null | undefined, max: number): string | null {
  const value = text?.trim()
  return value ? value.slice(0, max) : null
}

function normalize(input: ThingInput) {
  const name = input.name.trim().slice(0, 80)
  if (!name) throw new Error('Give it a name')
  for (const day of [input.boughtOn, input.expiresOn]) {
    if (day && !DAY_PATTERN.test(day)) throw new Error('Dates must be YYYY-MM-DD')
  }
  if (input.priceMinor != null && (!Number.isInteger(input.priceMinor) || input.priceMinor < 0)) {
    throw new Error('Price must be zero or more')
  }
  return {
    kind: input.kind,
    name,
    category: input.category,
    place: clean(input.place, 80),
    boughtOn: input.boughtOn || null,
    priceMinor: input.priceMinor ?? null,
    expiresOn: input.expiresOn || null,
    remindDays: Math.min(365, Math.max(0, Math.round(input.remindDays ?? 30))),
    note: clean(input.note, 500),
  }
}

export async function listThings(): Promise<Thing[]> {
  const rows = await db.things.toArray()
  return rows.filter((row) => !row.deletedAt).sort((a, b) => a.name.localeCompare(b.name))
}

export async function getThing(id: string): Promise<Thing | undefined> {
  const row = await db.things.get(id)
  return row && !row.deletedAt ? row : undefined
}

export async function addThing(input: ThingInput): Promise<Thing> {
  const now = nowIso()
  const thing: Thing = {
    id: newId(),
    ...normalize(input),
    photoId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
  await db.things.add(thing)
  return thing
}

export async function updateThing(id: string, input: ThingInput): Promise<void> {
  await db.things.update(id, { ...normalize(input), updatedAt: nowIso() })
}

// Soft-deletes the thing; its photo bytes are removed for good.
export async function deleteThing(id: string): Promise<void> {
  await db.transaction('rw', db.things, db.attachments, async () => {
    await db.attachments.where('ownerId').equals(id).delete()
    await db.things.update(id, { deletedAt: nowIso(), updatedAt: nowIso(), photoId: null })
  })
}

// ---------- Photos ----------

export async function getAttachment(id: string | null): Promise<Attachment | undefined> {
  return id ? db.attachments.get(id) : undefined
}

// Replaces the thing's photo (null removes it).
export async function setThingPhoto(
  thingId: string,
  photo: { image: ImageData; thumb: ImageData } | null,
): Promise<void> {
  await db.transaction('rw', db.things, db.attachments, async () => {
    await db.attachments.where('ownerId').equals(thingId).delete()
    let photoId: string | null = null
    if (photo) {
      photoId = newId()
      await db.attachments.add({
        id: photoId,
        ownerId: thingId,
        mime: photo.image.mime,
        width: photo.image.width,
        height: photo.image.height,
        data: photo.image.data,
        thumb: photo.thumb.data,
        createdAt: nowIso(),
      })
    }
    await db.things.update(thingId, { photoId, updatedAt: nowIso() })
  })
}
