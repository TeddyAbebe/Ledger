import { toIsoDate } from "../lib"
import {
  findColoredBadgeRows,
  isSlHit,
  isTpHit,
  sampleRowBadges,
  type BadgeTone,
  type Bbox,
} from "./badges"
import type { CloseReason } from "../types"

export type ExtractedTrade = {
  symbol: string
  side: "buy" | "sell"
  lots: number
  pnl: number
  openPrice?: number
  closePrice?: number
  closeReason?: CloseReason
  tpHit?: boolean
  slHit?: boolean
  y?: number
}

export type ExtractedDay = {
  date: string
  label: string
  pnl: number
  lots: number
  trades: ExtractedTrade[]
  dateGuessed?: boolean
}

export type OcrWord = {
  text: string
  bbox: Bbox
}

type Line = {
  text: string
  y: number
  cy: number
  words: OcrWord[]
}

const ACTION =
  /\b(buy|buv|sell|sel)\s*(0[.,]\d+|\d+[.,]\d+|\d+)\s*(?:lot|lots|1ot|iot)s?\b/i
const ACTION_LOOSE =
  /\b(buy|buv|sell|sel)\s*(0[.,]\d+|\d+[.,]\d+)\b/i
const NOISE = /^(accounts|trade|insights|performance|profile|history)$/i

const SYMBOL_TABLE: [RegExp, string][] = [
  [/X\s*A\s*[U0]\s*[\/|]?\s*U\s*S\s*[D0]/i, "XAUUSD"],
  [/XAUUSD|XA[U0]USD|XAUUS[D0]/i, "XAUUSD"],
  [/X\s*A\s*G\s*[\/|]?\s*U\s*S\s*[D0]/i, "XAGUSD"],
  [/XAGUSD|XAGUS[D0]/i, "XAGUSD"],
  [/E\s*U\s*R\s*[\/|]?\s*U\s*S\s*D/i, "EURUSD"],
  [/G\s*B\s*P\s*[\/|]?\s*U\s*S\s*D/i, "GBPUSD"],
  [/U\s*S\s*D\s*[\/|]?\s*J\s*P\s*Y/i, "USDJPY"],
  [/B\s*T\s*C\s*[\/|]?\s*U\s*S\s*D/i, "BTCUSD"],
  [/E\s*T\s*H\s*[\/|]?\s*U\s*S\s*D/i, "ETHUSD"],
  [/NAS\s*100|US\s*100|NDX/i, "NAS100"],
  [/US\s*30|DJ30|DJI/i, "US30"],
  [/US\s*500|SPX/i, "US500"],
  [/USOIL|WTI/i, "USOIL"],
]

function tidy(text: string) {
  return text
    .replace(/(\d),\s+(\d)/g, "$1,$2")
    .replace(/(\d)\s+\.\s*(\d)/g, "$1.$2")
    .replace(/(\d)\s+(\d{2})\s*(lot)/gi, "$1.$2 $3")
    .replace(/\s+/g, " ")
    .trim()
}

