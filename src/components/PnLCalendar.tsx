import { formatCompactPnl, formatTightPnl } from "../lib"
import type { CalendarWeek, DayCell } from "../lib"

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]

// Seven flexible day columns plus a narrow week column that still fits a phone.
const GRID = "grid grid-cols-[repeat(7,minmax(0,1fr))_2.35rem] sm:grid-cols-8"

type Props = {
  weeks: CalendarWeek[]
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
  selected,
  today,
  onSelect,
}: {
  cell: DayCell
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
      aria-current={isToday ? "date" : undefined}
      className={`relative min-h-[3.5rem] cursor-pointer border-r border-b border-line px-0.5 py-1 text-left transition duration-200 hover:z-10 hover:brightness-[1.15] hover:shadow-[inset_0_0_22px_color-mix(in_srgb,var(--accent)_28%,transparent),0_0_18px_color-mix(in_srgb,var(--accent)_16%,transparent)] sm:min-h-[6.5rem] sm:p-2 ${tone(cell.pnl, cell.count)} ${
        cell.inMonth ? "" : "opacity-40"
      } ${isToday && !colored ? "bg-gold/[0.07]" : ""}`}
    >
      {isToday ? (
        <span className="pointer-events-none absolute inset-0 ring-1 ring-gold/45 ring-inset" />
      ) : null}
      {active ? (
        <span className="pointer-events-none absolute inset-0 bg-white/[0.05] shadow-[inset_0_0_26px_rgba(0,0,0,0.7),inset_0_0_10px_rgba(0,0,0,0.5)]" />
      ) : null}
      <span
        className={`absolute top-0.5 left-0.5 grid size-[17px] place-items-center rounded-full text-[10px] sm:top-1.5 sm:left-2 sm:size-5 sm:text-xs ${
          isToday
            ? "bg-gold font-semibold text-on-accent shadow-[0_0_10px_color-mix(in_srgb,var(--accent)_60%,transparent)]"
            : colored
              ? "text-white/85"
              : "text-muted"
        }`}
      >
        {cell.day}
      </span>
      {cell.count > 0 ? (
        <div className="flex h-full flex-col items-center justify-center pt-3.5 sm:pt-4">
          <p className="font-mono text-[9px] leading-tight font-semibold tabular-nums sm:text-sm md:text-base">
            {formatCompactPnl(cell.pnl)}
          </p>
          <p className={`mt-0.5 hidden text-[10px] sm:block sm:text-xs ${colored ? "text-white/80" : "text-faint"}`}>
            {cell.count} {cell.count === 1 ? "trade" : "trades"}
          </p>
          <p className={`mt-0.5 text-[9px] leading-none sm:hidden ${colored ? "text-white/75" : "text-faint"}`}>
            {cell.count}t
          </p>
        </div>
      ) : null}
    </button>
  )
}

export function PnLCalendar({ weeks, selected, today, onSelect }: Props) {
  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface/60">
        <div className={`${GRID} border-b border-line text-center text-[11px] text-muted sm:text-xs`}>
          {DAYS.map((day) => (
            <div key={day} className="border-r border-line py-2">
              {day}
            </div>
          ))}
          <div className="py-2">Wk</div>
        </div>

        {weeks.map((week, index) => (
          <div key={week.days[0].iso} className={GRID}>
            {week.days.map((cell) => (
              <DayButton
                key={cell.iso}
                cell={cell}
                selected={selected}
                today={today}
                onSelect={onSelect}
              />
            ))}
            <div
              className={`flex min-h-[3.5rem] flex-col items-center justify-center border-b border-line px-0.5 py-1 text-center sm:min-h-[6.5rem] sm:p-1 ${tone(week.pnl, week.count)}`}
            >
              <p className="text-[9px] leading-none sm:text-xs">
                <span className="sm:hidden">W{index + 1}</span>
                <span className="hidden sm:inline">Week {index + 1}</span>
              </p>
              {week.count > 0 ? (
                <>
                  <p className="mt-1 font-mono text-[9px] leading-none font-semibold tabular-nums sm:text-sm">
                    <span className="sm:hidden">{formatTightPnl(week.pnl)}</span>
                    <span className="hidden sm:inline">{formatCompactPnl(week.pnl)}</span>
                  </p>
                  <p className="mt-0.5 hidden text-[10px] opacity-80 sm:block sm:text-xs">
                    {week.count} {week.count === 1 ? "trade" : "trades"}
                  </p>
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
