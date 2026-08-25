import { useState } from "react"
import type { SyncStatus } from "../cloudSync"

type Props = {
  open: boolean
  syncKey: string | null
  syncStatus: SyncStatus
  lastSynced: string | null
  syncError: string
  onClose: () => void
  onCreateSync: () => Promise<void>
  onJoinSync: (code: string) => Promise<void>
  onSyncNow: () => Promise<void>
  onStopSync: () => void
}

export function MenuSheet({
  open,
  syncKey,
  syncStatus,
  lastSynced,
  syncError,
  onClose,
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
        aria-label="Close settings"
        onClick={onClose}
      />
      <div className="relative max-h-[90svh] w-full overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 sm:max-w-md sm:rounded-3xl sm:p-6">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
        <h2 className="font-display text-2xl text-ink">Settings</h2>

        <div className="mt-5 rounded-2xl border border-line bg-white/[0.03] p-3">
          <p className="text-sm font-medium text-ink">Cloud sync</p>
          {syncKey ? (
            <>
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
      </div>
    </div>
  )
}