export function findSymbol(text: string): string | null {
  const compact = text
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replaceAll("US0", "USD")
    .replaceAll("XA0", "XAU")
  for (const code of ["XAGUSD", "XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "BTCUSD", "ETHUSD", "USOIL", "NAS100"]) {
    if (compact.includes(code)) return code
  }
  if (/XAG/.test(compact) && /USD/.test(compact)) return "XAGUSD"
  if (/XAU/.test(compact) && /USD/.test(compact)) return "XAUUSD"
  if (/\bXAG\b/i.test(text)) return "XAGUSD"
  if (/\bXAU\b/i.test(text)) return "XAUUSD"
  for (const [pattern, code] of SYMBOL_TABLE) {
    if (pattern.test(text)) return code
  }
  return null
}

function parseMoneyAll(chunk: string): number[] {
  const values: number[] = []
  const re = /([+\-−–])\s*(\d{1,3}(?:,\d{3})*|\d+)(?:[.,](\d{1,2}))\s*(USD|EUR|GBP)?/gi
  for (const match of tidy(chunk).matchAll(re)) {
    const sign = match[1] === "+" ? 1 : -1
    values.push(sign * Number(`${match[2].replaceAll(",", "")}.${match[3]}`))
  }
  return values
}

function matchAction(text: string) {
  return text.match(ACTION) ?? text.match(ACTION_LOOSE)
}

function parseLots(raw: string) {
  return Number(raw.replace(",", ".").replace(/\s+/g, ""))
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
const MONTH_SRC = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?"
// Real date separators, plus OCR stand-ins for "/". Digit "1" is NOT a general separator —
// treating it as one turned prices like 418.087 into "Apr 8, 2087".
const SEP_SRC = "[/.\\\\|lI-]"
// Only when "/" was clearly turned into "1" and a slash/dash still follows
// (7122/26). A trailing "." would also match gold prices like 418.087.
const MANGLED_SRC = `\\d{1,2}1\\d{1,2}[/\\\\-]\\d{2,4}`
const ISO_SRC = "\\d{4}[-/.]\\d{1,2}[-/.]\\d{1,2}"
const NUMERIC_SRC = `\\d{1,2}${SEP_SRC}\\d{1,2}${SEP_SRC}\\d{2,4}`
const ISO_RE = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/
const NUMERIC_RE = new RegExp(`^(\\d{1,2})${SEP_SRC}(\\d{1,2})${SEP_SRC}(\\d{2,4})$`)
const MANGLED_RE = /^(\d{1,2})1(\d{1,2})[/\\-](\d{2,4})$/
const DAY_MONTH_SRC = `\\d{1,2}\\s+${MONTH_SRC}(?:,?\\s+\\d{2,4})?`
// The day must not run into a decimal, otherwise "May 0.01 lot" reads as a date.
const MONTH_DAY_SRC = `${MONTH_SRC}\\s+\\d{1,2}(?![.\\d])(?:,?\\s+\\d{2,4})?`
const HEADER_SRC = `(?:to\\s*d[a-z]y|yesterd[a-z]+|vesterday|${ISO_SRC}|${MANGLED_SRC}|${NUMERIC_SRC}|${DAY_MONTH_SRC}|${MONTH_DAY_SRC})`
// OCR often glues a card-edge artifact onto the date ("@7/22/26"), so only refuse
// to split when the preceding character could itself be part of a number or date.
const HEADER_LEAD = "(?<![\\d/.\\\\-])"
const HEADER_AT_START = new RegExp(`^\\W{0,3}(${HEADER_SRC})\\b`, "i")
const HEADER_FIND = new RegExp(`${HEADER_LEAD}(${HEADER_SRC})\\b`, "gi")

function matchHeader(
  line: string,
  now = new Date(),
): { label: string; rest: string; date: string } | null {
  const match = line.match(HEADER_AT_START)
  if (!match) return null
  const date = resolveDate(match[1], now)
  if (!date) return null
  return { label: match[1], rest: line.slice(match[0].length), date }
}

function findAnyDate(text: string, now: Date): string | null {
  HEADER_FIND.lastIndex = 0
  for (const match of text.matchAll(HEADER_FIND)) {
    const date = resolveDate(match[1], now)
    if (date) return date
  }
  return null
}

function pickYear(candidates: number[], now: Date) {
  const current = now.getFullYear()
  for (const value of candidates) {
    const year = value >= 1000 ? value : value >= 0 && value < 100 ? 2000 + value : null
    if (year == null) continue
    // Reject OCR noise that turns prices into far-future or ancient years.
    if (year < current - 5 || year > current + 1) continue
    return year
  }
  return current
}

function buildDate(year: number, month: number, day: number): string | null {
  if (month < 0 || month > 11 || day < 1 || day > 31) return null
  const built = new Date(year, month, day)
  // Reject overflow like Feb 31 → Mar 3.
  if (built.getFullYear() !== year || built.getMonth() !== month || built.getDate() !== day) return null
  return toIsoDate(built)
}

function resolveNumericParts(a: number, b: number, c: number, now: Date) {
  // Exness shows m/d/y, but fall back to d/m/y when the first part can't be a month.
  const dayFirst = a > 12 && b <= 12
  const month = (dayFirst ? b : a) - 1
  const day = dayFirst ? a : b
  if (a > 31 || b > 31) return null
  return buildDate(pickYear([c], now), month, day)
}

function resolveDate(label: string, now = new Date()): string | null {
  const lower = label.trim().toLowerCase()
  if (/^to\s*d[a-z]y$/.test(lower)) return toIsoDate(now)
  if (/^(yesterd[a-z]+|vesterday)$/.test(lower)) {
    const d = new Date(now)
    d.setDate(d.getDate() - 1)
    return toIsoDate(d)
  }

  const named = lower.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/)
  if (named) {
    const numbers = (lower.match(/\d+/g) ?? []).map(Number)
    const month = MONTHS.indexOf(named[1])
    const dayAt = numbers.findIndex((value) => value >= 1 && value <= 31)
    if (dayAt < 0) return null
    const day = numbers[dayAt]
    const rest = numbers.filter((_, index) => index !== dayAt)
    return buildDate(pickYear(rest, now), month, day)
  }

  const compact = lower.replace(/\s+/g, "")
  const iso = compact.match(ISO_RE)
  if (iso) {
    const year = Number(iso[1])
    if (year < now.getFullYear() - 5 || year > now.getFullYear() + 1) return null
    return buildDate(year, Number(iso[2]) - 1, Number(iso[3]))
  }

  const mangled = compact.match(MANGLED_RE)
  if (mangled) return resolveNumericParts(Number(mangled[1]), Number(mangled[2]), Number(mangled[3]), now)

  const numeric = compact.match(NUMERIC_RE)
  if (!numeric) return null
  return resolveNumericParts(Number(numeric[1]), Number(numeric[2]), Number(numeric[3]), now)
}

function isTpWord(text: string) {
  const compact = text.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
  return compact === "TP" || compact === "7P" || compact === "IP" || compact === "TPSL"
}

function isSlWord(text: string) {
  const compact = text.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
  return compact === "SL" || compact === "S1" || compact === "51" || compact === "5L" || compact === "SI"
}

function isActionWord(text: string) {
  return /^(buy|buv|sell|sel)$/i.test(text.replace(/[^A-Za-z]/g, ""))
}

export function clusterWords(words: OcrWord[]): Line[] {
  if (!words.length) return []
  const sorted = [...words].sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0)
  const heights = sorted.map((word) => word.bbox.y1 - word.bbox.y0).sort((a, b) => a - b)
  const mid = heights[Math.floor(heights.length / 2)] || 16
  const gap = Math.max(8, mid * 0.48)
  const lines: Line[] = []

  for (const word of sorted) {
    const cy = (word.bbox.y0 + word.bbox.y1) / 2
    const last = lines.at(-1)
    const lastText = last ? last.words.map((item) => item.text).join(" ") : ""
    const splitFromHeader =
      last &&
      Boolean(matchHeader(lastText)) &&
      Boolean(findSymbol(word.text) || /^(buy|sell|buv|sel)$/i.test(word.text))
    if (last && Math.abs(cy - last.cy) < gap && !splitFromHeader) {
      last.words.push(word)
      last.cy = (last.cy * (last.words.length - 1) + cy) / last.words.length
    } else {
      lines.push({ text: "", y: word.bbox.y0, cy, words: [word] })
    }
  }

  return lines.map((line) => {
    const wordsInLine = [...line.words].sort((a, b) => a.bbox.x0 - b.bbox.x0)
    return {
      y: wordsInLine[0]?.bbox.y0 ?? line.y,
      cy: line.cy,
      words: wordsInLine,
      text: tidy(wordsInLine.map((word) => word.text).join(" ")),
    }
  })
}

