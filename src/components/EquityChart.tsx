import { useMemo, useState } from "react"
import { equityPoints, formatDate, formatMoney } from "../lib"
import type { Settings, Trade } from "../types"

type Props = {
  trades: Trade[]
  settings: Settings
}

export function EquityChart({ trades, settings }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const points = useMemo(() => equityPoints(trades), [trades])

  const width = 720
  const height = 220
  const pad = { t: 18, r: 16, b: 28, l: 16 }
  const innerW = width - pad.l - pad.r
  const innerH = height - pad.t - pad.b

  const values = points.map((p) => p.equity)
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  const span = max - min || 1

  const coords = points.map((p, i) => {
    const x = pad.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
    const y = pad.t + ((max - p.equity) / span) * innerH
    return { x, y, ...p }
  })

  const zeroY = pad.t + ((max - 0) / span) * innerH
  const active = hover !== null ? coords[hover] : coords.at(-1)
  const line = coords.map((c) => `${c.x},${c.y}`).join(" ")
  const area = coords.length
    ? `M ${coords[0].x} ${zeroY} L ${line.replaceAll(" ", " L ")} L ${coords.at(-1)!.x} ${zeroY} Z`
    : ""
  const up = (active?.equity ?? 0) >= 0

  return (
    <section className="rounded-2xl border border-line bg-white/[0.03] p-4 sm:p-5">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-faint">Equity curve</p>
          <p className="mt-1 font-display text-lg text-ink sm:text-xl">Cumulative P&L</p>
        </div>
        {active ? (
          <div className="text-right">
            <p className={`font-mono text-sm tabular-nums sm:text-base ${up ? "text-profit" : "text-loss"}`}>
              {formatMoney(active.equity, settings.currency, true)}
            </p>
            <p className="text-xs text-muted">{formatDate(active.date)}</p>
          </div>
        ) : (
          <p className="text-sm text-muted">No data yet</p>
        )}
      </div>

      {coords.length < 2 ? (
        <div className="grid h-40 place-items-center rounded-xl border border-dashed border-line text-sm text-muted">
          Log at least two trades to see the curve.
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-40 w-full sm:h-52"
          role="img"
          aria-label="Equity curve"
          onMouseLeave={() => setHover(null)}
        >
          <line
            x1={pad.l}
            x2={width - pad.r}
            y1={zeroY}
            y2={zeroY}
            stroke="rgb(255 255 255 / 0.12)"
            strokeDasharray="4 6"
          />
          <defs>
            <linearGradient id="eq" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={up ? "#2ee59d" : "#ff5d73"} stopOpacity="0.28" />
              <stop offset="100%" stopColor={up ? "#2ee59d" : "#ff5d73"} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#eq)" />
          <polyline
            points={line}
            fill="none"
            stroke={up ? "#2ee59d" : "#ff5d73"}
            strokeWidth="2.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {coords.map((c, i) => (
            <g key={c.id}>
              <rect
                x={c.x - innerW / coords.length / 2}
                y={0}
                width={innerW / coords.length}
                height={height}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
              />
              <circle
                cx={c.x}
                cy={c.y}
                r={hover === i ? 5 : 0}
                fill="var(--bg)"
                stroke={c.equity >= 0 ? "#2ee59d" : "#ff5d73"}
                strokeWidth="2"
              />
            </g>
          ))}
        </svg>
      )}
    </section>
  )
}
