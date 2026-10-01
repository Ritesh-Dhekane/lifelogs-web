// A calm line + area chart for one series over time. Drawn with plain SVG; the colour comes
// from `currentColor`, so wrap it in the log's text colour. Tap or hover to read a point.

import { useId, useMemo, useState, type PointerEvent } from 'react'

export interface TrendPoint {
  t: number // ms
  v: number
  label: string // shown when the point is picked, e.g. "Oct 24 · 73.4 kg"
}

const W = 340
const H = 150
const PAD = { top: 12, right: 44, bottom: 22, left: 4 }

export function TrendChart({
  points,
  formatValue,
  formatDate,
  goal,
  ariaLabel,
}: {
  points: TrendPoint[]
  formatValue: (value: number) => string
  formatDate: (t: number) => string
  goal?: number | null
  ariaLabel: string
}) {
  const gradientId = useId()
  const [picked, setPicked] = useState<number | null>(null)

  const layout = useMemo(() => {
    const values = points.map((p) => p.v).concat(goal != null ? [goal] : [])
    let min = Math.min(...values)
    let max = Math.max(...values)
    if (max - min < 1) {
      min -= 0.5
      max += 0.5
    }
    const span = max - min
    min -= span * 0.12
    max += span * 0.12
    const t0 = points[0]?.t ?? 0
    const t1 = points.at(-1)?.t ?? 1
    const x = (t: number) =>
      PAD.left + (t1 === t0 ? 0.5 : (t - t0) / (t1 - t0)) * (W - PAD.left - PAD.right)
    const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * (H - PAD.top - PAD.bottom)
    return { min, max, x, y }
  }, [points, goal])

  if (points.length === 0) return null

  const coords = points.map((p) => [layout.x(p.t), layout.y(p.v)] as const)
  const line = coords
    .map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
  const area = `${line} L${coords.at(-1)![0]},${H - PAD.bottom} L${coords[0]![0]},${H - PAD.bottom} Z`
  const ticks = [layout.max, (layout.max + layout.min) / 2, layout.min]
  const active = picked ?? points.length - 1
  const [ax, ay] = coords[active]!

  function pick(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const px = ((event.clientX - rect.left) / rect.width) * W
    let best = 0
    coords.forEach(([x], i) => {
      if (Math.abs(x - px) < Math.abs(coords[best]![0] - px)) best = i
    })
    setPicked(best)
  }

  return (
    <figure className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-pan-y overflow-visible"
        role="img"
        aria-label={ariaLabel}
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={() => setPicked(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={layout.y(tick)}
              y2={layout.y(tick)}
              className="stroke-line"
              strokeDasharray="3 4"
            />
            <text
              x={W - PAD.right + 6}
              y={layout.y(tick) + 4}
              className="fill-ink-3 text-[10px] tnum"
            >
              {formatValue(tick)}
            </text>
          </g>
        ))}
        {goal != null && (
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={layout.y(goal)}
            y2={layout.y(goal)}
            className="stroke-ink-3"
            strokeDasharray="6 4"
            strokeWidth={1}
          />
        )}
        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={ax}
          x2={ax}
          y1={PAD.top}
          y2={H - PAD.bottom}
          className="stroke-ink-3"
          strokeOpacity={picked == null ? 0 : 0.4}
        />
        <circle
          cx={ax}
          cy={ay}
          r={4.5}
          className="fill-card"
          stroke="currentColor"
          strokeWidth={2.2}
        />
        <text x={PAD.left} y={H - 4} className="fill-ink-3 text-[10px]">
          {formatDate(points[0]!.t)}
        </text>
        <text x={W - PAD.right} y={H - 4} textAnchor="end" className="fill-ink-3 text-[10px]">
          {formatDate(points.at(-1)!.t)}
        </text>
      </svg>
      <figcaption
        className="pointer-events-none absolute top-0 rounded-full bg-primary px-2.5 py-1 text-label whitespace-nowrap text-on-primary tnum shadow-float"
        style={{
          left: `${Math.min(Math.max((ax / W) * 100, 18), 72)}%`,
          transform: 'translate(-50%, -60%)',
        }}
        aria-live="polite"
      >
        {points[active]!.label}
      </figcaption>
    </figure>
  )
}
