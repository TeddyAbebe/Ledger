import { useState } from "react"
import { Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom"
import { Header } from "./components/Header"
import { MenuSheet } from "./components/MenuSheet"
import { useJournal } from "./context"
import { AnalyticsPage } from "./pages/Analytics"
import { DashboardPage } from "./pages/Dashboard"
import { LogTradePage } from "./pages/LogTrade"

function Layout() {
  const {
    settings,
    stats,
    setSettings,
    syncKey,
    syncStatus,
    lastSynced,
    syncError,
    createCloudSync,
    joinCloudSync,
    syncNow,
    stopCloudSync,
  } = useJournal()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const onLogPage = location.pathname.startsWith("/log")

  return (
    <div className="relative min-h-svh overflow-x-hidden bg-bg">
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" />
      <Header
        stats={stats}
        settings={settings}
        onTheme={(theme) => setSettings({ ...settings, theme })}
        onOpenMenu={() => setMenuOpen(true)}
      />
      <main
        className={`relative ${onLogPage ? "" : "pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-0"}`}
      >
        <Outlet />
      </main>
      {!onLogPage ? (
        <button
          type="button"
          onClick={() => navigate("/log")}
          className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 rounded-full bg-gold px-5 py-3 text-sm font-semibold text-on-accent shadow-[0_12px_40px_color-mix(in_srgb,var(--accent)_35%,transparent)] sm:hidden"
        >
          Log trade
        </button>
      ) : null}
      <MenuSheet
        open={menuOpen}
        syncKey={syncKey}
        syncStatus={syncStatus}
        lastSynced={lastSynced}
        syncError={syncError}
        onClose={() => setMenuOpen(false)}
        onCreateSync={createCloudSync}
        onJoinSync={joinCloudSync}
        onSyncNow={syncNow}
        onStopSync={stopCloudSync}
      />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/log" element={<LogTradePage />} />
      </Route>
    </Routes>
  )
}