function parsePriceToken(text: string): number | undefined {
  const match = text.replaceAll(",", "").match(/\d+(?:\.\d+)?/)
  if (!match) return undefined
  const value = Number(match[0])
  return Number.isFinite(value) && value >= 8 ? value : undefined
}

function instrumentPrices(nums: number[]) {
  const gold = nums.filter((value) => value >= 400)
  if (gold.length) return gold
  return nums.filter((value) => value >= 8 && value < 400)
}

function extractPrices(chunk: string): { open?: number; close?: number } {
  const source = tidy(chunk)
  const afterAt = source.split(/\bat\b/i)[1]
  const priceRe = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\.\d{2,5}/g
  const parse = (match: string) => {
    const value = Number(match.replaceAll(",", ""))
    return Number.isFinite(value) && value >= 8 ? value : undefined
  }

  if (afterAt) {
    // Open is glued to "at". If OCR mangled it, a later right-side figure is close only.
    const matches = [...afterAt.matchAll(priceRe)]
    const first = matches[0]
    const openRaw = first && (first.index ?? 0) <= 4 ? parse(first[0]) : undefined
    const open = openRaw != null ? instrumentPrices([openRaw])[0] : undefined
    const later = instrumentPrices(
      matches
        .slice(open != null ? 1 : 0)
        .map((match) => parse(match[0]))
        .filter((value): value is number => value != null),
    ).filter((value) => open == null || Math.abs(value - open) > 0.0005)
    if (open != null) return later[0] != null ? { open, close: later[0] } : { open }
    if (later[0] != null) return { close: later[0] }
    return {}
  }

  const prices = instrumentPrices(
    [...source.matchAll(priceRe)]
      .map((match) => parse(match[0]))
      .filter((value): value is number => value != null),
  )
  if (prices.length >= 2) return { open: prices[0], close: prices[1] }
  if (prices.length === 1) return { open: prices[0] }
  return {}
}

