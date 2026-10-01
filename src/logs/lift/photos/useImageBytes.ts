import { useCallback } from 'react'

import { bytesToUrl } from '../../../lib/images'

// A ref for an <img> that shows stored image bytes through a blob: URL. The URL is revoked when the
// element goes away or the data changes.
export function useImageBytes(data: ArrayBuffer | undefined, mime: string | undefined) {
  return useCallback(
    (img: HTMLImageElement | null) => {
      if (!img || !data || !mime || data.byteLength === 0) return
      const url = bytesToUrl(data, mime)
      img.src = url
      return () => URL.revokeObjectURL(url)
    },
    [data, mime],
  )
}
