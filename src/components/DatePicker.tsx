import { useMemo } from "react"
import { formatMonthLabel, toIsoDate } from "../lib"

type Props = {
  value: string
  onChange: (iso: string) => void
}

export function DatePicker({ value, onChange }: Props) {
  const selected = useMemo(() => {
    const [y, m, d] = value.split("-").map(Number)
    return new Date(y, m - 1, d)
  }, [value])

  const year = selected.getFullYear()
  const month = selected.getMonth()
  const today = toIsoDate(new Date())

  const cells = useMemo(() => {
    const first = new Date(year, month, 1)
    const offset = (first.getDay() + 6) % 7
    const cursor = new Date(year, month, 1 - offset)
    const days = []
    for (let i = 0; i < 42; i++) {
      days.push({
        iso: toIsoDate(cursor),
        day: cursor.getDate(),
        inMonth: cursor.getMonth() === month,
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    return days
  }, [year, month])

  function shift(delta: number) {
    const next = new Date(year, month + delta, Math.min(selected.getDate(), 28))
    onChange(toIsoDate(next))
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => shift(-1)}
          className="grid size-9 place-items-center rounded-full border border-line text-muted hover:text-ink"
          aria-label="Previous month"
        >
          ‹
        </button>
        <p className="font-medium text-ink">{formatMonthLabel(year, month)}</p>
        <button
          type="button"
          onClick={() => shift(1)}
          className="grid size-9 place-items-center rounded-full border border-line text-muted hover:text-ink"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[11px] text-faint">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const isSelected = cell.iso === value
          const isToday = cell.iso === today
          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => onChange(cell.iso)}
              className={`h-9 rounded-lg text-sm tabular-nums ${
                isSelected
                  ? "bg-gold text-on-accent"
                  : isToday
                    ? "border border-gold/50 text-ink"
                    : cell.inMonth
                      ? "text-ink hover:bg-white/5"
                      : "text-faint hover:bg-white/5"
              }`}
            >
              {cell.day}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => onChange(today)}
        className="mt-3 h-10 w-full rounded-xl border border-line text-sm text-muted hover:text-ink"
      >
        Jump to today
      </button>
    </div>
  )
}
