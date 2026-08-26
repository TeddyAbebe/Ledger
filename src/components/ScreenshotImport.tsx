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

export function ScreenshotImport() {
  const { importScannedDays } = useJournal()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "reading" | "review" | "error">("idle")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")
  const [days, setDays] = useState<DraftDay[]>([])
  const [lightbox, setLightbox] = useState(false)
  const [scannedText, setScannedText] = useState("")

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  useEffect(() => {
    if (!lightbox) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [lightbox])

  async function handleFile(file: File) {
    if (file.type && !file.type.startsWith("image/")) {
      setError("Please choose a screenshot image.")
      setStatus("error")
      return
    }
    setError("")
    setLightbox(false)
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(file)
    })
    setStatus("reading")
    setProgress(0)
    setDays([])
    setScannedText("")
    try {
      const { days: extracted, text } = await readExnessScreenshot(file, setProgress)
      setScannedText(text.trim())
      setDays(extracted.map(toDraft))
      setStatus(extracted.length ? "review" : "error")
      if (!extracted.length) setError("Couldn’t read trades from that screenshot. Try a tighter crop of the history list.")
    } catch (err) {
      setStatus("error")
      setError(err instanceof Error ? err.message : "Could not read that screenshot.")
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
        <p className="font-display text-xl text-ink">Upload Exness screenshot</p>
        <p className="mt-1 text-sm text-muted">
          From Accounts history, screenshot the trade cards. Ledger reads symbol, lots, prices, P/L,
          and whether TP or SL was hit.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          e.target.value = ""
        }}
      />

      {preview ? (
        <div className="rounded-2xl border border-line bg-white/[0.03] p-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setLightbox(true)}
              className="shrink-0 overflow-hidden rounded-xl border border-line bg-black/40"
              aria-label="View screenshot full size"
            >
              <img
                src={preview}
                alt=""
                className={`h-24 w-16 object-contain sm:h-28 sm:w-[4.5rem] ${scanning ? "opacity-60" : ""}`}
              />
            </button>
            <div className="min-w-0 flex-1">
              {scanning ? (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium text-ink">{scanLabel(progress)}</p>
                    <p className="font-mono text-sm tabular-nums text-gold">{Math.round(progress * 100)}%</p>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">This can take a few seconds on the first scan.</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-ink">Uploaded screenshot</p>
                  <p className="mt-0.5 text-xs text-muted">Tap the photo to view full size</p>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="mt-2 text-xs font-medium text-gold hover:underline"
                  >
                    Replace photo
                  </button>
                </>
              )}
            </div>
          </div>
          {scanning ? (
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="scan-bar-fill h-full rounded-full bg-gold shadow-[0_0_16px_color-mix(in_srgb,var(--accent)_55%,transparent)] transition-[width] duration-300 ease-out"
                style={{ width: `${Math.max(6, Math.round(progress * 100))}%` }}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="grid cursor-pointer place-items-center rounded-2xl border border-dashed border-line px-4 py-10 text-center hover:border-gold/40 hover:bg-white/[0.03]"
        >
          <span className="text-sm font-medium text-ink">Tap to upload screenshot</span>
          <span className="mt-1 text-xs text-muted">PNG or JPG from the Exness history tab</span>
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
            Check each trade, then save. Colored TP/SL means that target was hit; grey means a
            manual close.
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
                    <li key={`${trade.symbol}-${tradeIndex}`}>
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

      {lightbox && preview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close screenshot"
            className="absolute inset-0 bg-black/80"
            onClick={() => setLightbox(false)}
          />
          <div className="relative z-10 max-h-[92svh] w-full max-w-lg">
            <img
              src={preview}
              alt="Uploaded screenshot"
              className="max-h-[92svh] w-full rounded-2xl object-contain"
            />
            <button
              type="button"
              onClick={() => setLightbox(false)}
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
  if (progress < 0.18) return "Preparing image"
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
