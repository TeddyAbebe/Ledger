import type { CloseReason, Trade } from "../types"
import rawHistory from "./exnessHistory.json?raw"

type HistoryRow = {
  ticket?: string
  closing_time_utc?: string
  type?: string
  lots?: string
  symbol?: string
  opening_price?: string
  closing_price?: string
  stop_loss?: string
  take_profit?: string
  profit?: string
}

function number(value: string | undefined) {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function hitsTarget(closePrice: number | undefined, target: number | undefined) {
  if (closePrice === undefined || target === undefined) return false
  return Math.abs(closePrice - target) <= Math.max(1e-8, Math.abs(target) * 1e-9)
}

function closeReason(row: HistoryRow, closePrice: number | undefined): CloseReason {
  if (hitsTarget(closePrice, number(row.take_profit))) return "tp"
  if (hitsTarget(closePrice, number(row.stop_loss))) return "sl"
  return "manual"
}

function toTrade(row: HistoryRow): Trade | null {
  const ticket = row.ticket?.trim()
  const closedAt = row.closing_time_utc?.trim()
  const symbol = row.symbol?.trim().toUpperCase()
  const side = row.type?.trim().toLowerCase()
  if (!ticket || !closedAt || !symbol || (side !== "buy" && side !== "sell")) return null

  const closedOn = new Date(`${closedAt}Z`)
  if (Number.isNaN(closedOn.getTime())) return null

  const pnl = number(row.profit) ?? 0
  const closePrice = number(row.closing_price)

  return {
    // Partial closes reuse a ticket, so the close time keeps each row distinct.
    id: `exness-${ticket}-${closedAt}`,
    date: closedAt.slice(0, 10),
    symbol,
    side: side === "sell" ? "short" : "long",
    result: pnl < 0 ? "loss" : "win",
    amount: Math.abs(pnl),
    lotSize: number(row.lots),
    openPrice: number(row.opening_price),
    closePrice,
    closeReason: closeReason(row, closePrice),
    kind: "trade",
    createdAt: closedOn.toISOString(),
  }
}

export function historyTrades(): Trade[] {
  try {
    const rows = JSON.parse(rawHistory) as HistoryRow[]
    if (!Array.isArray(rows)) return []
    return rows.map(toTrade).filter((trade): trade is Trade => trade !== null)
  } catch {
    return []
  }
}
