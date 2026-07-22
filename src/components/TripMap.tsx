import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { DAY_COLORS, type Attraction } from '../data/okinawa'
import 'leaflet/dist/leaflet.css'
import styles from './TripMap.module.css'

export interface MapMarker {
  id: string
  name: string
  nameJa?: string
  lat: number
  lng: number
  day?: number
  area?: string
  label?: string
}

interface Props {
  markers: MapMarker[]
  /** 依天數畫路線（僅同一天的點連線） */
  showRoutes?: boolean
  height?: number | string
  className?: string
  onMarkerClick?: (id: string) => void
  /** 外部指定要飛到的地點（token 變更即觸發） */
  focus?: { id: string; lat: number; lng: number; name?: string; token: number } | null
}

function FitBounds({ markers }: { markers: MapMarker[] }) {
  const map = useMap()
  useEffect(() => {
    if (markers.length === 0) {
      map.setView([26.35, 127.8], 9)
      return
    }
    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 12)
      return
    }
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]))
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 })
  }, [map, markers])
  return null
}

function FlyToFocus({
  focus,
}: {
  focus?: { lat: number; lng: number; token: number } | null
}) {
  const map = useMap()
  useEffect(() => {
    if (!focus) return
    const timer = window.setTimeout(() => {
      map.flyTo([focus.lat, focus.lng], 14, { duration: 0.75 })
    }, 80)
    return () => window.clearTimeout(timer)
  }, [map, focus?.token, focus?.lat, focus?.lng])
  return null
}

function createIcon(color: string, label: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};
      color:#fff;
      width:28px;height:28px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
      border:2px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,.25);
      font-size:11px;font-weight:700;
    "><span style="transform:rotate(45deg)">${label}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  })
}

function createFocusIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:18px;height:18px;border-radius:50%;
      background:#ff7e6b;border:3px solid #fff;
      box-shadow:0 0 0 6px rgba(255,126,107,.35),0 2px 8px rgba(0,0,0,.3);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

export default function TripMap({
  markers,
  showRoutes = false,
  height = 360,
  className,
  onMarkerClick,
  focus = null,
}: Props) {
  const routes = useMemo(() => {
    if (!showRoutes) return []
    const byDay = new Map<number, MapMarker[]>()
    markers.forEach((m) => {
      if (m.day == null) return
      const list = byDay.get(m.day) ?? []
      list.push(m)
      byDay.set(m.day, list)
    })
    return Array.from(byDay.entries()).map(([day, pts]) => ({
      day,
      color: DAY_COLORS[(day - 1) % DAY_COLORS.length],
      positions: pts.map((p) => [p.lat, p.lng] as [number, number]),
    }))
  }, [markers, showRoutes])

  const focusInMarkers = focus
    ? markers.some((m) => m.id === focus.id)
    : true

  return (
    <div className={`${styles.wrap} ${className ?? ''}`} style={{ height }}>
      <MapContainer
        center={[26.35, 127.8]}
        zoom={9}
        scrollWheelZoom={true}
        className={styles.map}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds markers={markers} />
        <FlyToFocus focus={focus} />
        {routes.map((r) =>
          r.positions.length >= 2 ? (
            <Polyline
              key={r.day}
              positions={r.positions}
              pathOptions={{ color: r.color, weight: 3, opacity: 0.7 }}
            />
          ) : null
        )}
        {markers.map((m, i) => {
          const color =
            m.day != null
              ? DAY_COLORS[(m.day - 1) % DAY_COLORS.length]
              : '#1a8fb4'
          const label = m.label ?? (m.day != null ? String(m.day) : String(i + 1))
          const isFocused = focus?.id === m.id
          return (
            <Marker
              key={`${m.id}-${m.day ?? ''}-${i}`}
              position={[m.lat, m.lng]}
              icon={isFocused ? createFocusIcon() : createIcon(color, label)}
              zIndexOffset={isFocused ? 1000 : 0}
              eventHandlers={{
                click: () => onMarkerClick?.(m.id),
              }}
            >
              <Popup>
                <strong>{m.name}</strong>
                {m.nameJa && <div style={{ fontSize: 12, color: '#666' }}>{m.nameJa}</div>}
                {m.day != null && <div style={{ fontSize: 12, marginTop: 4 }}>Day {m.day}</div>}
                {m.area && <div style={{ fontSize: 12 }}>📍 {m.area}</div>}
              </Popup>
            </Marker>
          )
        })}
        {focus && !focusInMarkers && (
          <Marker
            position={[focus.lat, focus.lng]}
            icon={createFocusIcon()}
            zIndexOffset={1000}
          >
            <Popup>
              <strong>{focus.name ?? focus.id}</strong>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}

export function attractionsToMarkers(
  list: Attraction[],
  day?: number
): MapMarker[] {
  return list.map((a, i) => ({
    id: a.id,
    name: a.name,
    nameJa: a.nameJa,
    lat: a.lat,
    lng: a.lng,
    area: a.area,
    day,
    label: day != null ? String(day) : String(i + 1),
  }))
}
