import { useEffect, useState } from "react"

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

export function TradeScreenshot({ url, onSave }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(url ?? "")
  const [preview, setPreview] = useState(false)
  const [broken, setBroken] = useState(false)

  useEffect(() => {
    setDraft(url ?? "")
    setBroken(false)
    setEditing(false)
  }, [url])

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

  if (editing) {
    return (
      <div className="mt-2 rounded-xl border border-line bg-black/20 p-2.5">
        <p className="text-[11px] tracking-[0.12em] text-faint uppercase">Screenshot link</p>
        <p className="mt-1 text-xs text-muted">Paste the imgbb image URL after you upload there.</p>
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
          className="mt-2 h-10 w-full rounded-lg border border-line bg-white/[0.04] px-3 text-sm text-ink outline-none placeholder:text-faint focus:border-gold/50"
        />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setDraft(url ?? "")
              setEditing(false)
            }}
            className="h-9 flex-1 rounded-lg border border-line text-sm text-muted hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={commit}
            className="h-9 flex-1 rounded-lg bg-gold text-sm font-semibold text-on-accent"
          >
            Save link
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
        className="mt-2 flex w-full items-center gap-2 rounded-xl border border-dashed border-line px-3 py-2 text-left text-sm text-muted transition hover:border-gold/35 hover:text-ink"
      >
        <span className="grid size-7 place-items-center rounded-lg bg-white/[0.04] text-faint">
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" aria-hidden>
            <path
              d="M4 7.5A2.5 2.5 0 0 1 6.5 5h2l1.2-1.5h4.6L15.5 5H17.5A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </span>
        Add screenshot link
      </button>
    )
  }

  return (
    <>
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-black/20 p-2">
        <button
          type="button"
          onClick={() => !broken && setPreview(true)}
          className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-line bg-black/30"
          aria-label="View screenshot"
        >
          {broken ? (
            <span className="grid size-full place-items-center text-[10px] text-faint">Link</span>
          ) : (
            <img
              src={url}
              alt="Trade screenshot"
              className="size-full object-cover"
              onError={() => setBroken(true)}
            />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] tracking-[0.12em] text-faint uppercase">Screenshot</p>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 block truncate text-sm text-gold hover:underline"
          >
            {url.replace(/^https?:\/\//, "")}
          </a>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg px-2 py-1 text-xs text-muted hover:text-ink"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onSave(undefined)}
            className="rounded-lg px-2 py-1 text-xs text-muted hover:text-loss"
          >
            Remove
          </button>
        </div>
      </div>

      {preview ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close screenshot"
            className="absolute inset-0 bg-black/80"
            onClick={() => setPreview(false)}
          />
          <div className="relative z-10 max-h-[90svh] w-full max-w-3xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
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
            <img src={url} alt="Trade screenshot full size" className="max-h-[80svh] w-full object-contain" />
          </div>
        </div>
      ) : null}
    </>
  )
}
