import { useEffect, useState } from "react"
import { formatDate, formatPnl, signedPnl, summarizeDay } from "../lib"
import type { Trade } from "../types"
import { TradeDetailCard } from "./TradeDetailCard"

type Props = {
  date: string
  trades: Trade[]
  onClose: () => void
  onClearDay: () => void
}

export function DayDetailModal({ date, trades, onClose, onClearDay }: Props) {
  const summary = summarizeDay(trades)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (confirming) setConfirming(false)
      else onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [onClose, confirming])

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
                {formatPnl(summary.pnl)}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {summary.trades.length > 0 ? (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="grid size-9 place-items-center rounded-full border border-line text-muted transition hover:border-loss/40 hover:text-loss"
                aria-label="Clear this day"
                title="Clear this day"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
                  <path
                    d="M5 7h14M10 7V5.8A1.8 1.8 0 0 1 11.8 4h.4A1.8 1.8 0 0 1 14 5.8V7M8.5 7l.6 12.2A1.5 1.5 0 0 0 10.6 21h2.8a1.5 1.5 0 0 0 1.5-1.8L15.5 7"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-full border border-line text-muted hover:text-ink"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {summary.trades.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No trades on this date.</p>
          ) : (
            <ul className="grid gap-3">
              {summary.trades.map((trade) => (
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
          )}
        </div>

        {confirming ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-t-3xl bg-black/55 p-4 backdrop-blur-sm sm:rounded-3xl">
            <div className="w-full max-w-xs rounded-2xl border border-line bg-surface p-5 text-center shadow-2xl">
              <div className="mx-auto grid size-11 place-items-center rounded-full bg-loss/12 text-loss">
                <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
                  <path
                    d="M5 7h14M10 7V5.8A1.8 1.8 0 0 1 11.8 4h.4A1.8 1.8 0 0 1 14 5.8V7M8.5 7l.6 12.2A1.5 1.5 0 0 0 10.6 21h2.8a1.5 1.5 0 0 0 1.5-1.8L15.5 7"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="mt-3 font-display text-lg text-ink">Clear this day?</p>
              <p className="mt-1.5 text-sm text-muted">
                {summary.count} {summary.count === 1 ? "trade" : "trades"} on {formatDate(date)} will
                be removed. This can't be undone.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="h-11 rounded-xl border border-line text-sm text-muted transition hover:bg-white/[0.04] hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onClearDay}
                  className="h-11 rounded-xl bg-loss text-sm font-semibold text-white transition hover:brightness-110"
                >
                  Clear day
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
