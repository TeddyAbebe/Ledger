import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useJournal } from "../context"
import { formatDate, formatPnl } from "../lib"
import type { ExtractedDay, ExtractedTrade } from "../ocr/parseExness"
import { readExnessScreenshot } from "../ocr/readScreenshot"
import { TradeDetailCard } from "./TradeDetailCard"

type DraftDay = {
  date: string
  pnl: number
  dateGuessed: boolean
  trades: ExtractedTrade[]
}

type Shot = {
  id: string
  name: string
  preview: string
}

export function ScreenshotImport() {
  const { importScannedDays } = useJournal()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const pickMode = useRef<"replace" | "append">("replace")
  const [shots, setShots] = useState<Shot[]>([])
  const [status, setStatus] = useState<"idle" | "reading" | "review" | "error">("idle")
  const [progress, setProgress] = useState(0)
  const [scanIndex, setScanIndex] = useState(0)
  const [scanTotal, setScanTotal] = useState(0)
  const [error, setError] = useState("")
  const [days, setDays] = useState<DraftDay[]>([])
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [scannedText, setScannedText] = useState("")

  function openPicker(mode: "replace" | "append") {
    pickMode.current = mode
    inputRef.current?.click()
  }

  useEffect(() => {
    return () => {
      for (const shot of shots) URL.revokeObjectURL(shot.preview)
    }
    // Only revoke on unmount; shots are managed in handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!lightbox) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [lightbox])

  async function handleFiles(fileList: FileList | File[]) {
    const files = [...fileList].filter((file) => !file.type || file.type.startsWith("image/"))
    if (!files.length) {
      setError("Please choose screenshot images.")
      setStatus("error")
      return
    }

    const nextShots = files.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name || "screenshot",
      preview: URL.createObjectURL(file),
    }))

    setError("")
    setLightbox(null)
    setShots((current) => {
      for (const shot of current) URL.revokeObjectURL(shot.preview)
      return nextShots
    })
    setStatus("reading")
    setProgress(0)
    setScanIndex(0)
    setScanTotal(files.length)
    setDays([])
    setScannedText("")

    const allDays: ExtractedDay[] = []
    const texts: string[] = []

    try {
      for (const [index, file] of files.entries()) {
        setScanIndex(index)
        const { days: extracted, text } = await readExnessScreenshot(file, (value) => {
          setProgress((index + value) / files.length)
        })
        allDays.push(...extracted)
        if (text.trim()) texts.push(text.trim())
      }

      const merged = mergeDraftDays(allDays.map(toDraft))
      setScannedText(texts.join("\n\n---\n\n"))
      setDays(merged)
      setStatus(merged.length ? "review" : "error")
      if (!merged.length) {
        setError("Couldn’t read trades from those screenshots. Try tighter crops of the history list.")
      }
    } catch (err) {
      setStatus("error")
      setError(err instanceof Error ? err.message : "Could not read those screenshots.")
    }
  }

  async function addMoreFiles(fileList: FileList | File[]) {
    const files = [...fileList].filter((file) => !file.type || file.type.startsWith("image/"))
    if (!files.length) return

    const nextShots = files.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name || "screenshot",
      preview: URL.createObjectURL(file),
    }))

    setError("")
    setShots((current) => [...current, ...nextShots])
    setStatus("reading")
    setProgress(0)
    setScanIndex(0)
    setScanTotal(files.length)

    const allDays: ExtractedDay[] = []
    const texts: string[] = []

    try {
      for (const [index, file] of files.entries()) {
        setScanIndex(index)
        const { days: extracted, text } = await readExnessScreenshot(file, (value) => {
          setProgress((index + value) / files.length)
        })
        allDays.push(...extracted)
        if (text.trim()) texts.push(text.trim())
      }

      const merged = mergeDraftDays([...days, ...allDays.map(toDraft)])
      setScannedText((current) =>
        [current, ...texts].filter(Boolean).join("\n\n---\n\n"),
      )
      setDays(merged)
      setStatus(merged.length ? "review" : "error")
      if (!merged.length) {
        setError("Couldn’t read trades from those screenshots. Try tighter crops of the history list.")
      }
    } catch (err) {
      setStatus("error")
      setError(err instanceof Error ? err.message : "Could not read those screenshots.")
    }
  }

  function saveDetected() {
    const chosen = days.filter((day) => day.trades.length)
    if (!chosen.length) return
    importScannedDays(
      chosen.map((day) => ({
        date: day.date,
        label: day.date,
        pnl: day.trades.reduce((sum, trade) => sum + trade.pnl, 0),
        lots: day.trades.reduce((sum, trade) => sum + (trade.lots || 0), 0),
        trades: day.trades,
      })),
      true,
    )
    navigate("/")
  }

  const scanning = status === "reading"
  const tradeCount = days.reduce((sum, day) => sum + day.trades.length, 0)

  return (
    <div className="grid gap-4 rounded-3xl border border-line bg-surface/70 p-4 sm:p-6">
      <div>
        <p className="font-display text-xl text-ink">Upload Exness screenshots</p>
        <p className="mt-1 text-sm text-muted">
          Select one or more history screenshots. Ledger reads each shot and merges the trades by
          date.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          const files = e.target.files
          if (!files?.length) return
          if (pickMode.current === "append" && shots.length) void addMoreFiles(files)
          else void handleFiles(files)
          e.target.value = ""
        }}
      />

      {shots.length ? (
        <div className="rounded-2xl border border-line bg-white/[0.03] p-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {shots.map((shot, index) => (
              <button
                key={shot.id}
                type="button"
                onClick={() => setLightbox(shot.preview)}
                className="relative shrink-0 overflow-hidden rounded-xl border border-line bg-black/40"
                aria-label={`View screenshot ${index + 1} full size`}
              >
                <img
                  src={shot.preview}
                  alt=""
                  className={`h-24 w-16 object-contain sm:h-28 sm:w-[4.5rem] ${scanning ? "opacity-60" : ""}`}
                />
                <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                  {index + 1}/{shots.length}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-3 min-w-0">
            {scanning ? (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium text-ink">
                    {scanLabel(progress)} · shot {Math.min(scanIndex + 1, scanTotal)} of {scanTotal}
                  </p>
                  <p className="font-mono text-sm tabular-nums text-gold">
                    {Math.round(progress * 100)}%
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  Scanning each screenshot in order. First run can take longer.
                </p>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className="scan-bar-fill h-full rounded-full bg-gold shadow-[0_0_16px_color-mix(in_srgb,var(--accent)_55%,transparent)] transition-[width] duration-300 ease-out"
                    style={{ width: `${Math.max(6, Math.round(progress * 100))}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {shots.length} {shots.length === 1 ? "screenshot" : "screenshots"} uploaded
                  </p>
                  <p className="mt-0.5 text-xs text-muted">Tap a photo to view full size</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={scanning}
                    onClick={() => openPicker("append")}
                    className="text-xs font-medium text-gold hover:underline disabled:opacity-50"
                  >
                    Add more
                  </button>
                  <button
                    type="button"
                    disabled={scanning}
                    onClick={() => openPicker("replace")}
                    className="text-xs font-medium text-muted hover:text-ink disabled:opacity-50"
                  >
                    Replace all
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => openPicker("replace")}
          className="grid cursor-pointer place-items-center rounded-2xl border border-dashed border-line px-4 py-10 text-center hover:border-gold/40 hover:bg-white/[0.03]"
        >
          <span className="text-sm font-medium text-ink">Tap to upload screenshots</span>
          <span className="mt-1 text-xs text-muted">
            PNG or JPG · select multiple if the day spans more than one shot
          </span>
        </button>
      )}

      {error ? <p className="text-sm text-loss">{error}</p> : null}

      {status === "error" && scannedText ? (
        <details className="rounded-2xl border border-line bg-white/[0.03] p-3">
          <summary className="cursor-pointer text-sm text-muted hover:text-ink">
            Show scanned text
          </summary>
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-muted">
            {scannedText}
          </pre>
        </details>
      ) : null}

      {status === "review" && days.length > 0 ? (
        <div className="grid gap-4">
          <p className="text-sm text-muted">
            Check each trade, then save. Trades from every screenshot are merged by date — if a
            shot has no date header, its trades join the dated day from the other shots. Colored
            TP/SL means that target was hit; grey means a manual close.
          </p>
          {days.map((day, index) => (
            <div key={`${day.date}-${index}`} className="grid gap-3 rounded-2xl border border-line p-3">
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium text-ink">{formatDate(day.date)}</p>
                  <p
                    className={`shrink-0 font-mono text-sm tabular-nums ${
                      day.pnl > 0 ? "text-profit" : day.pnl < 0 ? "text-loss" : "text-muted"
                    }`}
                  >
                    {formatPnl(day.pnl)}
                  </p>
                </div>
                <p className="text-xs text-muted">
                  {day.trades.length} {day.trades.length === 1 ? "trade" : "trades"}
                  {day.dateGuessed ? (
                    <span className="text-gold"> · date not found in the screenshot</span>
                  ) : null}
                </p>
              </div>
              {day.trades.length ? (
                <ul className="grid gap-2">
                  {day.trades.map((trade, tradeIndex) => (
                    <li key={`${trade.symbol}-${tradeIndex}-${trade.pnl}`}>
                      <TradeDetailCard
                        trade={{
                          symbol: trade.symbol,
                          side: trade.side,
                          pnl: trade.pnl,
                          lotSize: trade.lots || undefined,
                          openPrice: trade.openPrice,
                          closePrice: trade.closePrice,
                          closeReason: trade.closeReason,
                          tpHit: trade.tpHit,
                          slHit: trade.slHit,
                        }}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {status === "review" && tradeCount > 0 ? (
        <button
          type="button"
          onClick={saveDetected}
          className="h-12 rounded-xl bg-gold text-sm font-semibold text-on-accent"
        >
          Save {tradeCount} {tradeCount === 1 ? "trade" : "trades"}
        </button>
      ) : null}

      {lightbox ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close screenshot"
            className="absolute inset-0 bg-black/80"
            onClick={() => setLightbox(null)}
          />
          <div className="relative z-10 max-h-[92svh] w-full max-w-lg">
            <img
              src={lightbox}
              alt="Uploaded screenshot"
              className="max-h-[92svh] w-full rounded-2xl object-contain"
            />
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute -top-3 -right-3 grid size-9 place-items-center rounded-full border border-line bg-surface text-lg text-ink"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function scanLabel(progress: number) {
  if (progress < 0.18) return "Preparing images"
  if (progress < 0.92) return "Reading trades"
  return "Matching results"
}

function toDraft(day: ExtractedDay): DraftDay {
  return {
    date: day.date,
    pnl: day.pnl,
    dateGuessed: Boolean(day.dateGuessed),
    trades: day.trades,
  }
}

function tradeKey(trade: ExtractedTrade) {
  const open = trade.openPrice ?? ""
  const close = trade.closePrice ?? ""
  if (open !== "" || close !== "") {
    // Same fill prices ⇒ same trade; P&L left out so a lost-minus (0) can upgrade.
    return [trade.symbol, trade.side, trade.lots, open, close].join("|")
  }
  // No prices yet — keep P&L so two EURUSD 0.02 buys don't collapse into one.
  return [trade.symbol, trade.side, trade.lots, trade.pnl.toFixed(2)].join("|")
}

function preferTrade(current: ExtractedTrade, incoming: ExtractedTrade) {
  if (Math.abs(incoming.pnl) > Math.abs(current.pnl)) return incoming
  if (incoming.pnl !== 0 && current.pnl === 0) return incoming
  if (incoming.closeReason && !current.closeReason) {
    return { ...current, closeReason: incoming.closeReason, tpHit: incoming.tpHit, slHit: incoming.slHit }
  }
  if ((incoming.openPrice != null || incoming.closePrice != null) && current.openPrice == null && current.closePrice == null) {
    return {
      ...current,
      openPrice: incoming.openPrice ?? current.openPrice,
      closePrice: incoming.closePrice ?? current.closePrice,
    }
  }
  return {
    ...current,
    openPrice: current.openPrice ?? incoming.openPrice,
    closePrice: current.closePrice ?? incoming.closePrice,
    closeReason: current.closeReason ?? incoming.closeReason,
    tpHit: current.tpHit || incoming.tpHit,
    slHit: current.slHit || incoming.slHit,
  }
}

function mergeDraftDays(incoming: DraftDay[]): DraftDay[] {
  // Continuation shots often omit the date header. If this upload already has
  // exactly one concrete date (e.g. Oct 8), attach those undated trades there
  // instead of inventing "today".
  const knownDates = [
    ...new Set(incoming.filter((day) => !day.dateGuessed).map((day) => day.date)),
  ]
  const inheritDate = knownDates.length === 1 ? knownDates[0] : null
  const normalized = incoming.map((day) => {
    if (!day.dateGuessed || !inheritDate) return day
    return { ...day, date: inheritDate, dateGuessed: false }
  })

  const byDate = new Map<string, DraftDay>()

  for (const day of normalized) {
    const existing = byDate.get(day.date)
    if (!existing) {
      byDate.set(day.date, {
        date: day.date,
        dateGuessed: day.dateGuessed,
        trades: [...day.trades],
        pnl: 0,
      })
      continue
    }

    const byKey = new Map(existing.trades.map((trade) => [tradeKey(trade), trade]))
    for (const trade of day.trades) {
      const key = tradeKey(trade)
      const prev = byKey.get(key)
      byKey.set(key, prev ? preferTrade(prev, trade) : trade)
    }
    existing.trades = [...byKey.values()]
    // Prefer a concrete date header over a guessed one.
    if (existing.dateGuessed && !day.dateGuessed) existing.dateGuessed = false
  }

  return [...byDate.values()]
    .map((day) => ({
      ...day,
      pnl: day.trades.reduce((sum, trade) => sum + trade.pnl, 0),
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
}
