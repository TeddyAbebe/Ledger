import { useEffect, useMemo, useRef, useState } from "react"
import { formatDate, formatPnl, signedPnl } from "../lib"
import type { ResultFilter, Trade } from "../types"
import { TradeDetailCard } from "./TradeDetailCard"

const DAYS_PER_PAGE = 5

type DayGroup = {
  date: string
  pnl: number
  trades: Trade[]
}

type Props = {
  trades: Trade[]
  query: string
  result: ResultFilter
  onQuery: (value: string) => void
  onResult: (value: ResultFilter) => void
}

function groupByDate(trades: Trade[]): DayGroup[] {
  const map = new Map<string, Trade[]>()
  for (const trade of trades) {
    const list = map.get(trade.date)
    if (list) list.push(trade)
    else map.set(trade.date, [trade])
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({
      date,
      trades: items,
      pnl: items.reduce((sum, trade) => sum + signedPnl(trade), 0),
    }))
}

// First and last page always stay reachable; the rest collapses into gaps.
function pageItems(current: number, total: number, span: number): (number | "gap")[] {
  const wanted = new Set([0, total - 1, current])
  for (let step = 1; step <= span; step++) {
    if (current - step >= 0) wanted.add(current - step)
    if (current + step < total) wanted.add(current + step)
  }

  const items: (number | "gap")[] = []
  let previous = -1
  for (const page of [...wanted].sort((a, b) => a - b)) {
    if (previous >= 0 && page - previous > 1) items.push("gap")
    items.push(page)
    previous = page
  }
  return items
}

function Arrow({ back }: { back?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
      <path
        d={back ? "M14 6l-6 6 6 6" : "M10 6l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Pager({
  current,
  total,
  span,
  className,
  onChange,
}: {
  current: number
  total: number
  span: number
  className: string
  onChange: (page: number) => void
}) {
  const step = "grid size-8 place-items-center rounded-lg text-sm transition sm:size-9"

  return (
    <nav aria-label="Trade pages" className={`items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={() => onChange(current - 1)}
        disabled={current === 0}
        aria-label="Previous page"
        className={`${step} border border-line text-muted hover:text-ink disabled:opacity-30 disabled:hover:text-muted`}
      >
        <Arrow back />
      </button>

      {pageItems(current, total, span).map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} className="grid size-6 place-items-center text-sm text-faint sm:size-9">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === current ? "page" : undefined}
            className={`${step} tabular-nums ${
              item === current
                ? "bg-gold font-semibold text-on-accent"
                : "text-muted hover:bg-white/[0.06] hover:text-ink"
            }`}
          >
            {item + 1}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onChange(current + 1)}
        disabled={current >= total - 1}
        aria-label="Next page"
        className={`${step} border border-line text-muted hover:text-ink disabled:opacity-30 disabled:hover:text-muted`}
      >
        <Arrow />
      </button>
    </nav>
  )
}

export function TradeList({ trades, query, result, onQuery, onResult }: Props) {
  const [page, setPage] = useState(0)
  const topRef = useRef<HTMLDivElement>(null)
  const groups = useMemo(() => groupByDate(trades), [trades])
  const pageCount = Math.max(1, Math.ceil(groups.length / DAYS_PER_PAGE))
  const current = Math.min(page, pageCount - 1)
  const from = current * DAYS_PER_PAGE
  const visible = groups.slice(from, from + DAYS_PER_PAGE)

  function goTo(next: number) {
    setPage(Math.min(pageCount - 1, Math.max(0, next)))
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  useEffect(() => {
    setPage(0)
  }, [query, result, trades.length])

  return (
    <section className="pb-28 sm:pb-8">
      <div ref={topRef} className="scroll-mt-24" />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-faint">Journal</p>
          <h2 className="mt-1 font-display text-xl text-ink sm:text-2xl">Trades</h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search symbol or notes"
            className="h-11 w-full rounded-xl border border-line bg-white/[0.04] px-3 text-sm text-ink outline-none placeholder:text-faint focus:border-gold/50 sm:w-56"
          />
          <div className="grid grid-cols-3 rounded-xl border border-line p-1 text-sm sm:min-w-[15.5rem]">
            {(["all", "win", "loss"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onResult(value)}
                className={`h-9 rounded-lg px-3 capitalize ${
                  result === value ? "bg-white/10 text-ink" : "text-muted"
                }`}
              >
                {value === "all" ? "All" : value === "win" ? "Wins" : "Losses"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-4 py-12 text-center text-sm text-muted">
          No trades match these filters.
        </div>
      ) : (
        <div className="grid gap-4">
          {visible.map((day) => (
            <section key={day.date} className="overflow-hidden rounded-2xl border border-line bg-white/[0.03]">
              <div className="flex items-baseline justify-between gap-3 border-b border-line px-3 py-3 sm:px-4">
                <p className="font-medium text-ink">{formatDate(day.date)}</p>
                <p
                  className={`font-mono text-sm tabular-nums ${
                    day.pnl > 0 ? "text-profit" : day.pnl < 0 ? "text-loss" : "text-muted"
                  }`}
                >
                  {formatPnl(day.pnl)}
                </p>
              </div>
              <ul className="grid gap-2 p-2 sm:p-3">
                {day.trades.map((trade) => (
                  <li key={trade.id}>
                    <TradeDetailCard
                      trade={{
                        symbol: trade.symbol,
                        side: trade.side,
                        pnl: signedPnl(trade),
                        lotSize: trade.lotSize,
                        openPrice: trade.openPrice,
                        closePrice: trade.closePrice,
                        closeReason: trade.closeReason,
                        kind: trade.kind,
                      }}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {pageCount > 1 ? (
            <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-between">
              <p className="text-xs text-muted">
                Days {from + 1}–{Math.min(from + DAYS_PER_PAGE, groups.length)} of {groups.length}
              </p>
              <Pager current={current} total={pageCount} span={1} onChange={goTo} className="flex sm:hidden" />
              <Pager
                current={current}
                total={pageCount}
                span={2}
                onChange={goTo}
                className="hidden sm:flex"
              />
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
