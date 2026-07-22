import { useEffect, useState } from 'react'
import type { Attraction } from '../data/okinawa'
import { FALLBACK_PLACE_IMAGE, getPlaceImage } from '../data/images'

interface Props {
  place: Attraction
  alt?: string
  className?: string
  loading?: 'lazy' | 'eager'
  draggable?: boolean
}

export default function PlacePhoto({
  place,
  alt,
  className,
  loading = 'lazy',
  draggable,
}: Props) {
  const primary = getPlaceImage(place)
  const [src, setSrc] = useState(primary)

  useEffect(() => {
    setSrc(primary)
  }, [primary])

  return (
    <img
      src={src}
      alt={alt ?? place.name}
      className={className}
      loading={loading}
      draggable={draggable}
      onError={() => {
        if (src !== FALLBACK_PLACE_IMAGE) setSrc(FALLBACK_PLACE_IMAGE)
      }}
    />
  )
}
