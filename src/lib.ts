import type { Period, Settings, Trade } from "./types"

const TRADES_KEY = "ledger.trades.v1"
const SETTINGS_KEY = "ledger.settings.v1"

export const defaultSettings: Settings = { currency: "USD", theme: "dark" }

export function loadTrades(): Trade[] {
  try {
    const raw = localStorage.getItem(TRADES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Trade[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((trade) => typeof trade?.id === "string" && !trade.id.startsWith("demo-"))
  } catch {
    return []
  }
}

export function saveTrades(trades: Trade[]) {
  localStorage.setItem(TRADES_KEY, JSON.stringify(trades))
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaultSettings
    const parsed = JSON.parse(raw) as Settings
    return { ...defaultSettings, ...parsed }
  } catch {
    return defaultSettings
  }
}

export function saveSettings(settings: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function signedPnl(trade: Trade): number {
  return trade.result === "win" ? trade.amount : -trade.amount
}

export function startOfPeriod(period: Period, now = new Date()): Date | null {
  if (period === "all") return null
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  if (period === "week") {
    const day = d.getDay() || 7
    d.setDate(d.getDate() - day + 1)
    return d
  }
  if (period === "month") {
    d.setDate(1)
    return d
  }
  d.setMonth(0, 1)
  return d
}

export function filterByPeriod(trades: Trade[], period: Period): Trade[] {
  const start = startOfPeriod(period)
  if (!start) return trades
  const iso = toIsoDate(start)
  return trades.filter((t) => t.date >= iso)
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function parseIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function todayIso(): string {
  return toIsoDate(new Date())
}

export function formatDate(iso: string): string {
  return parseIso(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  })
}

export function formatPnl(value: number): string {
  const formatted = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  if (value > 0) return `+${formatted} USD`
  if (value < 0) return `−${formatted} USD`
  return `${formatted} USD`
}

export function formatCompactPnl(value: number): string {
  const abs = Math.abs(value)
  const text =
    abs >= 1000
      ? `${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`
      : abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (value > 0) return `+${text}`
  if (value < 0) return `−${text}`
  return text
}

export function formatTightPnl(value: number): string {
  const abs = Math.abs(value)
  const text = abs >= 1000 ? `${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k` : Math.round(abs).toString()
  if (value > 0) return `+${text}`
  if (value < 0) return `−${text}`
  return text
}

export function formatMoney(value: number, currency: string, signed = false): string {
  const abs = Math.abs(value)
  const formatted = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: abs >= 1000 ? 0 : 2,
  }).format(abs)

  if (!signed) return value < 0 ? `−${formatted}` : formatted
  if (value > 0) return `+${formatted}`
  if (value < 0) return `−${formatted}`
  return formatted
}

export function formatCash(value: number, currency: string): string {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value))
  return value < 0 ? `-${formatted}` : formatted
}

