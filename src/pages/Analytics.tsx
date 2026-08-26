import { useMemo, useState } from "react"
import { EquityChart } from "../components/EquityChart"
import { Stats } from "../components/Stats"
import { TradeList } from "../components/TradeList"
import { useJournal } from "../context"
import { computeStats, filterByPeriod } from "../lib"
import type { Period, ResultFilter } from "../types"

function sortTrades<T extends { date: string; createdAt: string }>(trades: T[]) {
  return [...trades].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date)
    return byDate !== 0 ? byDate : b.createdAt.localeCompare(a.createdAt)
  })
}

export function AnalyticsPage() {
  const { trades, settings } = useJournal()
  const [period, setPeriod] = useState<Period>("all")
  const [query, setQuery] = useState("")
  const [result, setResult] = useState<ResultFilter>("all")

  const periodTrades = useMemo(() => filterByPeriod(trades, period), [trades, period])
  const stats = useMemo(() => computeStats(periodTrades), [periodTrades])
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sortTrades(periodTrades).filter((t) => {
      if (result !== "all" && t.result !== result) return false
      if (!q) return true
      return (
        t.symbol.toLowerCase().includes(q) ||
        (t.kind === "day-total" && "daily total".includes(q)) ||
        (t.closeReason ?? "").includes(q) ||
        (t.notes ?? "").toLowerCase().includes(q)
      )
    })
  }, [periodTrades, query, result])

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-gold">Analytics</p>
          <h1 className="mt-1 font-display text-[clamp(1.8rem,6vw,3rem)] leading-[1.1] text-ink">
            Performance
          </h1>
        </div>
        <div className="grid w-full grid-cols-4 gap-1 rounded-full border border-line p-1 sm:flex sm:w-auto">
          {(
            [
              ["all", "All time"],
              ["week", "This week"],
              ["month", "This month"],
              ["year", "This year"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              className={`rounded-full px-1 py-1.5 text-[11px] whitespace-nowrap sm:px-3 sm:text-sm ${
                period === value ? "bg-white/10 text-ink" : "text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        <Stats stats={stats} settings={settings} />
        <EquityChart trades={periodTrades} settings={settings} />
      </div>

      <div className="mt-8">
        <TradeList
          key={period}
          trades={visible}
          query={query}
          result={result}
          onQuery={setQuery}
          onResult={setResult}
        />
      </div>
    </div>
  )
}
