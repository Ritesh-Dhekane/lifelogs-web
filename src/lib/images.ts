// Resize a picked or captured photo in the browser (respecting EXIF orientation) so photos stay
// small on the device and in backups.

import type { ImageData } from '../data/photos'

export const FULL_SIDE = 1600
export const THUMB_SIDE = 400

export async function resizeImage(
  source: Blob,
  maxSide: number,
  quality = 0.85,
): Promise<ImageData> {
  const bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available')
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not encode image'))),
      'image/jpeg',
      quality,
    ),
  )
  return { data: await blob.arrayBuffer(), mime: 'image/jpeg', width, height }
}

export async function prepareImage(source: Blob) {
  const [image, thumb] = await Promise.all([
    resizeImage(source, FULL_SIDE, 0.85),
    resizeImage(source, THUMB_SIDE, 0.8),
  ])
  return { image, thumb }
}

// Object URLs for stored bytes; callers revoke them when done.
export function bytesToUrl(data: ArrayBuffer, mime: string): string {
  return URL.createObjectURL(new Blob([data], { type: mime }))
}
