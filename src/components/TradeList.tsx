import { formatDate, formatMoney, signedPnl } from "../lib"
import { displaySymbol } from "../symbols"
import type { ResultFilter, Settings, Trade } from "../types"

type Props = {
  trades: Trade[]
  settings: Settings
  query: string
  result: ResultFilter
  onQuery: (value: string) => void
  onResult: (value: ResultFilter) => void
  onEdit: (trade: Trade) => void
}

export function TradeList({
  trades,
  settings,
  query,
  result,
  onQuery,
  onResult,
  onEdit,
}: Props) {
  return (
    <section className="pb-28 sm:pb-8">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-faint">Journal</p>
          <h2 className="mt-1 font-display text-xl text-ink sm:text-2xl">Trades</h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search symbol or notes"
            className="h-11 w-full rounded-xl border border-line bg-white/[0.04] px-3 text-sm text-ink outline-none placeholder:text-faint focus:border-gold/50 sm:w-56"
          />
          <div className="grid grid-cols-3 rounded-xl border border-line p-1 text-sm">
            {(["all", "win", "loss"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onResult(value)}
                className={`h-9 rounded-lg capitalize ${
                  result === value ? "bg-white/10 text-ink" : "text-muted"
                }`}
              >
                {value === "all" ? "All" : value === "win" ? "Wins" : "Losses"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {trades.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-4 py-12 text-center text-sm text-muted">
          No trades match these filters.
        </div>
      ) : (
        <>
          <div className="mb-2 hidden grid-cols-[1.1fr_1fr_0.7fr_0.9fr_1fr] px-4 text-[11px] uppercase tracking-[0.14em] text-faint md:grid">
            <span>Date</span>
            <span>Symbol</span>
            <span>Side</span>
            <span>Result</span>
            <span className="text-right">P&L</span>
          </div>
          <ul className="grid gap-3">
            {trades.map((trade) => {
              const pnl = signedPnl(trade)
              const up = pnl >= 0
              return (
                <li key={trade.id}>
                  <button
                    type="button"
                    onClick={() => onEdit(trade)}
                    className="flex w-full gap-3 rounded-2xl border border-line bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.05] active:scale-[0.99]"
                  >
                    {trade.imageUrl ? (
                      <img src={trade.imageUrl} alt="" className="size-14 shrink-0 rounded-xl object-cover md:hidden" />
                    ) : null}
                    <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3 md:hidden">
                      <div>
                        <p className="font-medium tracking-wide text-ink">
                          {trade.kind === "day-total" ? "Daily total" : displaySymbol(trade.symbol)}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {formatDate(trade.date)}
                          {trade.kind === "day-total"
                            ? " · From screenshot"
                            : ` · ${trade.side} · ${trade.result}`}
                          {trade.lotSize ? ` · ${trade.lotSize} lot` : ""}
                          {trade.closeReason === "tp"
                            ? " · TP"
                            : trade.closeReason === "sl"
                              ? " · SL"
                              : trade.closeReason === "manual"
                                ? " · Manual"
                                : ""}
                        </p>
                      </div>
                      <p className={`font-mono text-base tabular-nums ${up ? "text-profit" : "text-loss"}`}>
                        {formatMoney(pnl, settings.currency, true)}
                      </p>
                    </div>

                    <div className="hidden grid-cols-[1.1fr_1fr_0.7fr_0.9fr_1fr] items-center gap-3 md:grid">
                      <p className="text-sm text-muted">{formatDate(trade.date)}</p>
                      <p className="font-medium tracking-wide">
                        {trade.kind === "day-total" ? "Daily total" : displaySymbol(trade.symbol)}
                      </p>
                      <p className="capitalize text-muted">
                        {trade.kind === "day-total" ? "—" : trade.side}
                      </p>
                      <p className="capitalize text-muted">
                        {trade.kind === "day-total" ? "Day" : trade.result}
                      </p>
                      <p className={`text-right font-mono tabular-nums ${up ? "text-profit" : "text-loss"}`}>
                        {formatMoney(pnl, settings.currency, true)}
                      </p>
                    </div>

                    {trade.notes ? (
                      <p className="mt-3 line-clamp-2 text-sm text-muted md:mt-2">{trade.notes}</p>
                    ) : null}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
