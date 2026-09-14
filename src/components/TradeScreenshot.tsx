import { useEffect, useState, type ReactNode } from "react"

type Props = {
  url?: string
  onSave: (url: string | undefined) => void
}

function normalizeImageUrl(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) return ""
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return ""
    return parsed.toString()
  } catch {
    return ""
  }
}

function IconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string
  onClick: () => void
  danger?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid size-9 place-items-center rounded-full border border-line transition ${
        danger ? "text-muted hover:border-loss/40 hover:text-loss" : "text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  )
}

export function TradeScreenshot({ url, onSave }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(url ?? "")
  const [preview, setPreview] = useState(false)
  const [broken, setBroken] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    setDraft(url ?? "")
    setBroken(false)
    setEditing(false)
    setConfirming(false)
  }, [url])

  useEffect(() => {
    if (!confirming && !preview) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (confirming) setConfirming(false)
      else setPreview(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [confirming, preview])

  function commit() {
    const next = normalizeImageUrl(draft)
    if (!next) {
      onSave(undefined)
      setDraft("")
      setEditing(false)
      return
    }
    onSave(next)
    setDraft(next)
    setEditing(false)
    setBroken(false)
  }

  function removeScreenshot() {
    onSave(undefined)
    setConfirming(false)
    setPreview(false)
  }

  if (editing) {
    return (
      <div className="mt-2 min-w-0 overflow-hidden rounded-xl border border-line bg-black/20 p-3">
        <p className="text-[11px] tracking-[0.12em] text-faint uppercase">Screenshot link</p>
        <p className="mt-1 text-xs text-muted">Paste the direct imgbb image URL.</p>
        <input
          type="url"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit()
            if (e.key === "Escape") {
              setDraft(url ?? "")
              setEditing(false)
            }
          }}
          placeholder="https://i.ibb.co/…"
          className="mt-2 h-10 w-full min-w-0 rounded-lg border border-line bg-white/4 px-3 text-sm text-ink outline-none placeholder:text-faint focus:border-gold/50"
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setDraft(url ?? "")
              setEditing(false)
            }}
            className="h-9 rounded-lg border border-line text-sm text-muted hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={commit}
            className="h-9 rounded-lg bg-gold text-sm font-semibold text-on-accent"
          >
            Save
          </button>
        </div>
      </div>
    )
  }

  if (!url) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mt-2 flex w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-dashed border-line px-3 py-2.5 text-sm text-muted transition hover:border-gold/35 hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" aria-hidden>
          <path
            d="M4 7.5A2.5 2.5 0 0 1 6.5 5h2l1.2-1.5h4.6L15.5 5H17.5A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.7" />
        </svg>
        Add screenshot
      </button>
    )
  }

  return (
    <>
      <div className="mt-2 min-w-0 overflow-hidden rounded-xl border border-line bg-black/20">
        <button
          type="button"
          onClick={() => !broken && setPreview(true)}
          className="relative block w-full overflow-hidden bg-black/40"
          aria-label="View screenshot"
        >
          {broken ? (
            <div className="grid h-28 place-items-center px-4 text-center text-sm text-muted">
              Couldn’t load preview. Tap Edit to fix the link.
            </div>
          ) : (
            <img
              src={url}
              alt="Trade screenshot"
              className="max-h-44 w-full object-cover object-top"
              onError={() => setBroken(true)}
            />
          )}
          {!broken ? (
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-left text-xs font-medium text-white/90">
              Tap to view full size
            </span>
          ) : null}
        </button>

        <div className="flex items-center justify-between gap-2 px-2.5 py-2">
          <p className="min-w-0 truncate text-xs text-muted">Chart screenshot</p>
          <div className="flex shrink-0 items-center gap-1">
            <IconButton label="Open on imgbb" onClick={() => window.open(url, "_blank", "noreferrer")}>
              <svg viewBox="0 0 24 24" className="size-3.5" fill="none" aria-hidden>
                <path
                  d="M14 5h5v5M19 5l-8 8M10 5H7.5A2.5 2.5 0 0 0 5 7.5v9A2.5 2.5 0 0 0 7.5 19h9a2.5 2.5 0 0 0 2.5-2.5V14"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </IconButton>
            <IconButton label="Edit link" onClick={() => setEditing(true)}>
              <svg viewBox="0 0 24 24" className="size-3.5" fill="none" aria-hidden>
                <path
                  d="M4 16.8V20h3.2L18.2 9l-3.2-3.2L4 16.8Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path d="M13.5 7.3 16.7 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </IconButton>
            <IconButton label="Remove screenshot" danger onClick={() => setConfirming(true)}>
              <svg viewBox="0 0 24 24" className="size-3.5" fill="none" aria-hidden>
                <path
                  d="M5 7h14M10 7V5.8A1.8 1.8 0 0 1 11.8 4h.4A1.8 1.8 0 0 1 14 5.8V7M8.5 7l.6 12.2A1.5 1.5 0 0 0 10.6 21h2.8a1.5 1.5 0 0 0 1.5-1.8L15.5 7"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </IconButton>
          </div>
        </div>
      </div>

      {confirming ? (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cancel remove screenshot"
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            onClick={() => setConfirming(false)}
          />
          <div className="relative z-10 w-full max-w-xs rounded-2xl border border-line bg-surface p-5 text-center shadow-2xl">
            <div className="mx-auto grid size-11 place-items-center rounded-full bg-loss/12 text-loss">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
                <path
                  d="M5 7h14M10 7V5.8A1.8 1.8 0 0 1 11.8 4h.4A1.8 1.8 0 0 1 14 5.8V7M8.5 7l.6 12.2A1.5 1.5 0 0 0 10.6 21h2.8a1.5 1.5 0 0 0 1.5-1.8L15.5 7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="mt-3 font-display text-lg text-ink">Remove screenshot?</p>
            <p className="mt-1.5 text-sm text-muted">
              This trade will lose its chart link. You can paste a new imgbb URL anytime.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="h-11 rounded-xl border border-line text-sm text-muted transition hover:bg-white/4 hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={removeScreenshot}
                className="h-11 rounded-xl bg-loss text-sm font-semibold text-white transition hover:brightness-110"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {preview ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4">
          <button
            type="button"
            aria-label="Close screenshot"
            className="absolute inset-0 bg-black/80"
            onClick={() => setPreview(false)}
          />
          <div className="relative z-10 flex max-h-[92svh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <p className="text-sm text-muted">Trade screenshot</p>
              <button
                type="button"
                onClick={() => setPreview(false)}
                className="grid size-9 place-items-center rounded-full border border-line text-muted hover:text-ink"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-2">
              <img
                src={url}
                alt="Trade screenshot full size"
                className="mx-auto max-h-[80svh] w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
