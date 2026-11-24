import { Link, Outlet, createRootRoute, useRouterState } from '@tanstack/react-router'
import { Building2, Package, Truck, UserRound } from 'lucide-react'
import { BottomNav } from '@/components/bottom-nav'
import { ConnectionBadge } from '@/components/connection-badge'
import { Logo } from '@/components/logo'
import { PwaUpdatePrompt } from '@/components/pwa-update-prompt'

const publicRoutes = ['/login', '/cambiar-clave', '/v/']

const navItems = [
  { to: '/', label: 'Proyectos', icon: Building2 },
  { to: '/materiales', label: 'Suministros', icon: Package },
  { to: '/proveedores', label: 'Proveedores', icon: Truck },
  { to: '/cuenta', label: 'Cuenta', icon: UserRound },
]

function RootLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  // 1. Si es la zona de Super Admin ERP, es 100% independiente
  if (pathname === '/admin' || pathname.startsWith('/admin')) {
    return (
      <div className="min-h-dvh bg-slate-950 text-slate-100 antialiased selection:bg-orange selection:text-white">
        <Outlet />
      </div>
    )
  }

  // 2. Si son rutas públicas (login, portal cliente)
  const isPublic = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route),
  )
  if (isPublic) {
    return (
      <div className="min-h-dvh bg-gray-50 antialiased">
        <Outlet />
      </div>
    )
  }

  // 3. Aplicación general (Responsive: Desktop First + Mobile PWA)
  return (
    <div className="min-h-dvh bg-gray-50 antialiased">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Logo />
            {/* Navegación Desktop */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(({ to, label, icon: Icon }) => {
                const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                      active
                        ? 'bg-navy text-white shadow-xs'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-navy'
                    }`}
                  >
                    <Icon className="size-4" />
                    {label}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <ConnectionBadge />
          </div>
        </div>
      </header>

      {/* Contenedor fluido y espacioso en escritorio */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-5 pb-24 md:pb-10">
        <Outlet />
      </main>

      <BottomNav />
      <PwaUpdatePrompt />
    </div>
  )
}

export const Route = createRootRoute({ component: RootLayout })
