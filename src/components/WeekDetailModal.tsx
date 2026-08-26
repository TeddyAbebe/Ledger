import { useEffect } from "react"
import { formatDayShort, formatPnl, formatWeekdayShort } from "../lib"
import type { CalendarWeek } from "../lib"

type Props = {
  week: CalendarWeek
  index: number
  onClose: () => void
  onSelectDay: (iso: string) => void
}

export function WeekDetailModal({ week, index, onClose, onSelectDay }: Props) {
  const days = week.days.filter((day) => day.inMonth)
  const traded = days.filter((day) => day.count > 0)
  const wins = traded.filter((day) => day.pnl > 0).length
  const losses = traded.filter((day) => day.pnl < 0).length

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
        aria-label="Close week summary"
        className="absolute inset-0 bg-black/65"
        onClick={onClose}
      />
      <section className="relative z-10 flex max-h-[88svh] w-full flex-col rounded-t-3xl border border-line bg-surface sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.16em] text-faint uppercase">Week summary</p>
            <h2 className="mt-1 font-display text-xl text-ink">Week {index + 1}</h2>
            {days.length ? (
              <p className="mt-1 text-sm text-muted">
                {formatDayShort(days[0].iso)} – {formatDayShort(days[days.length - 1].iso)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-muted hover:text-ink"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="border-b border-line px-4 py-4 sm:px-5">
          <p className="text-[11px] tracking-[0.16em] text-faint uppercase">Week total</p>
          <p
            className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${
              week.pnl >= 0 ? "text-profit" : "text-loss"
            }`}
          >
            {formatPnl(week.pnl)}
          </p>
          <p className="mt-1.5 text-sm text-muted">
            {week.count} {week.count === 1 ? "trade" : "trades"}
            <span className="px-1.5 text-faint">·</span>
            {traded.length} {traded.length === 1 ? "day" : "days"} traded
            <span className="px-1.5 text-faint">·</span>
            <span className="text-profit">{wins} up</span>
            <span className="px-1.5 text-faint">/</span>
            <span className="text-loss">{losses} down</span>
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <ul className="grid gap-2">
            {days.map((day) => (
              <li key={day.iso}>
                <button
                  type="button"
                  disabled={day.count === 0}
                  onClick={() => onSelectDay(day.iso)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 text-left transition hover:bg-white/[0.04] disabled:cursor-default disabled:opacity-45 disabled:hover:bg-transparent"
                >
                  <span className="min-w-0">
                    <span className="block text-sm text-ink">
                      {formatWeekdayShort(day.iso)}, {formatDayShort(day.iso)}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {day.count ? `${day.count} ${day.count === 1 ? "trade" : "trades"}` : "No trades"}
                    </span>
                  </span>
                  {day.count ? (
                    <span
                      className={`shrink-0 font-mono text-sm font-semibold tabular-nums ${
                        day.pnl >= 0 ? "text-profit" : "text-loss"
                      }`}
                    >
                      {formatPnl(day.pnl)}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
