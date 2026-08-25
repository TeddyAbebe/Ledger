import type { Settings, Trade } from "./types"

const SYNC_KEY = "ledger.syncKey.v1"
const REVISION_KEY = "ledger.revision.v1"
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

export type Snapshot = {
  trades: Trade[]
  settings: Pick<Settings, "currency" | "theme">
  updatedAt: string
}

export type SyncStatus = "off" | "idle" | "syncing" | "error"

export function loadSyncKey(): string | null {
  try {
    return localStorage.getItem(SYNC_KEY)
  } catch {
    return null
  }
}

export function saveSyncKey(key: string | null) {
  if (!key) localStorage.removeItem(SYNC_KEY)
  else localStorage.setItem(SYNC_KEY, key)
}

export function loadRevision(): string | null {
  try {
    return localStorage.getItem(REVISION_KEY)
  } catch {
    return null
  }
}

export function saveRevision(updatedAt: string | null) {
  if (!updatedAt) localStorage.removeItem(REVISION_KEY)
  else localStorage.setItem(REVISION_KEY, updatedAt)
}

export function createSyncKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("")
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`
}

export function normalizeSyncKey(raw: string) {
  const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, "")
  if (compact.length !== 12) return null
  return `${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(8, 12)}`
}

export async function pullSnapshot(key: string): Promise<Snapshot | null> {
  const data = await call({ op: "pull", key })
  const snapshot = data.snapshot
  if (!snapshot || !Array.isArray(snapshot.trades)) return null
  return snapshot as Snapshot
}

export async function pushSnapshot(key: string, snapshot: Snapshot) {
  await call({ op: "push", key, snapshot })
}

export function mergeTrades(local: Trade[], remote: Trade[]) {
  const map = new Map<string, Trade>()
  for (const trade of remote) map.set(trade.id, trade)
  for (const trade of local) {
    const prev = map.get(trade.id)
    if (!prev || (trade.createdAt || "") >= (prev.createdAt || "")) map.set(trade.id, trade)
  }
  return [...map.values()]
}

async function call(body: Record<string, unknown>) {
  let response: Response
  try {
    response = await fetch("/.netlify/functions/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error("Cloud sync needs the live Netlify site. Open that URL on your other device.")
  }
  const text = await response.text()
  let data: { error?: string; snapshot?: Snapshot | null } = {}
  try {
    data = JSON.parse(text) as typeof data
  } catch {
    throw new Error("Cloud sync needs the live Netlify site. Open that URL on your other device.")
  }
  if (!response.ok) throw new Error(data.error || "Sync failed")
  return data
}