function closePriceNear(words: OcrWord[], y: number, maxX: number, open?: number) {
  let best: number | undefined
  let bestDist = 22
  for (const word of words) {
    if (word.bbox.x0 < maxX * 0.58) continue
    const cy = (word.bbox.y0 + word.bbox.y1) / 2
    const dist = Math.abs(cy - y)
    if (dist >= bestDist) continue
    const value = parsePriceToken(word.text)
    if (value == null || (open != null && Math.abs(value - open) < 0.0005)) continue
    if (open != null && (value < open * 0.2 || value > open * 5)) continue
    best = value
    bestDist = dist
  }
  return best
}

function nearestWord(words: OcrWord[], y: number, maxDist: number) {
  let best: OcrWord | null = null
  let bestDist = maxDist
  for (const word of words) {
    const cy = (word.bbox.y0 + word.bbox.y1) / 2
    const dist = Math.abs(cy - y)
    if (dist < bestDist) {
      best = word
      bestDist = dist
    }
  }
  return best
}

function exclusiveBadges(tpHit: boolean, slHit: boolean, pnl: number) {
  if (tpHit && slHit) {
    if (Math.abs(pnl) < 0.005) return { tpHit: false, slHit: false, closeReason: "manual" as const }
    if (pnl < 0) return { tpHit: false, slHit: true, closeReason: "sl" as const }
    return { tpHit: true, slHit: false, closeReason: "tp" as const }
  }
  if (tpHit) return { tpHit: true, slHit: false, closeReason: "tp" as const }
  if (slHit) return { tpHit: false, slHit: true, closeReason: "sl" as const }
  return { tpHit: false, slHit: false, closeReason: "manual" as const }
}

function badgeY(trade: ExtractedTrade) {
  return (trade.y ?? 0) - 22
}

function nearestOpenTrade(trades: ExtractedTrade[], y: number, taken: Set<number>, maxDist = 32) {
  let best = -1
  let bestDist = maxDist
  for (const [index, trade] of trades.entries()) {
    if (taken.has(index) || !(trade.y ?? 0)) continue
    const dist = Math.abs(y - badgeY(trade))
    if (dist < bestDist) {
      best = index
      bestDist = dist
    }
  }
  return best
}

function assignUniqueColorHits(trades: ExtractedTrade[], colorHits: { tpYs: number[]; slYs: number[] }) {
  const takenTp = new Set<number>()
  const takenSl = new Set<number>()
  for (const y of colorHits.tpYs) {
    const index = nearestOpenTrade(trades, y, takenTp)
    if (index < 0) continue
    trades[index].tpHit = true
    takenTp.add(index)
  }
  for (const y of colorHits.slYs) {
    const index = nearestOpenTrade(trades, y, takenSl)
    if (index < 0) continue
    trades[index].slHit = true
    takenSl.add(index)
  }
}

