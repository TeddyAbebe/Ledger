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

function matchHeader(line: string): { label: string; rest: string } | null {
  const today = line.match(/^(to\s*d[a-z]y)\b/i)
  if (today) return { label: "today", rest: line.slice(today[0].length) }
  const yesterday = line.match(/^(yesterd[a-z]+|vesterday)\b/i)
  if (yesterday) return { label: "yesterday", rest: line.slice(yesterday[0].length) }
  const date = line.match(/^(\d{1,2}[/.\\-]\d{1,2}[/.\\-]\d{2,4})\b/)
  if (date) return { label: date[1], rest: line.slice(date[0].length) }
  return null
}

function resolveDate(label: string, now = new Date()): string | null {
  const lower = label.toLowerCase()
  if (lower === "today") return toIsoDate(now)
  if (lower === "yesterday") {
    const d = new Date(now)
    d.setDate(d.getDate() - 1)
    return toIsoDate(d)
  }
  const parts = label.split(/[/.\\-]/).map(Number)
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null
  let [a, b, c] = parts
  if (c < 100) c += 2000
  const month = a - 1
  const day = b
  if (month < 0 || month > 11 || day < 1 || day > 31) return null
  return toIsoDate(new Date(c, month, day))
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
  const haystack = afterAt ?? source
  const nums = [...haystack.matchAll(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\.\d{2,5}/g)]
    .map((match) => Number(match[0].replaceAll(",", "")))
    .filter((value) => Number.isFinite(value) && value >= 8)
  const prices = instrumentPrices(nums)
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

function explodeByHeaders(line: Line): Line[] {
  const parts = line.text
    .split(/(?=(?:today|yesterday|\d{1,2}[/.\\-]\d{1,2}[/.\\-]\d{2,4})\b)/gi)
    .map((part) => tidy(part))
    .filter(Boolean)
  if (parts.length <= 1) return [{ ...line, text: tidy(line.text) }]
  return parts.map((text) => ({ ...line, text }))
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

  const lines = rawLines.flatMap(explodeByHeaders)
  const colorHits = options?.color ? findColoredBadgeRows(options.color) : undefined
  const actionYs = (options?.words ?? [])
    .filter((word) => isActionWord(word.text))
    .sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0)
    .map((word) => (word.bbox.y0 + word.bbox.y1) / 2)

  const groups: { date: string; label: string; pnl: number; lines: Line[]; rest: string }[] = []

  for (const line of lines) {
    const cleaned = line.text
    if (!cleaned || NOISE.test(cleaned)) continue
    const header = matchHeader(cleaned)
    if (header) {
      const date = resolveDate(header.label, now)
      if (!date) continue
      groups.push({
        date,
        label: header.label[0].toUpperCase() + header.label.slice(1),
        pnl: parseMoneyAll(header.rest).at(-1) ?? 0,
        rest: header.rest,
        lines: [],
      })
      continue
    }
    groups.at(-1)?.lines.push(line)
  }

  let usedActions = 0
  return groups
    .map((group, index) => {
      const bodyLines = [
        { text: tidy(group.rest), y: group.lines[0]?.y ?? 0, cy: group.lines[0]?.cy ?? 0, words: [] as OcrWord[] },
        ...group.lines,
      ]
      const body = bodyLines.map((line) => line.text).filter(Boolean).join(" ")
      const trades = extractTrades(body, bodyLines, group.pnl)
      const y0 = Math.min(...group.lines.map((line) => line.y), Number.POSITIVE_INFINITY)
      const nextY = groups[index + 1]
        ? Math.min(...groups[index + 1].lines.map((line) => line.y), Number.POSITIVE_INFINITY)
        : Number.POSITIVE_INFINITY
      repairDay(
        { date: group.date, label: group.label, pnl: group.pnl, lots: 0, trades },
        group.lines,
        options?.sampleBadge,
        options?.color,
        wordsInRange(options?.words ?? [], y0, nextY),
        colorHits,
        actionYs.slice(usedActions, usedActions + trades.length),
      )
      usedActions += trades.length
      const lots = trades.reduce((sum, trade) => sum + trade.lots, 0)
      const fromTrades = trades.reduce((sum, trade) => sum + trade.pnl, 0)
      return {
        date: group.date,
        label: group.label,
        pnl: fromTrades || group.pnl,
        lots,
        trades,
      }
    })
    .filter((day) => day.trades.length > 0)
}