export function formatPrice(value: number): string {
  const digits = value >= 10 ? 3 : 5
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function closeReasonLabel(reason?: Trade["closeReason"]) {
  if (reason === "tp") return "Take profit"
  if (reason === "sl") return "Stop loss"
  if (reason === "manual") return "Manual close"
  return null
}

export function summarizeDay(trades: Trade[]) {
  const details = trades.filter((trade) => trade.kind !== "day-total")
  const source = details.length ? details : trades
  return {
    trades: source,
    pnl: source.reduce((sum, trade) => sum + signedPnl(trade), 0),
    count: source.length,
  }
}

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function tradesToCsv(trades: Trade[]): string {
  const header = [
    "date",
    "symbol",
    "side",
    "result",
    "amount",
    "lotSize",
    "openPrice",
    "closePrice",
    "closeReason",
    "risk",
    "imageUrl",
    "kind",
    "notes",
  ]
  const rows = [...trades]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((t) =>
      [
        t.date,
        t.symbol,
        t.side,
        t.result,
        t.amount,
        t.lotSize ?? "",
        t.openPrice ?? "",
        t.closePrice ?? "",
        t.closeReason ?? "",
        t.risk ?? "",
        t.imageUrl ?? "",
        t.kind ?? "trade",
        t.notes ?? "",
      ]
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(","),
    )
  return [header.join(","), ...rows].join("\n")
}

export type Stats = {
  net: number
  wins: number
  losses: number
  count: number
  winRate: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  best: number
  worst: number
  avgR: number | null
}

export function computeStats(trades: Trade[]): Stats {
  const pnls = trades.map(signedPnl)
  const wins = pnls.filter((v) => v > 0)
  const losses = pnls.filter((v) => v < 0)
  const net = pnls.reduce((sum, v) => sum + v, 0)
  const winSum = wins.reduce((sum, v) => sum + v, 0)
  const lossSum = losses.reduce((sum, v) => sum + Math.abs(v), 0)
  const withRisk = trades.filter((t) => t.risk && t.risk > 0)
  const avgR =
    withRisk.length > 0
      ? withRisk.reduce((sum, t) => sum + signedPnl(t) / (t.risk as number), 0) / withRisk.length
      : null

  return {
    net,
    wins: wins.length,
    losses: losses.length,
    count: trades.length,
    winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
    avgWin: wins.length ? winSum / wins.length : 0,
    avgLoss: losses.length ? lossSum / losses.length : 0,
    profitFactor: lossSum > 0 ? winSum / lossSum : winSum > 0 ? Infinity : 0,
    best: pnls.length ? Math.max(...pnls) : 0,
    worst: pnls.length ? Math.min(...pnls) : 0,
    avgR,
  }
}

export function equityPoints(trades: Trade[]) {
  const sorted = [...trades].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date)
    return byDate !== 0 ? byDate : a.createdAt.localeCompare(b.createdAt)
  })
  let equity = 0
  return sorted.map((trade) => {
    equity += signedPnl(trade)
    return { id: trade.id, date: trade.date, equity, pnl: signedPnl(trade) }
  })
}

export type DayCell = {
  iso: string
  day: number
  inMonth: boolean
  pnl: number
  count: number
}

export type CalendarWeek = {
  days: DayCell[]
  pnl: number
  count: number
}

export function buildMonth(year: number, month: number, trades: Trade[]): CalendarWeek[] {
  const first = new Date(year, month, 1)
  const mondayOffset = (first.getDay() + 6) % 7
  const cursor = new Date(year, month, 1 - mondayOffset)
  const grouped = new Map<string, Trade[]>()

  for (const trade of trades) {
    const list = grouped.get(trade.date) ?? []
    list.push(trade)
    grouped.set(trade.date, list)
  }

  const weeks: CalendarWeek[] = []
  for (let w = 0; w < 6; w++) {
    const days: DayCell[] = []
    for (let d = 0; d < 7; d++) {
      const iso = toIsoDate(cursor)
      const inMonth = cursor.getMonth() === month
      // Days from the neighbouring months stay blank, so their P&L belongs to that month only.
      const stats = inMonth ? grouped.get(iso) : undefined
      const summary = stats ? summarizeDay(stats) : { pnl: 0, count: 0 }
      days.push({
        iso,
        day: cursor.getDate(),
        inMonth,
        pnl: summary.pnl,
        count: summary.count,
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    if (days.some((day) => day.inMonth)) {
      weeks.push({
        days,
        pnl: days.reduce((sum, day) => sum + day.pnl, 0),
        count: days.reduce((sum, day) => sum + day.count, 0),
      })
    }
  }
  return weeks
}

export function monthPnl(year: number, month: number, trades: Trade[]) {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`
  const grouped = new Map<string, Trade[]>()
  for (const trade of trades) {
    if (!trade.date.startsWith(prefix)) continue
    const list = grouped.get(trade.date) ?? []
    list.push(trade)
    grouped.set(trade.date, list)
  }
  let net = 0
  for (const list of grouped.values()) net += summarizeDay(list).pnl
  return net
}

export function monthCount(year: number, month: number, trades: Trade[]) {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`
  const inMonth = trades.filter((trade) => trade.date.startsWith(prefix))
  const details = inMonth.filter((trade) => trade.kind !== "day-total")
  return (details.length ? details : inMonth).length
}

export function tradesOnDate(trades: Trade[], iso: string) {
  return trades.filter((trade) => trade.date === iso)
}