function applyBadges(
  trade: ExtractedTrade,
  tpWord: OcrWord | null,
  slWord: OcrWord | null,
  sample?: (bbox: Bbox, side: "tp" | "sl") => BadgeTone,
  color?: ImageData,
  allowRowScan = false,
) {
  let tpHit = trade.tpHit ?? false
  let slHit = trade.slHit ?? false
  if (!tpHit && !slHit) {
    if (sample && tpWord) tpHit = isTpHit(sample(tpWord.bbox, "tp"))
    if (sample && slWord) slHit = isSlHit(sample(slWord.bbox, "sl"))
  }
  if (!tpHit && !slHit && allowRowScan && color && (trade.y ?? 0) > 0) {
    const row = sampleRowBadges(color, trade.y ?? 0)
    if (row.tpHit && row.slHit) {
      if (trade.pnl < 0) slHit = true
      else if (trade.pnl > 0) tpHit = true
    } else {
      tpHit = row.tpHit
      slHit = row.slHit
    }
  }
  const resolved = exclusiveBadges(tpHit, slHit, trade.pnl)
  trade.tpHit = resolved.tpHit
  trade.slHit = resolved.slHit
  trade.closeReason = resolved.closeReason
}

function guessSymbol(trade: ExtractedTrade, fallback?: string) {
  if (trade.symbol !== "UNKNOWN") return trade.symbol
  if ((trade.openPrice ?? 0) > 500) return "XAUUSD"
  if ((trade.openPrice ?? 0) > 8 && (trade.openPrice ?? 0) < 200) return "XAGUSD"
  return fallback ?? "UNKNOWN"
}

function repairDay(
  day: ExtractedDay,
  lines: Line[],
  sample?: (bbox: Bbox, side: "tp" | "sl") => BadgeTone,
  color?: ImageData,
  allWords?: OcrWord[],
  colorHits?: { tpYs: number[]; slYs: number[] },
  forcedYs?: number[],
) {
  let lastKnown = day.trades.find((trade) => trade.symbol !== "UNKNOWN")?.symbol
  const words = allWords?.length ? allWords : lines.flatMap((line) => line.words)
  const maxX = Math.max(1, ...words.map((word) => word.bbox.x1))
  const tps = words
    .filter((word) => isTpWord(word.text) && word.bbox.x0 < maxX * 0.7)
    .sort((a, b) => a.bbox.y0 - b.bbox.y0)
  const sls = words
    .filter((word) => isSlWord(word.text) && word.bbox.x0 < maxX * 0.75)
    .sort((a, b) => a.bbox.y0 - b.bbox.y0)
  const actionLines = lines
    .filter((line) => matchAction(line.text))
    .sort((a, b) => a.cy - b.cy)
  const actionYs = words
    .filter((word) => isActionWord(word.text) && word.bbox.x0 < maxX * 0.55)
    .sort((a, b) => a.bbox.y0 - b.bbox.y0)
    .map((word) => (word.bbox.y0 + word.bbox.y1) / 2)
  for (const [index, trade] of day.trades.entries()) {
    trade.symbol = guessSymbol(trade, lastKnown)
    if (trade.symbol !== "UNKNOWN") lastKnown = trade.symbol
    const forcedY = forcedYs?.[index]
    if (forcedY != null && forcedY > 0) trade.y = forcedY
    else if ((actionLines[index]?.cy ?? 0) > 0) trade.y = actionLines[index].cy
    else if ((actionYs[index] ?? 0) > 0) trade.y = actionYs[index]
    trade.tpHit = false
    trade.slHit = false
  }
  if (colorHits) assignUniqueColorHits(day.trades, colorHits)
  const hasBlobs = Boolean(colorHits?.tpYs.length || colorHits?.slYs.length)
  for (const [index, trade] of day.trades.entries()) {
    if (trade.closePrice == null && (trade.y ?? 0) > 0) {
      trade.closePrice = closePriceNear(words, trade.y ?? 0, maxX, trade.openPrice)
    }
    applyBadges(
      trade,
      tps[index] ?? nearestWord(tps, (trade.y ?? 0) - 18, 56),
      sls[index] ?? nearestWord(sls, (trade.y ?? 0) - 18, 56),
      sample,
      color,
      !hasBlobs,
    )
  }
}

