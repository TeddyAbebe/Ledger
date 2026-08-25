import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { formatMoney } from "../lib"
import type { Settings, Theme } from "../types"
import type { Stats } from "../lib"

type Props = {
  stats: Stats
  settings: Settings
  onTheme: (theme: Theme) => void
  onOpenMenu: () => void
}

const tabs = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/analytics", label: "Analytics", end: false },
]

export function Header({ stats, settings, onTheme, onOpenMenu }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const positive = stats.net >= 0
  const logging = location.pathname.startsWith("/log")

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-3 sm:gap-3 sm:px-6">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex min-w-0 items-center gap-2.5 sm:gap-3"
        >
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold">
            <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" aria-hidden>
              <path
                d="M4 16.5V9M4 12.5h2.2v4H4zM11 19V5M11 8.5h2.2v8H11zM18 15.5V10M18 12h2.2v3.5H18z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="min-w-0 text-left">
            <p className="font-display text-[17px] leading-none tracking-tight text-ink sm:text-lg">
              Ledger
            </p>
            <p className="mt-0.5 truncate text-[11px] text-faint sm:text-xs">Trading journal</p>
          </div>
        </button>

        <nav className="ml-1 hidden rounded-full border border-line p-1 md:flex">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `rounded-full px-3.5 py-1.5 text-sm ${isActive ? "bg-white/10 text-ink" : "text-muted hover:text-ink"}`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden text-right lg:block">
            <p className="text-[11px] uppercase tracking-[0.16em] text-faint">Net P&L</p>
            <p className={`font-mono text-base font-medium tabular-nums ${positive ? "text-profit" : "text-loss"}`}>
              {formatMoney(stats.net, settings.currency, true)}
            </p>
          </div>

          <div className="flex rounded-full border border-line p-0.5 text-[11px] sm:text-xs">
            {(["dark", "blue"] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => onTheme(theme)}
                className={`rounded-full px-2.5 py-1.5 capitalize ${
                  settings.theme === theme ? "bg-gold text-on-accent" : "text-muted"
                }`}
              >
                {theme}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => navigate("/log")}
            className={`hidden rounded-full px-4 py-2 text-sm font-semibold sm:inline-flex ${
              logging ? "bg-gold text-on-accent" : "bg-gold text-on-accent shadow-[0_0_24px_color-mix(in_srgb,var(--accent)_28%,transparent)]"
            }`}
          >
            Log trade
          </button>

          <button
            type="button"
            onClick={onOpenMenu}
            className="grid size-10 place-items-center rounded-full border border-line text-muted transition hover:text-ink"
            aria-label="Menu"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
              <path
                d="M5 7h14M5 12h14M5 17h10"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <nav className="mx-auto flex max-w-6xl gap-1 px-3 pb-3 md:hidden">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex-1 rounded-full border border-line py-2 text-center text-sm ${
                isActive ? "bg-white/10 text-ink" : "text-muted"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
