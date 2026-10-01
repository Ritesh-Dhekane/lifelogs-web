// The frame every screen sits in: top bar with the menu, bottom navigation on phones (a sidebar
// on desktop), the side drawer and the quick-add sheet.

import {
  BarChart3,
  CircleUserRound,
  Clock,
  CloudUpload,
  Info,
  LayoutGrid,
  Menu,
  Plus,
  Settings,
  SlidersHorizontal,
  Sun,
  User,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useMatches } from 'react-router'

import { QuickAddSheet } from './QuickAddSheet'

const BASE = import.meta.env.BASE_URL

const TABS: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: 'Today', icon: Sun, end: true },
  { to: '/logs', label: 'Logs', icon: LayoutGrid },
  { to: '/timeline', label: 'Timeline', icon: Clock },
  { to: '/insights', label: 'Insights', icon: BarChart3 },
]

const MENU: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/profile', label: 'Profile', icon: CircleUserRound },
  { to: '/logs/manage', label: 'Manage logs', icon: SlidersHorizontal },
  { to: '/backup', label: 'Backup & restore', icon: CloudUpload },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/about', label: 'About', icon: Info },
]

export interface RouteHandle {
  title?: string
}

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [quickAdd, setQuickAdd] = useState(false)
  const matches = useMatches()
  const title =
    [...matches]
      .reverse()
      .map((match) => (match.handle as RouteHandle | undefined)?.title)
      .find(Boolean) ?? 'LifeLogs'

  return (
    <div className="min-h-svh lg:pl-64">
      <a
        href="#main"
        className="sr-only z-[60] rounded-full bg-primary px-4 py-2 text-on-primary focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-bar backdrop-blur-xl backdrop-saturate-150 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-3 px-2 lg:px-6">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="grid size-11 place-items-center rounded-full text-ink active:scale-95 lg:hidden"
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <Menu className="size-6" />
            </button>
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <img src={`${BASE}icon.svg`} alt="" className="size-8 rounded-[9px]" />
              <span className="text-heading">LifeLogs</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 pr-1">
            <span className="max-w-[140px] truncate text-body font-semibold text-ink-2 lg:max-w-none lg:text-title lg:text-ink">
              {title}
            </span>
            <Link
              to="/profile"
              className="grid size-8 place-items-center rounded-full bg-primary text-on-primary"
              aria-label="Profile"
            >
              <User className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      <Sidebar onQuickAdd={() => setQuickAdd(true)} />
      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main
        id="main"
        tabIndex={-1}
        className="mx-auto max-w-[1120px] px-4 pt-4 pb-[calc(96px+env(safe-area-inset-bottom))] outline-none lg:px-6 lg:pb-12"
      >
        <Outlet context={{ openQuickAdd: () => setQuickAdd(true) }} />
      </main>

      <BottomNav onQuickAdd={() => setQuickAdd(true)} />
      <QuickAddSheet open={quickAdd} onClose={() => setQuickAdd(false)} />
    </div>
  )
}

function BottomNav({ onQuickAdd }: { onQuickAdd: () => void }) {
  const items = [TABS[0]!, TABS[1]!, null, TABS[2]!, TABS[3]!]
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bar pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 lg:hidden"
    >
      <ul className="mx-auto flex h-[68px] max-w-md items-center justify-around px-2">
        {items.map((tab) =>
          tab ? (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-1 text-meta tracking-normal normal-case transition-colors ${
                    isActive ? 'text-ink' : 'text-ink-3'
                  }`
                }
              >
                <tab.icon className="size-6" strokeWidth={1.8} />
                <span>{tab.label}</span>
              </NavLink>
            </li>
          ) : (
            <li key="add" className="flex flex-1 justify-center">
              <button
                type="button"
                onClick={onQuickAdd}
                className="-mt-6 grid size-14 place-items-center rounded-full bg-primary text-on-primary shadow-float transition-transform active:scale-95"
                aria-label="Quick add"
              >
                <Plus className="size-7" strokeWidth={2.2} />
              </button>
            </li>
          ),
        )}
      </ul>
    </nav>
  )
}

function Sidebar({ onQuickAdd }: { onQuickAdd: () => void }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-canvas-2 px-3 py-4 lg:flex">
      <Link to="/" className="flex items-center gap-2 px-3 py-2">
        <img src={`${BASE}icon.svg`} alt="" className="size-8 rounded-[9px]" />
        <span className="text-heading">LifeLogs</span>
      </Link>
      <button
        type="button"
        onClick={onQuickAdd}
        className="mx-1 mt-4 flex h-11 items-center justify-center gap-2 rounded-full bg-primary text-on-primary active:scale-[0.98]"
      >
        <Plus className="size-5" /> Quick add
      </button>
      <nav aria-label="Main" className="mt-4 flex flex-col gap-1">
        {TABS.map((tab) => (
          <SideLink key={tab.to} {...tab} />
        ))}
      </nav>
      <div className="mt-6 border-t border-line pt-4">
        <nav aria-label="Menu" className="flex flex-col gap-1">
          {MENU.map((item) => (
            <SideLink key={item.to} {...item} />
          ))}
        </nav>
      </div>
    </aside>
  )
}

function SideLink({
  to,
  label,
  icon: Icon,
  end,
  onClick,
}: {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  onClick?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex h-11 items-center gap-3 rounded-xl px-3 text-label transition-colors ${
          isActive
            ? 'bg-card-2 font-semibold text-ink'
            : 'text-ink-2 hover:bg-card-2/60 hover:text-ink'
        }`
      }
    >
      <Icon className="size-5" strokeWidth={1.8} />
      {label}
    </NavLink>
  )
}

function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label="Menu"
      onClose={onClose}
      onClick={(event) => event.target === ref.current && onClose()}
      className="drawer m-0 h-svh max-h-none w-[290px] max-w-[80vw] bg-card p-0 text-ink shadow-float backdrop:bg-black/25 backdrop:backdrop-blur-sm"
    >
      <div className="flex h-full flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center gap-2 px-5 py-5">
          <img src={`${BASE}icon.svg`} alt="" className="size-9 rounded-[10px]" />
          <div>
            <p className="text-heading">LifeLogs</p>
            <p className="text-label text-ink-3">Your data stays on this device</p>
          </div>
        </div>
        <nav aria-label="Menu" className="flex flex-1 flex-col gap-1 px-3">
          {MENU.map((item) => (
            <SideLink key={item.to} {...item} onClick={onClose} />
          ))}
        </nav>
        <p className="px-6 py-4 text-meta text-ink-3">VERSION {__APP_VERSION__}</p>
      </div>
    </dialog>
  )
}
