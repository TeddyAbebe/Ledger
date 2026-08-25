import { formatCash } from "../lib"
import type { CalendarWeek, DayCell } from "../lib"

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]

type Props = {
  weeks: CalendarWeek[]
  currency: string
  selected?: string | null
  today: string
  onSelect: (iso: string) => void
}

function tone(pnl: number, count: number) {
  if (count === 0 || pnl === 0) return "bg-transparent text-ink"
  if (pnl > 0) return "bg-day-win text-white"
  return "bg-day-loss text-white"
}

function DayButton({
  cell,
  currency,
  selected,
  today,
  onSelect,
}: {
  cell: DayCell
  currency: string
  selected?: string | null
  today: string
  onSelect: (iso: string) => void
}) {
  const active = cell.iso === selected
  const isToday = cell.iso === today
  const colored = cell.count > 0 && cell.pnl !== 0

  return (
    <button
      type="button"
      onClick={() => onSelect(cell.iso)}
      className={`relative min-h-[4.6rem] border-r border-b border-line p-1.5 text-left transition sm:min-h-[6.5rem] sm:p-2 ${tone(cell.pnl, cell.count)} ${
        cell.inMonth ? "" : "opacity-40"
      } ${active ? "ring-2 ring-gold ring-inset" : ""} ${
        isToday && !colored ? "bg-white/[0.04]" : ""
      }`}
    >
      <span className={`absolute top-1 left-1.5 text-[11px] sm:top-1.5 sm:left-2 sm:text-xs ${colored ? "text-white/85" : "text-muted"}`}>
        {cell.day}
      </span>
      {cell.count > 0 ? (
        <div className="flex h-full flex-col items-center justify-center pt-3 sm:pt-4">
          <p className="font-mono text-[11px] font-semibold tabular-nums sm:text-sm md:text-base">
            {formatCash(cell.pnl, currency)}
          </p>
          <p className={`mt-0.5 text-[10px] sm:text-xs ${colored ? "text-white/80" : "text-faint"}`}>
            {cell.count} {cell.count === 1 ? "trade" : "trades"}
          </p>
        </div>
      ) : null}
    </button>
  )
}

export function PnLCalendar({ weeks, currency, selected, today, onSelect }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface/60">
      <div className="grid grid-cols-8 border-b border-line text-center text-[11px] text-muted sm:text-xs">
        {DAYS.map((day) => (
          <div key={day} className="border-r border-line py-2">
            {day}
          </div>
        ))}
        <div className="py-2">Wk</div>
      </div>

      {weeks.map((week, index) => (
        <div key={week.days[0].iso} className="grid grid-cols-8">
          {week.days.map((cell) => (
            <DayButton
              key={cell.iso}
              cell={cell}
              currency={currency}
              selected={selected}
              today={today}
              onSelect={onSelect}
            />
          ))}
          <div
            className={`flex min-h-[4.6rem] flex-col items-center justify-center border-b border-line p-1 text-center sm:min-h-[6.5rem] ${tone(week.pnl, week.count)}`}
          >
            <p className="text-[10px] sm:text-xs">Week {index + 1}</p>
            {week.count > 0 ? (
              <>
                <p className="mt-1 font-mono text-[10px] font-semibold tabular-nums sm:text-sm">
                  {formatCash(week.pnl, currency)}
                </p>
                <p className="mt-0.5 text-[10px] opacity-80 sm:text-xs">
                  {week.count} {week.count === 1 ? "trade" : "trades"}
                </p>
              </>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
