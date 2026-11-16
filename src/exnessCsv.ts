import csvText from "./data/exness-history.csv?raw"
import { saveRevision } from "./cloudSync"
import { saveTrades } from "./lib"
import type { CloseReason, Side, Trade } from "./types"

/** Bump when the embedded CSV changes so devices re-apply it. */
export const EXNESS_CSV_SEED_VERSION = "2025-10-29_2026-11-16"

const SEED_KEY = "ledger.exnessCsvSeed.v1"
const FORCE_PUSH_KEY = "ledger.forceCloudPush.v1"

function mapSide(type: string): Side {
  return type.trim().toLowerCase() === "sell" ? "short" : "long"
}

function mapCloseReason(raw: string): CloseReason | undefined {
  const value = raw.trim().toLowerCase()
  if (value === "tp") return "tp"
  if (value === "sl" || value === "so") return "sl"
  if (value === "user" || value === "manual") return "manual"
  return undefined
}

function num(raw: string): number | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : undefined
}

function tradeFingerprint(trade: Pick<Trade, "date" | "symbol" | "side" | "amount" | "lotSize">) {
  return [
    trade.date,
    trade.symbol,
    trade.side,
    trade.lotSize?.toFixed(2) ?? "",
    trade.amount.toFixed(2),
  ].join("|")
}

function attachImages(existing: Trade[], next: Trade[]): Trade[] {
  const images = new Map<string, string>()
  for (const trade of existing) {
    if (!trade.imageUrl) continue
    const key = tradeFingerprint(trade)
    if (!images.has(key)) images.set(key, trade.imageUrl)
  }
  if (images.size === 0) return next
  return next.map((trade) => {
    const imageUrl = images.get(tradeFingerprint(trade))
    return imageUrl ? { ...trade, imageUrl } : trade
  })
}

/** Convert an Exness history CSV export into journal trades. */
export function parseExnessCsv(text: string): Trade[] {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase())
  const idx = (name: string) => header.indexOf(name)

  const ticketI = idx("ticket")
  const closeI = idx("closing_time_utc")
  const typeI = idx("type")
  const lotsI = idx("lots")
  const symbolI = idx("symbol")
  const openPriceI = idx("opening_price")
  const closePriceI = idx("closing_price")
  const profitI = idx("profit")
  const reasonI = idx("close_reason")

  if ([ticketI, closeI, typeI, symbolI, profitI].some((i) => i < 0)) {
    throw new Error("Unrecognized Exness CSV columns")
  }

  const trades: Trade[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const cols = line.split(",")
    const ticket = cols[ticketI]?.trim()
    const closing = cols[closeI]?.trim()
    const symbol = cols[symbolI]?.trim().toUpperCase()
    if (!ticket || !closing || !symbol) continue

    const date = closing.slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue

    const profit = num(cols[profitI] ?? "") ?? 0
    const lots = num(cols[lotsI] ?? "")
    const openPrice = num(cols[openPriceI] ?? "")
    const closePrice = num(cols[closePriceI] ?? "")
    const closeReason = mapCloseReason(cols[reasonI] ?? "")

    trades.push({
      id: `exness-${ticket}`,
      date,
      symbol,
      side: mapSide(cols[typeI] ?? "buy"),
      result: profit < 0 ? "loss" : "win",
      amount: Math.abs(profit),
      lotSize: lots,
      openPrice,
      closePrice,
      closeReason,
      kind: "trade",
      createdAt: closing.endsWith("Z") ? closing : `${closing}Z`,
    })
  }

  trades.sort((a, b) => {
    const byDate = a.date.localeCompare(b.date)
    if (byDate !== 0) return byDate
    return a.createdAt.localeCompare(b.createdAt)
  })
  return trades
}

export function loadSeededTradesIfNeeded(existing: Trade[]): Trade[] | null {
  try {
    if (localStorage.getItem(SEED_KEY) === EXNESS_CSV_SEED_VERSION) return null
  } catch {
    return null
  }

  const parsed = attachImages(existing, parseExnessCsv(csvText))
  saveTrades(parsed)
  saveRevision(new Date().toISOString())
  try {
    localStorage.setItem(SEED_KEY, EXNESS_CSV_SEED_VERSION)
    localStorage.setItem(FORCE_PUSH_KEY, "1")
  } catch {
    /* ignore quota / private mode */
  }
  return parsed
}

export function consumeForceCloudPush(): boolean {
  try {
    if (localStorage.getItem(FORCE_PUSH_KEY) !== "1") return false
    localStorage.removeItem(FORCE_PUSH_KEY)
    return true
  } catch {
    return false
  }
}
