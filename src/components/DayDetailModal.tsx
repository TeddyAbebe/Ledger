import { useEffect } from "react"
import { formatCash, formatDate, signedPnl, summarizeDay } from "../lib"
import type { Settings, Trade } from "../types"
import { TradeDetailCard } from "./TradeDetailCard"

type Props = {
  date: string
  trades: Trade[]
  settings: Settings
  onClose: () => void
  onEdit: (id: string) => void
}

export function DayDetailModal({ date, trades, settings, onClose, onEdit }: Props) {
  const summary = summarizeDay(trades)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close day details"
        className="absolute inset-0 bg-black/65"
        onClick={onClose}
      />
      <section className="relative z-10 flex max-h-[88svh] w-full flex-col rounded-t-3xl border border-line bg-surface sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-faint">Day details</p>
            <h2 className="mt-1 font-display text-xl text-ink">{formatDate(date)}</h2>
            <p className="mt-1 text-sm text-muted">
              {summary.count} {summary.count === 1 ? "trade" : "trades"}
              <span className="px-1.5 text-faint">·</span>
              <span className={summary.pnl >= 0 ? "text-profit" : "text-loss"}>
                {formatCash(summary.pnl, settings.currency)}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full border border-line text-muted hover:text-ink"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {summary.trades.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No trades on this date.</p>
          ) : (
            <ul className="grid gap-3">
              {summary.trades.map((trade) => (
                <li key={trade.id}>
                  <TradeDetailCard
                    currency={settings.currency}
                    onClick={() => onEdit(trade.id)}
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
          )}
        </div>
      </section>
    </div>
  )
}
