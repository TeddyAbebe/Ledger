export type Side = "long" | "short"
export type Result = "win" | "loss"
export type Theme = "dark" | "blue"
export type CloseReason = "tp" | "sl" | "manual"

export type Trade = {
  id: string
  date: string
  symbol: string
  side: Side
  result: Result
  amount: number
  lotSize?: number
  openPrice?: number
  closePrice?: number
  closeReason?: CloseReason
  risk?: number
  setup?: string
  notes?: string
  imageUrl?: string
  kind?: "trade" | "day-total"
  createdAt: string
}

export type Period = "all" | "week" | "month" | "year"
export type ResultFilter = "all" | "win" | "loss"

export type Settings = {
  currency: string
  theme: Theme
}

export const CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "ETB", symbol: "Br" },
] as const
