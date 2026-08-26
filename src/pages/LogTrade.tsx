import { Link } from "react-router-dom"
import { ScreenshotImport } from "../components/ScreenshotImport"

export function LogTradePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <Link to="/" className="text-sm text-muted hover:text-ink">
        ← Back to dashboard
      </Link>
      <h1 className="mt-3 font-display text-[clamp(1.8rem,5vw,2.8rem)] text-ink">Log P&L</h1>
      <p className="mt-1 text-sm text-muted">Upload an Exness history screenshot to log your trades.</p>
      <div className="mt-6">
        <ScreenshotImport />
      </div>
    </div>
  )
}
