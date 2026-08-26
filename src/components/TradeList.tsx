import { useEffect, useMemo, useState } from "react"
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

export function TradeList({ trades, query, result, onQuery, onResult }: Props) {
  const [page, setPage] = useState(0)
  const groups = useMemo(() => groupByDate(trades), [trades])
  const pageCount = Math.max(1, Math.ceil(groups.length / DAYS_PER_PAGE))
  const current = Math.min(page, pageCount - 1)
  const visible = groups.slice(current * DAYS_PER_PAGE, current * DAYS_PER_PAGE + DAYS_PER_PAGE)

  useEffect(() => {
    setPage(0)
  }, [query, result, trades.length])

  return (
    <section className="pb-28 sm:pb-8">
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
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(0, value - 1))}
                disabled={current === 0}
                className="h-10 rounded-full border border-line px-4 text-sm text-muted disabled:opacity-30 hover:text-ink"
              >
                Previous
              </button>
              <p className="text-sm text-muted">
                {current + 1} / {pageCount}
              </p>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
                disabled={current >= pageCount - 1}
                className="h-10 rounded-full border border-line px-4 text-sm text-muted disabled:opacity-30 hover:text-ink"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
