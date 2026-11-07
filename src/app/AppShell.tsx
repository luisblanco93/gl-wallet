import { demoToolsEnabled } from '@/config'
import { useDemoLogoTap } from '@/features/demo/useDemoLogoTap'
import { ArrowLeftRight, House, List, LogOut, type LucideIcon } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { useSession } from '@/features/session/useSession'
import { ToastRegion } from '@/features/toast/ToastProvider'
import { Brand } from '@/shared/ui/Brand'
import { cx } from '@/shared/ui/cx'
import { Icon } from '@/shared/ui/Icon'
import { ThemeSelect } from './ThemeSelect'

const useLogoClick = demoToolsEnabled ? useDemoLogoTap : () => undefined

const NAV: readonly { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: 'Inicio', icon: House, end: true },
  { to: '/movimientos', label: 'Movimientos', icon: List },
  { to: '/transferir', label: 'Transferir', icon: ArrowLeftRight },
]

function initialsOf(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
  return initials || '?'
}

/** Header with navigation (desktop), bottom bar (mobile), toasts and the routed page. */
export function AppShell() {
  const onLogoClick = useLogoClick()
  const { state, signOut } = useSession()
  const user = state.status === 'signedIn' ? state.session.user : null
  const logout = () => signOut('loggedOut')

  return (
    <div className="relative flex min-h-dvh flex-col bg-bg text-ink">
      <a href="#main" className="sr-only-focusable absolute left-4 top-2 z-50 rounded-pill bg-ink px-4 py-2 text-bg">
        Saltar al contenido
      </a>
      <header className="flex items-center gap-2.5 border-b border-line py-2 pl-4 pr-2 lg:gap-7 lg:px-8 lg:py-3">
        <Brand onClick={onLogoClick} />
        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex gap-1">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cx(
                      'inline-flex min-h-10 items-center gap-2 rounded-pill px-4 text-[0.9375rem]',
                      isActive ? 'bg-selected font-bold text-bg' : 'font-semibold hover:bg-ink/7',
                    )
                  }
                >
                  <Icon as={item.icon} />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:gap-3">
          <ThemeSelect />
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-tint text-[0.8125rem] font-bold text-primary-active lg:size-9"
          >
            {initialsOf(user?.name ?? '')}
          </span>
          <span className="sr-only xl:not-sr-only xl:flex xl:flex-col xl:leading-tight">
            <span className="text-sm font-bold">{user?.name}</span>
            <span className="hidden text-caption text-ink-muted lg:block">{user?.email}</span>
          </span>
          <button
            type="button"
            onClick={logout}
            className="hidden min-h-10 items-center gap-2 whitespace-nowrap rounded-pill border-[1.5px] border-line px-4 text-sm font-semibold hover:bg-ink/7 lg:inline-flex"
          >
            <Icon as={LogOut} size={16} />
            Cerrar sesión
          </button>
          <button
            type="button"
            onClick={logout}
            aria-label="Cerrar sesión"
            className="grid size-11 place-items-center rounded-full hover:bg-ink/8 lg:hidden"
          >
            <Icon as={LogOut} size={20} />
          </button>
        </div>
      </header>

      <main id="main" className="flex-1">
        <div className="@container mx-auto flex max-w-content flex-col gap-7 px-4 pb-14 pt-5 md:px-10 md:pt-10">
          <Outlet />
        </div>
      </main>
      <ToastRegion />

      <nav
        aria-label="Principal"
        className="sticky bottom-0 border-t border-line bg-paper px-2 pb-[max(6px,env(safe-area-inset-bottom))] pt-1.5 lg:hidden"
      >
        <ul className="grid grid-cols-3 gap-1">
          {NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cx(
                    'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[18px] text-xs',
                    isActive ? 'bg-primary-tint font-bold text-primary-active' : 'font-semibold text-ink-soft hover:bg-ink/6',
                  )
                }
              >
                <Icon as={item.icon} size={20} />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
