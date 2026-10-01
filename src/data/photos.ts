// Progress photos. Images arrive already resized (see lib/images.ts) so this stays testable.
// Deleting keeps a tombstone row (for backups/sync) but drops the image bytes to free space.

import { db, newId, nowIso, requestPersistentStorage, type ProgressPhoto } from './db'

export interface ImageData {
  data: ArrayBuffer
  mime: string
  width: number
  height: number
}

export async function listPhotos(): Promise<ProgressPhoto[]> {
  const rows = await db.photos.orderBy('takenAt').reverse().toArray()
  return rows.filter((photo) => !photo.deletedAt)
}

export async function getPhoto(id: string): Promise<ProgressPhoto | undefined> {
  const photo = await db.photos.get(id)
  return photo && !photo.deletedAt ? photo : undefined
}

export async function addPhoto(input: {
  takenAt: string
  note?: string | null
  image: ImageData
  thumb: ImageData
}): Promise<ProgressPhoto> {
  const now = nowIso()
  const photo: ProgressPhoto = {
    id: newId(),
    takenAt: input.takenAt,
    mime: input.image.mime,
    width: input.image.width,
    height: input.image.height,
    data: input.image.data,
    thumb: input.thumb.data,
    note: input.note?.trim().slice(0, 300) || null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
  await db.photos.add(photo)
  void requestPersistentStorage()
  return photo
}

export async function updatePhoto(id: string, changes: { takenAt?: string; note?: string | null }) {
  const clean: Partial<ProgressPhoto> = { updatedAt: nowIso() }
  if (changes.takenAt) clean.takenAt = changes.takenAt
  if ('note' in changes) clean.note = changes.note?.trim().slice(0, 300) || null
  await db.photos.update(id, clean)
}

export async function deletePhoto(id: string): Promise<void> {
  const now = nowIso()
  await db.photos.update(id, {
    deletedAt: now,
    updatedAt: now,
    data: new ArrayBuffer(0),
    thumb: new ArrayBuffer(0),
  })
}
