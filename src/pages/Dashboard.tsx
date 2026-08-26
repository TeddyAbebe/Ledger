import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { DayDetailModal } from "../components/DayDetailModal"
import { PnLCalendar } from "../components/PnLCalendar"
import { useJournal } from "../context"
import {
  buildMonth,
  formatCash,
  formatMonthLabel,
  monthCount,
  monthPnl,
  todayIso,
  tradesOnDate,
} from "../lib"

export function DashboardPage() {
  const { trades, settings, clearDay } = useJournal()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const weeks = useMemo(() => buildMonth(year, month, trades), [year, month, trades])
  const net = monthPnl(year, month, trades)
  const count = monthCount(year, month, trades)
  const today = todayIso()
  const selectedTrades = selected ? tradesOnDate(trades, selected) : []

  function shift(delta: number) {
    const next = new Date(year, month + delta, 1)
    setYear(next.getFullYear())
    setMonth(next.getMonth())
    setSelected(null)
    setOpen(false)
  }

  function goToday() {
    const d = new Date()
    setYear(d.getFullYear())
    setMonth(d.getMonth())
    setSelected(todayIso())
    setOpen(true)
  }

  return (
    <div className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-8">
      <div className="rounded-2xl border border-line bg-surface/50 px-3 py-3.5 sm:px-4">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shift(-1)}
              className="grid size-9 place-items-center rounded-full border border-line text-muted transition hover:border-gold/40 hover:text-ink"
              aria-label="Previous month"
            >
              ‹
            </button>
            <p className="hidden min-w-[7.5rem] text-center text-sm font-medium text-ink sm:block sm:text-base">
              {formatMonthLabel(year, month)}
            </p>
            <button
              type="button"
              onClick={() => shift(1)}
              className="grid size-9 place-items-center rounded-full border border-line text-muted transition hover:border-gold/40 hover:text-ink sm:ml-1"
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className="min-w-0 text-center">
            <p className="text-[11px] tracking-[0.14em] text-faint uppercase sm:hidden">
              {formatMonthLabel(year, month)}
            </p>
            <p
              className={`font-display text-[1.65rem] leading-none tracking-tight sm:text-3xl ${
                net >= 0 ? "text-profit" : "text-loss"
              }`}
            >
              {formatCash(net, settings.currency)}
            </p>
            <p className="mt-1.5 text-[11px] tracking-[0.12em] text-faint uppercase">
              Monthly P/L
              {count > 0 ? (
                <>
                  <span className="mx-1.5 opacity-40">·</span>
                  {count} {count === 1 ? "trade" : "trades"}
                </>
              ) : null}
            </p>
          </div>

          <button
            type="button"
            onClick={goToday}
            className="h-9 shrink-0 rounded-full border border-line px-3.5 text-sm text-muted transition hover:border-gold/40 hover:text-ink"
          >
            Today
          </button>
        </div>
      </div>

      <div className="mt-4">
        <PnLCalendar
          weeks={weeks}
          selected={selected}
          today={today}
          onSelect={(iso) => {
            setSelected(iso)
            setOpen(true)
          }}
        />
      </div>

      {trades.length === 0 ? (
        <section className="mt-6 rounded-3xl border border-line bg-surface/70 px-5 py-10 text-center">
          <p className="font-display text-2xl text-ink">No P&L this month yet.</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Upload an Exness history screenshot to pull in each trade, or log one by hand. Green days
            are net wins, red days are net losses.
          </p>
          <div className="mt-5 flex justify-center">
            <Link
              to="/log"
              className="grid h-12 w-full max-w-xs place-items-center rounded-full bg-gold px-6 text-sm font-semibold text-on-accent sm:w-auto"
            >
              Scan screenshot
            </Link>
          </div>
        </section>
      ) : null}

      {open && selected ? (
        <DayDetailModal
          date={selected}
          trades={selectedTrades}
          onClose={() => setOpen(false)}
          onClearDay={() => {
            clearDay(selected)
            setOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}