function parseCard(text: string, y: number): ExtractedTrade | null {
  const cleaned = tidy(text)
  const symbol = findSymbol(cleaned)
  const action = matchAction(cleaned)
  if (!symbol && !action) return null
  const prices = extractPrices(cleaned)
  return {
    symbol: symbol ?? "UNKNOWN",
    side: action && /sell|sel/i.test(action[1]) ? "sell" : "buy",
    lots: action ? parseLots(action[2]) : 0,
    pnl: parseMoneyAll(cleaned).at(-1) ?? 0,
    openPrice: prices.open,
    closePrice: prices.close,
    y,
  }
}

function yForSnippet(lines: Line[], snippet: string) {
  const needle = snippet.slice(0, 18).toLowerCase()
  const line = lines.find((item) => item.text.toLowerCase().includes(needle))
  return line?.cy ?? 0
}

function extractTrades(body: string, lines: Line[], headerPnl = 0): ExtractedTrade[] {
  const source = tidy(body)
  const actionRe = /\b(buy|buv|sell|sel)\s+(0[.,]\d+|\d+[.,]\d+)(?:\s*(?:lot|lots|1ot|iot)s?)?/gi
  const matches = [...source.matchAll(actionRe)]
  if (!matches.length) {
    const card = parseCard(source, lines[0]?.cy ?? 0)
    return card && (card.lots || card.pnl) ? [card] : []
  }

  return matches.map((match, index) => {
    const actionAt = match.index ?? 0
    const prevEnd = index === 0 ? 0 : (matches[index - 1].index ?? 0) + matches[index - 1][0].length
    const nextAt = matches[index + 1]?.index ?? source.length
    const before = source.slice(Math.max(prevEnd, actionAt - 120), actionAt)
    const after = source.slice(actionAt, nextAt)
    const prices = extractPrices(/\bat\b/i.test(after) ? after : `${before} ${after}`)
    const pnls = parseMoneyAll(before).filter((value) => Math.abs(value - headerPnl) > 0.009)
    return {
      symbol: findSymbol(before) ?? "UNKNOWN",
      side: /sell|sel/i.test(match[1]) ? "sell" : "buy",
      lots: parseLots(match[2]),
      pnl: pnls.at(-1) ?? parseMoneyAll(before).at(-1) ?? 0,
      openPrice: prices.open,
      closePrice: prices.close,
      y: yForSnippet(lines, match[0]),
    } satisfies ExtractedTrade
  })
}

function explodeByHeaders(line: Line, now: Date): Line[] {
  const text = tidy(line.text)
  HEADER_FIND.lastIndex = 0
  const cuts: number[] = []
  for (const match of text.matchAll(HEADER_FIND)) {
    if (!resolveDate(match[1], now)) continue
    const at = match.index ?? 0
    if (at > 0) cuts.push(at)
  }
  if (!cuts.length) return [{ ...line, text }]

  const parts: string[] = []
  let start = 0
  for (const at of cuts) {
    const chunk = tidy(text.slice(start, at))
    if (chunk) parts.push(chunk)
    start = at
  }
  const tail = tidy(text.slice(start))
  if (tail) parts.push(tail)
  if (parts.length <= 1) return [{ ...line, text }]
  return parts.map((part) => ({ ...line, text: part }))
}

function wordsInRange(words: OcrWord[], y0: number, y1: number) {
  if (!Number.isFinite(y0) || y0 <= 0) return words
  if (!Number.isFinite(y1) || y1 <= y0) {
    return words.filter((word) => word.bbox.y0 >= y0 - 12)
  }
  return words.filter((word) => word.bbox.y0 >= y0 - 12 && word.bbox.y0 < y1)
}

