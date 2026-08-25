import { getStore } from "@netlify/blobs"

type Snapshot = {
  trades: unknown[]
  settings: { currency?: string; theme?: string }
  updatedAt: string
}

const KEY = /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/

async function digest(key: string) {
  const bytes = new TextEncoder().encode(key)
  const hash = await crypto.subtle.digest("SHA-256", bytes)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

export default async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405)
  }

  let body: { op?: string; key?: string; snapshot?: Snapshot }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return json({ error: "Invalid JSON" }, 400)
  }

  const key = String(body.key ?? "")
    .trim()
    .toUpperCase()
  if (!KEY.test(key)) return json({ error: "Invalid sync code" }, 400)

  const store = getStore("ledger-sync")
  const id = await digest(key)

  if (body.op === "pull") {
    const snapshot = (await store.get(id, { type: "json" })) as Snapshot | null
    return json({ snapshot: snapshot ?? null })
  }

  if (body.op === "push") {
    const snapshot = body.snapshot
    if (!snapshot || !Array.isArray(snapshot.trades) || typeof snapshot.updatedAt !== "string") {
      return json({ error: "Invalid snapshot" }, 400)
    }
    if (snapshot.trades.length > 5000) return json({ error: "Too many trades" }, 413)
    await store.setJSON(id, {
      trades: snapshot.trades,
      settings: snapshot.settings ?? {},
      updatedAt: snapshot.updatedAt,
    })
    return json({ ok: true, updatedAt: snapshot.updatedAt })
  }

  return json({ error: "Unknown operation" }, 400)
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  })
}
