import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  createSyncKey,
  loadRevision,
  loadSyncKey,
  mergeTrades,
  normalizeSyncKey,
  pullSnapshot,
  pushSnapshot,
  saveRevision,
  saveSyncKey,
  type SyncStatus,
} from "./cloudSync"
import { applyHistorySeed, computeStats, loadSettings, loadTrades, saveSettings, saveTrades } from "./lib"
import type { ExtractedDay, ExtractedTrade } from "./ocr/parseExness"
import type { Settings, Trade } from "./types"

type Draft = Omit<Trade, "id" | "createdAt"> & { id?: string; createdAt?: string }

type JournalValue = {
  trades: Trade[]
  settings: Settings
  stats: ReturnType<typeof computeStats>
  saveTrade: (input: Draft) => string
  deleteTrade: (id: string) => void
  clearDay: (date: string) => void
  setSettings: (next: Settings) => void
  importJson: (file: File) => Promise<void>
  upsertDayTotals: (
    days: { date: string; pnl: number; lots?: number; notes?: string }[],
    replaceDay: boolean,
  ) => void
  importScannedDays: (days: ExtractedDay[], replaceDay: boolean) => void
  clearAll: () => void
  syncKey: string | null
  syncStatus: SyncStatus
  lastSynced: string | null
  syncError: string
  createCloudSync: () => Promise<void>
  joinCloudSync: (code: string) => Promise<void>
  syncNow: () => Promise<void>
  stopCloudSync: () => void
}

const JournalContext = createContext<JournalValue | null>(null)