export function parseExnessHistory(
  text: string,
  now = new Date(),
  options?: {
    words?: OcrWord[]
    color?: ImageData
    sampleBadge?: (bbox: Bbox, side: "tp" | "sl") => BadgeTone
  },
): ExtractedDay[] {
  const rawLines: Line[] = options?.words?.length
    ? clusterWords(options.words)
    : text
        .split(/\r?\n/)
        .map((line) => tidy(line))
        .filter(Boolean)
        .map((line) => ({ text: line, y: 0, cy: 0, words: [] as OcrWord[] }))

  const lines = rawLines.flatMap((line) => explodeByHeaders(line, now))
  const colorHits = options?.color ? findColoredBadgeRows(options.color) : undefined
  const actionYs = (options?.words ?? [])
    .filter((word) => isActionWord(word.text))
    .sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0)
    .map((word) => (word.bbox.y0 + word.bbox.y1) / 2)

  const groups: { date: string; label: string; pnl: number; lines: Line[]; rest: string }[] = []
  // Cards above the first readable header still belong to a real day.
  const orphans: Line[] = []

  for (const line of lines) {
    const cleaned = line.text
    if (!cleaned || NOISE.test(cleaned)) continue
    const header = matchHeader(cleaned, now)
    if (header) {
      groups.push({
        date: header.date,
        label: header.label[0].toUpperCase() + header.label.slice(1),
        pnl: parseMoneyAll(header.rest).at(-1) ?? 0,
        rest: header.rest,
        lines: [],
      })
      continue
    }
    if (groups.length) groups.at(-1)?.lines.push(line)
    else orphans.push(line)
  }

  const days: ExtractedDay[] = []
  let usedActions = 0

  function addDay(params: {
    date: string
    label: string
    headerPnl: number
    bodyLines: Line[]
    repairLines: Line[]
    y0: number
    y1: number
    guessed?: boolean
  }) {
    const body = params.bodyLines.map((line) => line.text).filter(Boolean).join(" ")
    const trades = extractTrades(body, params.bodyLines, params.headerPnl)
    if (!trades.length) return null
    const day: ExtractedDay = {
      date: params.date,
      label: params.label,
      pnl: 0,
      lots: 0,
      trades,
      dateGuessed: params.guessed,
    }
    repairDay(
      day,
      params.repairLines,
      options?.sampleBadge,
      options?.color,
      wordsInRange(options?.words ?? [], params.y0, params.y1),
      colorHits,
      actionYs.slice(usedActions, usedActions + trades.length),
    )
    usedActions += trades.length
    day.lots = trades.reduce((sum, trade) => sum + trade.lots, 0)
    day.pnl = trades.reduce((sum, trade) => sum + trade.pnl, 0) || params.headerPnl
    days.push(day)
    return day
  }

  const firstGroupY = groups[0]
    ? Math.min(...groups[0].lines.map((line) => line.y), Number.POSITIVE_INFINITY)
    : Number.POSITIVE_INFINITY

  let orphanDay: ExtractedDay | null = null
  if (orphans.length) {
    const orphanText = orphans.map((line) => line.text).join(" ")
    const found = findAnyDate(orphanText, now) ?? (groups.length ? null : findAnyDate(text, now))
    orphanDay = addDay({
      date: found ?? toIsoDate(now),
      label: found ?? "Date not found",
      headerPnl: 0,
      bodyLines: orphans,
      repairLines: orphans,
      y0: Math.min(...orphans.map((line) => line.y), Number.POSITIVE_INFINITY),
      y1: firstGroupY,
      guessed: !found,
    })
  }

  const unusedDates: string[] = []
  for (const [index, group] of groups.entries()) {
    const added = addDay({
      date: group.date,
      label: group.label,
      headerPnl: group.pnl,
      bodyLines: [
        { text: tidy(group.rest), y: group.lines[0]?.y ?? 0, cy: group.lines[0]?.cy ?? 0, words: [] },
        ...group.lines,
      ],
      repairLines: group.lines,
      y0: Math.min(...group.lines.map((line) => line.y), Number.POSITIVE_INFINITY),
      y1: groups[index + 1]
        ? Math.min(...groups[index + 1].lines.map((line) => line.y), Number.POSITIVE_INFINITY)
        : Number.POSITIVE_INFINITY,
    })
    if (!added) unusedDates.push(group.date)
  }

  // A header that claimed no cards was almost certainly split off from the
  // dateless ones, so it beats falling back to today.
  if (orphanDay?.dateGuessed && unusedDates.length === 1) {
    orphanDay.date = unusedDates[0]
    orphanDay.label = unusedDates[0]
    orphanDay.dateGuessed = false
  }

  return days
}
