import { formatMoney, formatPrice } from "../lib"
import { displaySymbol } from "../symbols"
import type { CloseReason } from "../types"

export type TradeCardModel = {
  symbol: string
  side: "buy" | "sell" | "long" | "short"
  pnl: number
  lotSize?: number
  openPrice?: number
  closePrice?: number
  closeReason?: CloseReason
  tpHit?: boolean
  slHit?: boolean
  kind?: "trade" | "day-total"
}

type Props = {
  trade: TradeCardModel
  currency: string
  onClick?: () => void
}

function Badge({ label, active, tone }: { label: string; active: boolean; tone: "tp" | "sl" }) {
  const on =
    tone === "tp"
      ? "border-profit bg-profit/20 text-profit"
      : "border-loss bg-loss/20 text-loss"
  return (
    <span
      className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${
        active ? on : "border-line bg-white/[0.04] text-faint"
      }`}
    >
      {label}
    </span>
  )
}

export function TradeDetailCard({ trade, currency, onClick }: Props) {
  const pnl = trade.pnl
  const up = pnl > 0
  const flat = pnl === 0
  const buy = trade.side === "buy" || trade.side === "long"
  const rawTp = Boolean(trade.tpHit) || trade.closeReason === "tp"
  const rawSl = Boolean(trade.slHit) || trade.closeReason === "sl"
  const tpHit = rawTp && !rawSl
  const slHit = rawSl && !rawTp
  const className = `w-full rounded-2xl border border-line bg-white/[0.03] p-3 text-left ${
    onClick ? "transition hover:bg-white/[0.05]" : ""
  }`

  const action = (
    <p className="mt-1 text-sm">
      {trade.kind === "day-total" ? (
        <span className="text-muted">Net for the day</span>
      ) : (
        <>
          <span className={buy ? "text-[#6ea8ff]" : "text-loss"}>
            {buy ? "Buy" : "Sell"}
            {trade.lotSize ? ` ${trade.lotSize} lot` : ""}
          </span>
          {trade.openPrice != null ? (
            <span className="text-muted">{` at ${formatPrice(trade.openPrice)}`}</span>
          ) : null}
        </>
      )}
    </p>
  )

  const body = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="font-medium tracking-wide text-ink">
            {trade.kind === "day-total" ? "Daily total" : displaySymbol(trade.symbol)}
          </p>
          {trade.kind !== "day-total" ? (
            <>
              <Badge label="TP" active={tpHit} tone="tp" />
              <Badge label="SL" active={slHit} tone="sl" />
            </>
          ) : null}
        </div>
        {action}
      </div>
      <div className="shrink-0 text-right">
        <p
          className={`font-mono text-base tabular-nums ${
            flat ? "text-profit" : up ? "text-profit" : "text-loss"
          }`}
        >
          {formatMoney(pnl, currency, true)}
        </p>
        {trade.kind !== "day-total" && trade.closePrice != null ? (
          <p className="mt-1 font-mono text-xs text-muted">{formatPrice(trade.closePrice)}</p>
        ) : null}
      </div>
    </div>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    )
  }

  return <div className={className}>{body}</div>
}
