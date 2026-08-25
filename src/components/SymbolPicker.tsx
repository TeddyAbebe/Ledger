import { useEffect, useMemo, useRef, useState } from "react"
import { SYMBOL_GROUPS, isKnownSymbol, symbolMeta } from "../symbols"

type Props = {
  value: string
  custom: boolean
  onChange: (value: string, custom: boolean) => void
}

export function SymbolPicker({ value, custom, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const root = useRef<HTMLDivElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const selected = custom ? null : symbolMeta(value)

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SYMBOL_GROUPS
    return SYMBOL_GROUPS.map((group) => ({
      ...group,
      options: group.options.filter(
        (option) =>
          option.value.toLowerCase().includes(q) || option.name.toLowerCase().includes(q),
      ),
    })).filter((group) => group.options.length > 0)
  }, [query])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setQuery("")
      requestAnimationFrame(() => search.current?.focus())
    }
  }, [open])

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-12 w-full items-center justify-between gap-3 rounded-xl border px-3 text-left outline-none transition ${
          open ? "border-gold/60 bg-white/[0.06]" : "border-line bg-white/[0.04] hover:border-white/15"
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="min-w-0">
          {selected ? (
            <>
              <span className="font-medium tracking-wide text-ink">{selected.value}</span>
              <span className="ml-2 text-sm text-muted">{selected.name}</span>
            </>
          ) : custom && value ? (
            <span className="font-medium tracking-wide text-ink">{value}</span>
          ) : custom ? (
            <span className="text-muted">Other market</span>
          ) : (
            <span className="text-muted">Select a market</span>
          )}
        </span>
        <svg
          viewBox="0 0 20 20"
          className={`size-4 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`}
          fill="none"
          aria-hidden
        >
          <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      {open ? (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_60px_rgb(0_0_0/0.45)]">
          <div className="flex items-center justify-end px-2.5 pt-2.5 pb-1">
            <label className="flex h-8 w-40 items-center gap-1.5 rounded-lg border border-line bg-white/[0.04] px-2 sm:w-44">
              <svg viewBox="0 0 20 20" className="size-3.5 shrink-0 text-faint" fill="none" aria-hidden>
                <circle cx="8.5" cy="8.5" r="5.25" stroke="currentColor" strokeWidth="1.6" />
                <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <input
                ref={search}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="h-full w-full bg-transparent text-xs text-ink outline-none placeholder:text-faint"
              />
            </label>
          </div>
          <div className="max-h-56 overflow-y-auto p-1.5">
            {groups.map((group) => (
              <div key={group.label} className="mb-0.5">
                <p className="px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-faint">{group.label}</p>
                {group.options.map((option) => {
                  const active = !custom && option.value === value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value, false)
                        setOpen(false)
                      }}
                      className={`flex w-full items-baseline justify-between gap-3 rounded-lg px-2 py-1.5 text-left ${
                        active ? "bg-gold/15 text-gold" : "text-ink hover:bg-white/[0.05]"
                      }`}
                    >
                      <span className="text-sm font-medium tracking-wide">{option.value}</span>
                      <span className={`truncate text-xs ${active ? "text-gold/80" : "text-muted"}`}>
                        {option.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
            {groups.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted">No match.</p>
            ) : null}
            <button
              type="button"
              onClick={() => {
                onChange(isKnownSymbol(value) ? "" : value, true)
                setOpen(false)
              }}
              className={`mt-0.5 flex w-full rounded-lg px-2 py-1.5 text-left text-xs ${
                custom ? "bg-gold/15 text-gold" : "text-muted hover:bg-white/[0.05] hover:text-ink"
              }`}
            >
              Other — type a custom ticker
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