export function JournalProvider({ children }: { children: ReactNode }) {
  const [trades, setTrades] = useState<Trade[]>(() => loadTrades())
  const [settings, setSettingsState] = useState<Settings>(() => loadSettings())
  const [syncKey, setSyncKey] = useState<string | null>(() => loadSyncKey())
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => (loadSyncKey() ? "idle" : "off"))
  const [lastSynced, setLastSynced] = useState<string | null>(() => loadRevision())
  const [syncError, setSyncError] = useState("")
  const skipPush = useRef(true)
  const pushTimer = useRef<number | null>(null)

  useEffect(() => {
    saveTrades(trades)
    saveSettings(settings)
    document.documentElement.dataset.theme = settings.theme
  }, [trades, settings])

  useEffect(() => {
    if (!syncKey) return
    void hydrateFromCloud(syncKey)
  }, [])

  useEffect(() => {
    if (skipPush.current) {
      skipPush.current = false
      return
    }
    if (!syncKey) return
    if (pushTimer.current) window.clearTimeout(pushTimer.current)
    pushTimer.current = window.setTimeout(() => {
      void pushToCloud(syncKey, trades, settings)
    }, 900)
    return () => {
      if (pushTimer.current) window.clearTimeout(pushTimer.current)
    }
  }, [trades, settings, syncKey])

  const stats = useMemo(() => computeStats(trades), [trades])

  async function hydrateFromCloud(key: string) {
    setSyncStatus("syncing")
    setSyncError("")
    try {
      const remote = await pullSnapshot(key)
      const localStamp = loadRevision()
      if (!remote) {
        await pushToCloud(key, trades, settings)
        return
      }
      if (localStamp && localStamp > remote.updatedAt) {
        await pushToCloud(key, trades, settings)
        return
      }
      const hydrated = applyHistorySeed(remote.trades)
      skipPush.current = hydrated === remote.trades
      setTrades(hydrated)
      setSettingsState((current) => ({ ...current, ...remote.settings }))
      saveRevision(remote.updatedAt)
      setLastSynced(remote.updatedAt)
      setSyncStatus("idle")
    } catch (err) {
      setSyncStatus("error")
      setSyncError(err instanceof Error ? err.message : "Could not sync.")
    }
  }

  async function pushToCloud(key: string, nextTrades: Trade[], nextSettings: Settings) {
    setSyncStatus("syncing")
    setSyncError("")
    try {
      const updatedAt = new Date().toISOString()
      await pushSnapshot(key, {
        trades: nextTrades,
        settings: { currency: nextSettings.currency, theme: nextSettings.theme },
        updatedAt,
      })
      saveRevision(updatedAt)
      setLastSynced(updatedAt)
      setSyncStatus("idle")
    } catch (err) {
      setSyncStatus("error")
      setSyncError(err instanceof Error ? err.message : "Could not sync.")
    }
  }

  async function createCloudSync() {
    const key = createSyncKey()
    saveSyncKey(key)
    setSyncKey(key)
    skipPush.current = true
    await pushToCloud(key, trades, settings)
  }

  async function joinCloudSync(code: string) {
    const key = normalizeSyncKey(code)
    if (!key) throw new Error("Use a code like ABCD-EFGH-IJKL.")
    setSyncStatus("syncing")
    setSyncError("")
    const remote = await pullSnapshot(key)
    const merged = remote ? mergeTrades(trades, remote.trades) : trades
    const nextSettings = remote ? { ...settings, ...remote.settings } : settings
    skipPush.current = true
    setTrades(merged)
    setSettingsState(nextSettings)
    saveSyncKey(key)
    setSyncKey(key)
    await pushToCloud(key, merged, nextSettings)
  }

  async function syncNow() {
    if (!syncKey) return
    await hydrateFromCloud(syncKey)
  }

  function stopCloudSync() {
    saveSyncKey(null)
    saveRevision(null)
    setSyncKey(null)
    setLastSynced(null)
    setSyncStatus("off")
    setSyncError("")
  }

  function saveTrade(input: Draft) {
    const id = input.id ?? crypto.randomUUID()
    setTrades((current) => {
      if (input.id) {
        return current.map((t) => (t.id === input.id ? { ...t, ...input, id: input.id } : t))
      }
      return [
        ...current,
        {
          ...input,
          id,
          createdAt: new Date().toISOString(),
        },
      ]
    })
    return id
  }

  function deleteTrade(id: string) {
    setTrades((current) => current.filter((t) => t.id !== id))
  }

  function clearDay(date: string) {
    setTrades((current) => current.filter((t) => t.date !== date))
  }

  async function importJson(file: File) {
    const text = await file.text()
    const parsed = JSON.parse(text) as Trade[]
    if (!Array.isArray(parsed)) throw new Error("Invalid file")
    const incoming = parsed.filter((t) => t && typeof t.id === "string" && t.symbol)
    setTrades((current) => {
      const ids = new Set(current.map((t) => t.id))
      const merged = [...current]
      for (const trade of incoming) {
        if (ids.has(trade.id)) {
          const i = merged.findIndex((t) => t.id === trade.id)
          merged[i] = trade
        } else {
          merged.push(trade)
        }
      }
      return merged
    })
  }

  function upsertDayTotals(
    days: { date: string; pnl: number; lots?: number; notes?: string }[],
    replaceDay: boolean,
  ) {
    setTrades((current) => {
      let next = [...current]
      for (const day of days) {
        next = replaceDay
          ? next.filter((t) => t.date !== day.date)
          : next.filter((t) => !(t.date === day.date && t.kind === "day-total"))
        next.push({
          id: crypto.randomUUID(),
          date: day.date,
          symbol: "DAILY",
          side: day.pnl >= 0 ? "long" : "short",
          result: day.pnl >= 0 ? "win" : "loss",
          amount: Math.abs(day.pnl),
          lotSize: day.lots,
          kind: "day-total",
          notes: day.notes,
          createdAt: new Date().toISOString(),
        })
      }
      return next
    })
  }

  function importScannedDays(days: ExtractedDay[], replaceDay: boolean) {
    setTrades((current) => {
      let next = [...current]
      const createdAt = new Date().toISOString()
      for (const day of days) {
        next = replaceDay
          ? next.filter((t) => t.date !== day.date)
          : next.filter((t) => !(t.date === day.date && t.kind === "day-total"))
        if (day.trades.length) {
          next.push(...day.trades.map((trade) => scannedTrade(day.date, trade, createdAt)))
        } else {
          next.push({
            id: crypto.randomUUID(),
            date: day.date,
            symbol: "DAILY",
            side: day.pnl >= 0 ? "long" : "short",
            result: day.pnl >= 0 ? "win" : "loss",
            amount: Math.abs(day.pnl),
            lotSize: day.lots || undefined,
            kind: "day-total",
            notes: "Daily total",
            createdAt,
          })
        }
      }
      return next
    })
  }

  function clearAll() {
    if (!window.confirm("Delete every trade stored in this browser?")) return
    setTrades([])
  }

  return (
    <JournalContext.Provider
      value={{
        trades,
        settings,
        stats,
        saveTrade,
        deleteTrade,
        clearDay,
        setSettings: setSettingsState,
        importJson,
        upsertDayTotals,
        importScannedDays,
        clearAll,
        syncKey,
        syncStatus,
        lastSynced,
        syncError,
        createCloudSync,
        joinCloudSync,
        syncNow,
        stopCloudSync,
      }}
    >
      {children}
    </JournalContext.Provider>
  )
}

export function useJournal() {
  const value = useContext(JournalContext)
  if (!value) throw new Error("useJournal must be used inside JournalProvider")
  return value
}

function scannedTrade(date: string, trade: ExtractedTrade, createdAt: string): Trade {
  return {
    id: crypto.randomUUID(),
    date,
    symbol: trade.symbol,
    side: trade.side === "sell" ? "short" : "long",
    result: trade.pnl < 0 ? "loss" : "win",
    amount: Math.abs(trade.pnl),
    lotSize: trade.lots || undefined,
    openPrice: trade.openPrice,
    closePrice: trade.closePrice,
    closeReason: trade.closeReason,
    kind: "trade",
    createdAt,
  }
}
