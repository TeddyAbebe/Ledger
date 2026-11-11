import { useState } from "react"
import { Outlet, Route, Routes } from "react-router-dom"
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

  return (
    <div className="relative min-h-svh overflow-x-hidden bg-bg">
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" />
      <Header
        stats={stats}
        settings={settings}
        onTheme={(theme) => setSettings({ ...settings, theme })}
        onOpenMenu={() => setMenuOpen(true)}
      />
      <main className="relative">
        <Outlet />
      </main>
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
