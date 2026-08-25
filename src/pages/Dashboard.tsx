import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
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
  const { trades, settings } = useJournal()
  const navigate = useNavigate()
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-2 sm:justify-start">
          <button
            type="button"
            onClick={() => shift(-1)}
            className="grid size-9 place-items-center rounded-full border border-line text-muted hover:text-ink"
            aria-label="Previous month"
          >
            ‹
          </button>
          <p className="min-w-[7.5rem] text-center font-medium text-ink">{formatMonthLabel(year, month)}</p>
          <button
            type="button"
            onClick={() => shift(1)}
            className="grid size-9 place-items-center rounded-full border border-line text-muted hover:text-ink"
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <h1 className="text-center font-display text-xl text-ink sm:text-2xl">
          Monthly P/L:{" "}
          <span className={net >= 0 ? "text-profit" : "text-loss"}>{formatCash(net, settings.currency)}</span>
        </h1>

        <button
          type="button"
          onClick={goToday}
          className="h-10 rounded-full border border-line px-4 text-sm text-muted hover:text-ink sm:justify-self-end"
        >
          Today
        </button>
      </div>

      <p className="mt-4 text-center text-sm text-muted">
        {count} {count === 1 ? "trade" : "trades"} this month · tap a day for lots, prices, and TP/SL
      </p>

      <div className="mt-4 overflow-x-auto pb-2">
        <div className="min-w-[52rem] md:min-w-0">
          <PnLCalendar
            weeks={weeks}
            currency={settings.currency}
            selected={selected}
            today={today}
            onSelect={(iso) => {
              setSelected(iso)
              setOpen(true)
            }}
          />
        </div>
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
          settings={settings}
          onClose={() => setOpen(false)}
          onEdit={(id) => navigate(`/log/${id}`)}
        />
      ) : null}
    </div>
  )
}
