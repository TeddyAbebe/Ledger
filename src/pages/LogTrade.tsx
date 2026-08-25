import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useJournal } from "../context"
import { todayIso, closeReasonLabel, formatPrice } from "../lib"
import type { Result, Side } from "../types"
import { DatePicker } from "../components/DatePicker"
import { SymbolPicker } from "../components/SymbolPicker"
import { ScreenshotImport } from "../components/ScreenshotImport"
import { isKnownSymbol } from "../symbols"

export function LogTradePage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { trades, saveTrade, deleteTrade } = useJournal()
  const trade = trades.find((t) => t.id === id) ?? null

  const queryDate = params.get("date")
  const [date, setDate] = useState(queryDate || trade?.date || todayIso())
  const [symbol, setSymbol] = useState(trade?.symbol ?? "")
  const [side, setSide] = useState<Side>(trade?.side ?? "long")
  const [result, setResult] = useState<Result>(trade?.result ?? "win")
  const [amount, setAmount] = useState(trade ? String(trade.amount) : "")
  const [lotSize, setLotSize] = useState(trade?.lotSize ? String(trade.lotSize) : "")
  const [risk, setRisk] = useState(trade?.risk ? String(trade.risk) : "")
  const [imageUrl, setImageUrl] = useState(trade?.imageUrl ?? "")
  const [notes, setNotes] = useState(trade?.notes ?? "")
  const [imageOk, setImageOk] = useState(true)
  const [customSymbol, setCustomSymbol] = useState(
    Boolean(trade?.symbol && !isKnownSymbol(trade.symbol)),
  )

  useEffect(() => {
    if (id && !trade) {
      navigate("/log", { replace: true })
      return
    }
    setDate(queryDate || trade?.date || todayIso())
    setSymbol(trade?.symbol ?? "")
    setSide(trade?.side ?? "long")
    setResult(trade?.result ?? "win")
    setAmount(trade ? String(trade.amount) : "")
    setLotSize(trade?.lotSize ? String(trade.lotSize) : "")
    setRisk(trade?.risk ? String(trade.risk) : "")
    setImageUrl(trade?.imageUrl ?? "")
    setNotes(trade?.notes ?? "")
    setImageOk(true)
    setCustomSymbol(Boolean(trade?.symbol && !isKnownSymbol(trade.symbol)))
  }, [id, trade, queryDate, navigate])

  const parsedAmount = Number(amount)
  const valid = symbol.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount > 0
  const preview = useMemo(() => {
    const url = imageUrl.trim()
    if (!url) return ""
    try {
      const parsed = new URL(url)
      return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : ""
    } catch {
      return ""
    }
  }, [imageUrl])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    saveTrade({
      id: trade?.id,
      createdAt: trade?.createdAt,
      date,
      symbol: symbol.trim().toUpperCase(),
      side,
      result,
      amount: parsedAmount,
      lotSize: lotSize ? Number(lotSize) : undefined,
      risk: risk ? Number(risk) : undefined,
      imageUrl: preview || undefined,
      notes: notes.trim() || undefined,
      openPrice: trade?.openPrice,
      closePrice: trade?.closePrice,
      closeReason: trade?.closeReason,
      kind: trade?.kind,
    })
    navigate("/")
  }

  function remove() {
    if (!trade) return
    if (!window.confirm("Delete this trade?")) return
    deleteTrade(trade.id)
    navigate("/")
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <Link to="/" className="text-sm text-muted hover:text-ink">
        ← Back to dashboard
      </Link>
      <h1 className="mt-3 font-display text-[clamp(1.8rem,5vw,2.8rem)] text-ink">
        {trade ? "Edit trade" : "Log P&L"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {trade ? "Update this entry." : "Upload an Exness history screenshot to log your trades."}
      </p>

      {!trade ? (
        <div className="mt-6">
          <ScreenshotImport />
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-4 rounded-3xl border border-line bg-surface/70 p-4 sm:p-6">
          <div className="grid gap-1.5 text-sm">
            <span className="text-muted">Symbol</span>
            <SymbolPicker
              value={symbol}
              custom={customSymbol}
              onChange={(next, nextCustom) => {
                setCustomSymbol(nextCustom)
                setSymbol(next)
              }}
            />
          </div>

          {customSymbol ? (
            <label className="grid gap-1.5 text-sm">
              <span className="text-muted">Custom symbol</span>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="Type the ticker"
                autoCapitalize="characters"
                required
                className="h-12 rounded-xl border border-line bg-white/[0.04] px-3 uppercase tracking-wide text-ink outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-faint focus:border-gold/50"
              />
            </label>
          ) : null}

          <fieldset className="grid gap-1.5 text-sm">
            <legend className="text-muted">Side</legend>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSide("long")}
                className={`h-12 rounded-xl border text-sm font-semibold capitalize transition ${
                  side === "long"
                    ? "border-profit bg-profit text-[#062015] shadow-[0_0_24px_rgb(46_229_157/0.25)]"
                    : "border-line bg-transparent text-faint hover:text-muted"
                }`}
              >
                Long
              </button>
              <button
                type="button"
                onClick={() => setSide("short")}
                className={`h-12 rounded-xl border text-sm font-semibold capitalize transition ${
                  side === "short"
                    ? "border-loss bg-loss text-[#2a0b12] shadow-[0_0_24px_rgb(255_93_115/0.25)]"
                    : "border-line bg-transparent text-faint hover:text-muted"
                }`}
              >
                Short
              </button>
            </div>
          </fieldset>

          <fieldset className="grid gap-1.5 text-sm">
            <legend className="text-muted">Result</legend>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setResult("win")}
                className={`h-12 rounded-xl border text-sm font-semibold transition ${
                  result === "win"
                    ? "border-profit bg-profit text-[#062015] shadow-[0_0_24px_rgb(46_229_157/0.25)]"
                    : "border-line bg-transparent text-faint hover:text-muted"
                }`}
              >
                Win
              </button>
              <button
                type="button"
                onClick={() => setResult("loss")}
                className={`h-12 rounded-xl border text-sm font-semibold transition ${
                  result === "loss"
                    ? "border-loss bg-loss text-[#2a0b12] shadow-[0_0_24px_rgb(255_93_115/0.25)]"
                    : "border-line bg-transparent text-faint hover:text-muted"
                }`}
              >
                Loss
              </button>
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="grid gap-1.5 text-sm">
              <span className="text-muted">Amount</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="250"
                required
                className="h-12 rounded-xl border border-line bg-white/[0.04] px-3 font-mono text-ink outline-none focus:border-gold/50"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="text-muted">Lot size</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={lotSize}
                onChange={(e) => setLotSize(e.target.value)}
                placeholder="0.10"
                className="h-12 rounded-xl border border-line bg-white/[0.04] px-3 font-mono text-ink outline-none focus:border-gold/50"
              />
            </label>
            <label className="col-span-2 grid gap-1.5 text-sm sm:col-span-1">
              <span className="text-muted">Risk (optional)</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={risk}
                onChange={(e) => setRisk(e.target.value)}
                placeholder="100"
                className="h-12 rounded-xl border border-line bg-white/[0.04] px-3 font-mono text-ink outline-none focus:border-gold/50"
              />
            </label>
          </div>

          {trade && (trade.openPrice != null || trade.closePrice != null || trade.closeReason) ? (
            <div className="rounded-2xl border border-line bg-white/[0.03] p-3 text-sm text-muted">
              <p>
                {trade.openPrice != null ? `Open ${formatPrice(trade.openPrice)}` : "Open —"}
                <span className="px-1.5 text-faint">→</span>
                {trade.closePrice != null ? `Close ${formatPrice(trade.closePrice)}` : "Close —"}
              </p>
              {closeReasonLabel(trade.closeReason) ? (
                <p className="mt-1">{closeReasonLabel(trade.closeReason)}</p>
              ) : null}
            </div>
          ) : null}

          <label className="grid gap-1.5 text-sm">
            <span className="text-muted">Image link (optional)</span>
            <input
              type="text"
              inputMode="url"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value)
                setImageOk(true)
              }}
              placeholder="Paste a chart screenshot URL"
              className="h-12 rounded-xl border border-line bg-white/[0.04] px-3 text-ink outline-none placeholder:text-faint focus:border-gold/50"
            />
          </label>

          {preview && imageOk ? (
            <div className="overflow-hidden rounded-2xl border border-line">
              <img
                src={preview}
                alt="Trade screenshot"
                className="max-h-64 w-full object-cover"
                onError={() => setImageOk(false)}
              />
            </div>
          ) : preview && !imageOk ? (
            <p className="text-sm text-loss">That link did not load as an image.</p>
          ) : null}

          <label className="grid gap-1.5 text-sm">
            <span className="text-muted">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="What did you see?"
              className="rounded-xl border border-line bg-white/[0.04] px-3 py-3 text-ink outline-none focus:border-gold/50"
            />
          </label>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
            {trade ? (
              <button type="button" onClick={remove} className="h-12 rounded-xl px-4 text-sm text-loss hover:bg-loss/10">
                Delete trade
              </button>
            ) : (
              <span />
            )}
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Link
                to="/"
                className="grid h-12 place-items-center rounded-xl border border-line px-5 text-sm text-muted hover:text-ink"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={!valid}
                className="h-12 rounded-xl bg-gold px-5 text-sm font-semibold text-on-accent disabled:opacity-40"
              >
                Save trade
              </button>
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24">
          <p className="mb-2 text-sm text-muted">Trade date</p>
          <DatePicker value={date} onChange={setDate} />
        </aside>
        </form>
      )}
    </div>
  )
}
