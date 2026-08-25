import { useState } from "react"
import type { SyncStatus } from "../cloudSync"
import { CURRENCIES } from "../types"
import type { Settings } from "../types"

type Props = {
  open: boolean
  settings: Settings
  syncKey: string | null
  syncStatus: SyncStatus
  lastSynced: string | null
  syncError: string
  onClose: () => void
  onCurrency: (code: string) => void
  onExportJson: () => void
  onExportCsv: () => void
  onImport: (file: File) => void
  onClear: () => void
  onCreateSync: () => Promise<void>
  onJoinSync: (code: string) => Promise<void>
  onSyncNow: () => Promise<void>
  onStopSync: () => void
}

export function MenuSheet({
  open,
  settings,
  syncKey,
  syncStatus,
  lastSynced,
  syncError,
  onClose,
  onCurrency,
  onExportJson,
  onExportCsv,
  onImport,
  onClear,
  onCreateSync,
  onJoinSync,
  onSyncNow,
  onStopSync,
}: Props) {
  const [joinCode, setJoinCode] = useState("")
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [joinError, setJoinError] = useState("")

  if (!open) return null

  async function copyCode() {
    if (!syncKey) return
    try {
      await navigator.clipboard.writeText(syncKey)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      window.prompt("Copy this sync code", syncKey)
    }
  }

  async function create() {
    setBusy(true)
    setJoinError("")
    try {
      await onCreateSync()
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Could not start sync.")
    } finally {
      setBusy(false)
    }
  }

  async function join() {
    setBusy(true)
    setJoinError("")
    try {
      await onJoinSync(joinCode)
      setJoinCode("")
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Could not connect.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div className="relative max-h-[90svh] w-full overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 sm:max-w-md sm:rounded-3xl sm:p-6">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
        <h2 className="font-display text-2xl text-ink">Settings</h2>
        <p className="mt-1 text-sm text-muted">
          This browser keeps a local copy. Turn on cloud sync to open the same journal on your phone
          or another browser.
        </p>

        <div className="mt-5 rounded-2xl border border-line bg-white/[0.03] p-3">
          <p className="text-sm font-medium text-ink">Cloud sync</p>
          {syncKey ? (
            <>
              <p className="mt-1 text-xs text-muted">
                Enter this code on any device. Anyone with it can read and update your journal.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <p className="flex-1 rounded-xl border border-line bg-black/20 px-3 py-2 font-mono text-sm tracking-[0.18em] text-ink">
                  {syncKey}
                </p>
                <button
                  type="button"
                  onClick={() => void copyCode()}
                  className="h-10 shrink-0 rounded-xl border border-line px-3 text-xs text-muted hover:text-ink"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-2 text-xs text-muted">
                {syncStatus === "syncing"
                  ? "Syncing…"
                  : lastSynced
                    ? `Last synced ${new Date(lastSynced).toLocaleString()}`
                    : "Waiting to sync"}
              </p>
              {syncError ? <p className="mt-1 text-xs text-loss">{syncError}</p> : null}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void onSyncNow()}
                  disabled={busy || syncStatus === "syncing"}
                  className="h-10 rounded-xl border border-line text-sm hover:bg-white/[0.04] disabled:opacity-40"
                >
                  Sync now
                </button>
                <button
                  type="button"
                  onClick={onStopSync}
                  className="h-10 rounded-xl text-sm text-muted hover:bg-white/[0.04]"
                >
                  Stop syncing
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 text-xs text-muted">
                Create a code here, then paste it on your phone. Use the live Netlify site, not
                localhost.
              </p>
              <button
                type="button"
                onClick={() => void create()}
                disabled={busy}
                className="mt-3 h-11 w-full rounded-xl bg-gold text-sm font-semibold text-on-accent disabled:opacity-40"
              >
                {busy ? "Starting…" : "Create sync code"}
              </button>
              <div className="mt-3 flex gap-2">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABCD-EFGH-IJKL"
                  className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-white/[0.04] px-3 font-mono text-sm tracking-wide text-ink outline-none placeholder:text-faint focus:border-gold/50"
                />
                <button
                  type="button"
                  onClick={() => void join()}
                  disabled={busy || !joinCode.trim()}
                  className="h-11 rounded-xl border border-line px-3 text-sm disabled:opacity-40"
                >
                  Connect
                </button>
              </div>
              {joinError || syncError ? (
                <p className="mt-2 text-xs text-loss">{joinError || syncError}</p>
              ) : null}
            </>
          )}
        </div>

        <label className="mt-5 grid gap-1.5 text-sm">
          <span className="text-muted">Currency</span>
          <select
            value={settings.currency}
            onChange={(e) => onCurrency(e.target.value)}
            className="h-12 rounded-xl border border-line bg-white/[0.04] px-3 text-ink outline-none"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} ({c.symbol})
              </option>
            ))}
          </select>
        </label>

        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={onExportJson}
            className="h-12 rounded-xl border border-line text-sm hover:bg-white/[0.04]"
          >
            Export JSON backup
          </button>
          <button
            type="button"
            onClick={onExportCsv}
            className="h-12 rounded-xl border border-line text-sm hover:bg-white/[0.04]"
          >
            Export CSV
          </button>
          <label className="grid h-12 place-items-center rounded-xl border border-line text-sm hover:bg-white/[0.04]">
            Import JSON
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onImport(file)
                e.target.value = ""
              }}
            />
          </label>
          <button
            type="button"
            onClick={onClear}
            className="h-12 rounded-xl text-sm text-loss hover:bg-loss/10"
          >
            Clear all trades
          </button>
        </div>
      </div>
    </div>
  )
}
