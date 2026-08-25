import { formatMoney, type Stats } from "../lib"
import type { Settings } from "../types"

type Props = {
  stats: Stats
  settings: Settings
}

function Card({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone?: "profit" | "loss" | "neutral"
}) {
  const color =
    tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : "text-ink"

  return (
    <article className="rounded-2xl border border-line bg-white/[0.03] p-3.5 sm:p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-faint">{label}</p>
      <p className={`mt-2 font-mono text-[1.05rem] font-medium leading-tight tabular-nums sm:text-2xl ${color}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </article>
  )
}

export function Stats({ stats, settings }: Props) {
  const factor =
    stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card
        label="Net P&L"
        value={formatMoney(stats.net, settings.currency, true)}
        hint={stats.count ? `${stats.count} trades` : "No trades yet"}
        tone={stats.net > 0 ? "profit" : stats.net < 0 ? "loss" : "neutral"}
      />
      <Card
        label="Win rate"
        value={stats.count ? `${stats.winRate.toFixed(0)}%` : "—"}
        hint={
          stats.avgR != null
            ? `${stats.wins}W · ${stats.losses}L · ${stats.avgR.toFixed(2)}R`
            : `${stats.wins}W · ${stats.losses}L`
        }
      />
      <Card
        label="Avg win / loss"
        value={
          stats.count
            ? `${formatMoney(stats.avgWin, settings.currency)} / ${formatMoney(stats.avgLoss, settings.currency)}`
            : "—"
        }
        hint={`PF ${stats.count ? factor : "—"}`}
      />
      <Card
        label="Best / worst"
        value={
          stats.count
            ? `${formatMoney(stats.best, settings.currency, true)}`
            : "—"
        }
        hint={stats.count ? `Worst ${formatMoney(stats.worst, settings.currency, true)}` : "Log a trade"}
        tone={stats.best > 0 ? "profit" : "neutral"}
      />
    </section>
  )
}
