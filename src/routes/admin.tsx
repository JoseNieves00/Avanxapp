import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  AlertTriangle,
  Building,
  Check,
  CreditCard,
  DollarSign,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  Plus,
  Power,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/input'
import { db, type Organizacion, type PlanSuscripcion } from '@/lib/db'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

const MAX_INTENTOS_FALLIDOS = 5
const TIEMPO_BLOQUEO_MS = 15 * 60 * 1000

// Planes comerciales iniciales por defecto
const PLANES_BASE: PlanSuscripcion[] = [
  {
    id: 'plan_starter',
    nombre: 'Starter (Contratistas)',
    precio_cop_mes: 99000,
    limite_obras: 3,
    limite_usuarios: 2,
    limite_storage_gb: 5,
    soporte_3d: true,
    soporte_ia: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'plan_pro',
    nombre: 'Profesional (Remodelación)',
    precio_cop_mes: 199000,
    limite_obras: 10,
    limite_usuarios: 5,
    limite_storage_gb: 25,
    soporte_3d: true,
    soporte_ia: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'plan_enterprise',
    nombre: 'Constructora Enterprise',
    precio_cop_mes: 399000,
    limite_obras: 50,
    limite_usuarios: 20,
    limite_storage_gb: 100,
    soporte_3d: true,
    soporte_ia: true,
    created_at: new Date().toISOString(),
  },
]

// Empresas de prueba si la base de datos está vacía
const EMPRESAS_BASE: Organizacion[] = [
  {
    id: 'org-1',
    nombre: 'Constructora Hábitat & Diseño S.A.S.',
    slug: 'habitat-diseno',
    nit_rut: '901.458.120-1',
    plan_id: 'plan_pro',
    estado: 'activa',
    limite_obras_activas: 10,
    storage_usado_mb: 680,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'org-2',
    nombre: 'Espacios & Acabados Remodelaciones',
    slug: 'espacios-acabados',
    nit_rut: '900.842.331-4',
    plan_id: 'plan_starter',
    estado: 'activa',
    limite_obras_activas: 3,
    storage_usado_mb: 120,
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'org-3',
    nombre: 'Ingeniería Civil Andina',
    slug: 'civil-andina',
    nit_rut: '901.129.504-8',
    plan_id: 'plan_enterprise',
    estado: 'en_prueba',
    limite_obras_activas: 50,
    storage_usado_mb: 350,
    created_at: new Date().toISOString(),
  },
]

function sanitizarEntrada(texto: string): string {
  return texto
    .replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, '')
    .replace(/(--|;|\/\*|\*\/|union|select|insert|drop|delete|update)/gi, '')
    .trim()
}

function validarEmail(email: string): boolean {
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(email)
}

function formatearCOP(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor)
}

function AdminPage() {
  // 1. Identidad dinámica del Super Admin ERP
  useEffect(() => {
    const iconLink = document.querySelector<HTMLLinkElement>("link[rel*='icon']")
    const appleIconLink = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']")
    const manifestLink = document.querySelector<HTMLLinkElement>("link[rel='manifest']")
    const themeColorMeta = document.querySelector<HTMLMetaElement>("meta[name='theme-color']")

    const iconOrig = iconLink?.href
    const appleOrig = appleIconLink?.href
    const manifestOrig = manifestLink?.href
    const themeColorOrig = themeColorMeta?.content
    const titleOrig = document.title

    if (iconLink) iconLink.href = '/admin-favicon.png'
    if (appleIconLink) appleIconLink.href = '/icons/admin-apple-touch-icon.png'
    if (manifestLink) manifestLink.href = '/admin-manifest.webmanifest'
    if (themeColorMeta) themeColorMeta.content = '#0F172A'
    document.title = 'Avanxapp ERP — Super Admin Gateway'

    return () => {
      if (iconLink && iconOrig) iconLink.href = iconOrig
      if (appleIconLink && appleOrig) appleIconLink.href = appleOrig
      if (manifestLink && manifestOrig) manifestLink.href = manifestOrig
      if (themeColorMeta && themeColorOrig) themeColorMeta.content = themeColorOrig
      document.title = titleOrig || 'Avanxapp'
    }
  }, [])

  // 2. Control de Acceso y Blindaje de Seguridad
  const [autenticado, setAutenticado] = useState<boolean>(() => {
    return sessionStorage.getItem('avanx_admin_session') === 'active'
  })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorLogin, setErrorLogin] = useState<string | null>(null)
  const [intentosRestantes, setIntentosRestantes] = useState<number>(() => {
    const guardados = parseInt(localStorage.getItem('avanx_admin_attempts') || '0', 10)
    return Math.max(0, MAX_INTENTOS_FALLIDOS - guardados)
  })
  const [bloqueadoHasta, setBloqueadoHasta] = useState<number | null>(() => {
    const time = localStorage.getItem('avanx_admin_lockout')
    return time ? parseInt(time, 10) : null
  })
  const [segundosBloqueo, setSegundosBloqueo] = useState(0)

  useEffect(() => {
    if (!bloqueadoHasta) return
    const ahora = Date.now()
    if (ahora >= bloqueadoHasta) {
      localStorage.removeItem('avanx_admin_lockout')
      localStorage.removeItem('avanx_admin_attempts')
      setBloqueadoHasta(null)
      setIntentosRestantes(MAX_INTENTOS_FALLIDOS)
      return
    }

    setSegundosBloqueo(Math.ceil((bloqueadoHasta - ahora) / 1000))
    const interval = setInterval(() => {
      const remaining = Math.ceil((bloqueadoHasta - Date.now()) / 1000)
      if (remaining <= 0) {
        localStorage.removeItem('avanx_admin_lockout')
        localStorage.removeItem('avanx_admin_attempts')
        setBloqueadoHasta(null)
        setIntentosRestantes(MAX_INTENTOS_FALLIDOS)
        clearInterval(interval)
      } else {
        setSegundosBloqueo(remaining)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [bloqueadoHasta])

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorLogin(null)

    if (bloqueadoHasta && Date.now() < bloqueadoHasta) {
      setErrorLogin(`Bloqueo de seguridad activo. Espera ${segundosBloqueo} segundos.`)
      return
    }

    const emailLimpio = sanitizarEntrada(email)
    const passLimpio = password.trim()

    if (!validarEmail(emailLimpio)) {
      registrarIntentoFallido('Formato de correo inválido.')
      return
    }
    if (passLimpio.length < 8) {
      registrarIntentoFallido('Contraseña no cumple el estándar mínimo.')
      return
    }

    const esAdminAutorizado =
      emailLimpio.toLowerCase() === 'admin@avanxapp.com' && passLimpio === 'Avanxapp2026*'

    if (esAdminAutorizado) {
      localStorage.removeItem('avanx_admin_attempts')
      localStorage.removeItem('avanx_admin_lockout')
      sessionStorage.setItem('avanx_admin_session', 'active')
      setAutenticado(true)
    } else {
      registrarIntentoFallido('Credenciales de Super Admin no autorizadas.')
    }
  }

  function registrarIntentoFallido(mensaje: string) {
    const nuevosIntentos = parseInt(localStorage.getItem('avanx_admin_attempts') || '0', 10) + 1
    localStorage.setItem('avanx_admin_attempts', nuevosIntentos.toString())
    const restantes = Math.max(0, MAX_INTENTOS_FALLIDOS - nuevosIntentos)
    setIntentosRestantes(restantes)

    if (nuevosIntentos >= MAX_INTENTOS_FALLIDOS) {
      const lockoutTime = Date.now() + TIEMPO_BLOQUEO_MS
      localStorage.setItem('avanx_admin_lockout', lockoutTime.toString())
      setBloqueadoHasta(lockoutTime)
      setErrorLogin('Límite de intentos superado. Bloqueo de seguridad activado por 15 minutos.')
    } else {
      setErrorLogin(`${mensaje} Te quedan ${restantes} intento(s) antes del bloqueo.`)
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('avanx_admin_session')
    setAutenticado(false)
  }

  // --------------------------------------------------------------------------
  // 3. DATOS DE TENANTS (EMPRESAS) Y PLANES SUSCRIPCIÓN
  // --------------------------------------------------------------------------
  const [pestana, setPestana] = useState<'empresas' | 'planes'>('empresas')

  // Modales
  const [modalEmpresa, setModalEmpresa] = useState(false)
  const [modalPlan, setModalPlan] = useState(false)

  // Formulario Empresa
  const [nombreEmpresa, setNombreEmpresa] = useState('')
  const [slugEmpresa, setSlugEmpresa] = useState('')
  const [nitEmpresa, setNitEmpresa] = useState('')
  const [planParaEmpresa, setPlanParaEmpresa] = useState('plan_pro')

  // Formulario Plan
  const [nuevoPlanNombre, setNuevoPlanNombre] = useState('')
  const [nuevoPlanPrecio, setNuevoPlanPrecio] = useState('149000')
  const [nuevoPlanObras, setNuevoPlanObras] = useState('5')
  const [nuevoPlanUsuarios, setNuevoPlanUsuarios] = useState('3')
  const [nuevoPlanStorage, setNuevoPlanStorage] = useState('15')
  const [nuevoPlan3D, setNuevoPlan3D] = useState(true)
  const [nuevoPlanIA, setNuevoPlanIA] = useState(true)

  // Filtros de empresas
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activa' | 'en_prueba' | 'suspendida'>('todos')

  // Carga de datos locales (Dexie)
  const empresasDb = useLiveQuery(() => db.organizaciones.toArray(), [])
  const planesDb = useLiveQuery(() => db.planes.toArray(), [])

  // Inicializar con demos si la base está vacía
  const planes: PlanSuscripcion[] = planesDb && planesDb.length > 0 ? planesDb : PLANES_BASE
  const empresas: Organizacion[] = empresasDb && empresasDb.length > 0 ? empresasDb : EMPRESAS_BASE

  // Cálculo de MRR (Ingresos Recurrentes Mensuales)
  const mrrEstimado = useMemo(() => {
    const mapaPrecios = new Map<string, number>()
    planes.forEach((p) => mapaPrecios.set(p.id, p.precio_cop_mes))
    return empresas
      .filter((e) => e.estado === 'activa')
      .reduce((sum, e) => sum + (mapaPrecios.get(e.plan_id) || 199000), 0)
  }, [empresas, planes])

  const empresasFiltradas = useMemo(() => {
    return empresas.filter((org) => {
      const cumpleFiltro = filtroEstado === 'todos' || org.estado === filtroEstado
      const cumpleBusqueda =
        org.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        org.slug.toLowerCase().includes(busqueda.toLowerCase()) ||
        (org.nit_rut && org.nit_rut.includes(busqueda))
      return cumpleFiltro && cumpleBusqueda
    })
  }, [empresas, filtroEstado, busqueda])

  // Crear Empresa
  async function handleCrearEmpresa() {
    if (!nombreEmpresa.trim()) return

    const planElegido = planes.find((p) => p.id === planParaEmpresa)
    const nuevaOrg: Organizacion = {
      id: crypto.randomUUID(),
      nombre: nombreEmpresa.trim(),
      slug: slugEmpresa.trim() || nombreEmpresa.toLowerCase().replace(/\s+/g, '-'),
      nit_rut: nitEmpresa.trim() || undefined,
      plan_id: planParaEmpresa,
      estado: 'activa',
      limite_obras_activas: planElegido?.limite_obras || 10,
      limite_usuarios: planElegido?.limite_usuarios || 5,
      storage_usado_mb: 0,
      created_at: new Date().toISOString(),
    }

    await db.organizaciones.add(nuevaOrg)
    setNombreEmpresa('')
    setSlugEmpresa('')
    setNitEmpresa('')
    setModalEmpresa(false)
  }

  // Crear Nuevo Plan Comercial
  async function handleCrearPlan() {
    if (!nuevoPlanNombre.trim()) return

    const nuevoPlan: PlanSuscripcion = {
      id: `plan_${nuevoPlanNombre.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
      nombre: nuevoPlanNombre.trim(),
      precio_cop_mes: parseFloat(nuevoPlanPrecio) || 0,
      limite_obras: parseInt(nuevoPlanObras, 10) || 5,
      limite_usuarios: parseInt(nuevoPlanUsuarios, 10) || 2,
      limite_storage_gb: parseFloat(nuevoPlanStorage) || 10,
      soporte_3d: nuevoPlan3D,
      soporte_ia: nuevoPlanIA,
      created_at: new Date().toISOString(),
    }

    await db.planes.add(nuevoPlan)
    setNuevoPlanNombre('')
    setModalPlan(false)
  }

  // Conmutar estado de servicio de una empresa
  async function toggleEstado(org: Organizacion) {
    const nuevoEstado = org.estado === 'activa' ? 'suspendida' : 'activa'
    await db.organizaciones.update(org.id, { estado: nuevoEstado })
  }

  // --------------------------------------------------------------------------
  // GATEWAY DE ACCESO BLINDADO
  // --------------------------------------------------------------------------
  if (!autenticado) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950 p-4 antialiased">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center">
            <div className="relative mx-auto flex size-20 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 p-3 shadow-2xl">
              <img src="/admin-favicon.png" alt="Avanxapp ERP" className="size-full object-contain" />
              <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-orange text-[10px] font-black text-white ring-2 ring-slate-900">
                ★
              </span>
            </div>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-orange/10 px-3 py-1 text-[11px] font-extrabold tracking-wider text-orange uppercase">
              <ShieldCheck className="size-3.5" /> Super Admin Gateway
            </span>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white">
              Avanxapp Platform ERP
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Entorno administrativo exclusivo para el control de empresas clientes y licencias.
            </p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleLoginSubmit} noValidate>
            <div>
              <label className="text-xs font-bold text-slate-300">Correo Electrónico de Super Admin</label>
              <Input
                type="email"
                placeholder="admin@avanxapp.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={Boolean(bloqueadoHasta)}
                className="mt-1 border-slate-700 bg-slate-950 text-sm text-white placeholder:text-slate-600 focus:border-orange"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300">Llave Maestra de Acceso</label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={Boolean(bloqueadoHasta)}
                  className="border-slate-700 bg-slate-950 pr-10 text-sm text-white placeholder:text-slate-600 focus:border-orange"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 grid w-10 place-items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {errorLogin && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300">
                <ShieldAlert className="size-4 shrink-0 text-red-400" />
                <p>{errorLogin}</p>
              </div>
            )}

            {bloqueadoHasta && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-950/40 p-3 text-center text-xs font-bold text-amber-300">
                <AlertTriangle className="mr-1 inline size-4 text-amber-400" />
                Bloqueo activo: {segundosBloqueo}s restantes
              </div>
            )}

            <Button
              type="submit"
              disabled={Boolean(bloqueadoHasta)}
              className="w-full bg-orange text-sm font-bold text-white hover:brightness-95"
            >
              <KeyRound className="mr-2 size-4" />
              Autenticar y Acceder
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-800 pt-4 text-center">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="size-3.5" /> Blindaje SQLi & BruteForce
              </span>
              <span>Intentos: {intentosRestantes}/5</span>
            </div>
            <p className="mt-2 text-[10px] text-slate-500">
              Acceso local demo: <code className="text-orange">admin@avanxapp.com</code> / <code className="text-orange">Avanxapp2026*</code>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // INTERFAZ DE SUPER ADMIN ERP AISLADA E INDEPENDIENTE
  // --------------------------------------------------------------------------
  return (
    <div className="flex min-h-dvh bg-slate-950 text-slate-100">
      {/* SIDEBAR FIJO DESKTOP */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-slate-800/80 bg-slate-900/95 p-5 md:flex">
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="flex size-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 p-1.5 shadow-md">
              <img src="/admin-favicon.png" alt="Avanxapp ERP" className="size-full object-contain" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold tracking-widest text-orange uppercase">
                Avanxapp Platform
              </p>
              <h2 className="text-base font-black tracking-tight text-white">Super Admin ERP</h2>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => setPestana('empresas')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold transition-all ${
                pestana === 'empresas'
                  ? 'bg-orange text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Building className="size-4" />
              Empresas Clientes ({empresas.length})
            </button>

            <button
              type="button"
              onClick={() => setPestana('planes')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold transition-all ${
                pestana === 'planes'
                  ? 'bg-orange text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <CreditCard className="size-4" />
              Planes & Suscripciones ({planes.length})
            </button>
          </nav>
        </div>

        <div className="border-t border-slate-800 pt-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="truncate">
              <p className="font-bold text-white">admin@avanxapp.com</p>
              <p className="text-[10px] text-emerald-400">Super Admin Activo</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg p-2 text-slate-400 hover:bg-red-950/40 hover:text-red-400"
              title="Cerrar sesión"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ÁREA DE TRABAJO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8">
        {/* Cabecera Superior */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <span>Avanxapp SaaS</span>
              <span>/</span>
              <span className="text-orange capitalize">
                {pestana === 'empresas' ? 'Empresas Clientes' : 'Planes & Precios'}
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
              {pestana === 'empresas'
                ? 'Gestión de Empresas & Licencias'
                : 'Configurador de Planes & Oferta Comercial'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {pestana === 'empresas' ? (
              <Button
                onClick={() => setModalEmpresa(true)}
                className="h-10 gap-2 bg-orange px-4 text-xs font-bold text-white shadow-lg hover:brightness-95"
              >
                <Plus className="size-4" />
                Dar de Alta Empresa
              </Button>
            ) : (
              <Button
                onClick={() => setModalPlan(true)}
                className="h-10 gap-2 bg-orange px-4 text-xs font-bold text-white shadow-lg hover:brightness-95"
              >
                <Plus className="size-4" />
                Crear Nuevo Plan
              </Button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="flex size-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-red-400 md:hidden"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </header>

        {/* METRICAS DE FACTURACIÓN & NEGOCIO */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm backdrop-blur-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold">Empresas Activas</span>
              <Building className="size-4 text-orange" />
            </div>
            <p className="mt-2 text-2xl font-black text-white sm:text-3xl">
              {empresas.filter((e) => e.estado === 'activa').length}
              <span className="text-xs font-medium text-slate-500"> / {empresas.length}</span>
            </p>
            <span className="mt-1 text-[11px] text-emerald-400 font-bold">Clientes con servicio ON</span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm backdrop-blur-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold">MRR Proyectado (COP)</span>
              <DollarSign className="size-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-400 sm:text-3xl">
              {formatearCOP(mrrEstimado)}
            </p>
            <span className="mt-1 text-[11px] text-slate-400">Ingresos mensuales recurrentes</span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm backdrop-blur-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold">Empresas en Prueba</span>
              <Sparkles className="size-4 text-cyan-400" />
            </div>
            <p className="mt-2 text-2xl font-black text-white sm:text-3xl">
              {empresas.filter((e) => e.estado === 'en_prueba').length}
            </p>
            <span className="mt-1 text-[11px] text-cyan-400">Trials activos</span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm backdrop-blur-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold">Planes Disponibles</span>
              <CreditCard className="size-4 text-orange" />
            </div>
            <p className="mt-2 text-2xl font-black text-white sm:text-3xl">{planes.length}</p>
            <span className="mt-1 text-[11px] text-slate-400">Ofertas comerciales activas</span>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* PESTAÑA 1: GESTIÓN DE EMPRESAS CLIENTES                            */}
        {/* ------------------------------------------------------------------ */}
        {pestana === 'empresas' && (
          <div className="mt-8 space-y-4">
            {/* Buscador y Filtros */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
              <div className="relative min-w-[260px] flex-1 sm:max-w-md">
                <Search className="absolute left-3 top-2.5 size-4 text-slate-500" />
                <Input
                  placeholder="Buscar por constructora, NIT o identificador..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="h-9 border-slate-800 bg-slate-950 pl-9 text-xs text-white placeholder:text-slate-500 focus:border-orange"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs font-semibold">
                {(['todos', 'activa', 'en_prueba', 'suspendida'] as const).map((estado) => (
                  <button
                    key={estado}
                    type="button"
                    onClick={() => setFiltroEstado(estado)}
                    className={`rounded-lg px-3 py-1.5 capitalize transition-all ${
                      filtroEstado === estado
                        ? 'bg-slate-800 text-white font-bold ring-1 ring-slate-700'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {estado === 'todos' ? 'Todas' : estado.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Tabla de Empresas */}
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3.5">Empresa Cliente</th>
                      <th className="px-4 py-3.5">Plan de Servicio</th>
                      <th className="px-4 py-3.5">Cupo de Obras</th>
                      <th className="px-4 py-3.5">Identificador (Slug)</th>
                      <th className="px-4 py-3.5">Estado</th>
                      <th className="px-5 py-3.5 text-right">Interruptor de Servicio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {empresasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                          No se encontraron empresas con los criterios seleccionados.
                        </td>
                      </tr>
                    ) : (
                      empresasFiltradas.map((org) => {
                        const planActual = planes.find((p) => p.id === org.plan_id)
                        return (
                          <tr key={org.id} className="transition-colors hover:bg-slate-800/40">
                            <td className="px-5 py-3.5">
                              <div className="font-bold text-white">{org.nombre}</div>
                              <span className="text-[10px] text-slate-400">
                                {org.nit_rut ? `NIT: ${org.nit_rut}` : 'Sin NIT'}
                              </span>
                            </td>

                            <td className="px-4 py-3.5">
                              <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-200">
                                {planActual?.nombre || org.plan_id.replace('plan_', '')}
                              </span>
                              <p className="mt-0.5 text-[10px] text-emerald-400">
                                {formatearCOP(planActual?.precio_cop_mes || 199000)}/mes
                              </p>
                            </td>

                            <td className="px-4 py-3.5 text-slate-300">
                              Hasta {org.limite_obras_activas || planActual?.limite_obras || 5} obras
                            </td>

                            <td className="px-4 py-3.5 font-mono text-slate-400">{org.slug}</td>

                            <td className="px-4 py-3.5">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                                  org.estado === 'activa'
                                    ? 'bg-emerald-950/60 text-emerald-400 ring-1 ring-emerald-500/30'
                                    : org.estado === 'en_prueba'
                                      ? 'bg-cyan-950/60 text-cyan-400 ring-1 ring-cyan-500/30'
                                      : 'bg-red-950/60 text-red-400 ring-1 ring-red-500/30'
                                }`}
                              >
                                <span
                                  className={`size-1.5 rounded-full ${
                                    org.estado === 'activa'
                                      ? 'bg-emerald-400'
                                      : org.estado === 'en_prueba'
                                        ? 'bg-cyan-400'
                                        : 'bg-red-400'
                                  }`}
                                />
                                {org.estado.replace('_', ' ')}
                              </span>
                            </td>

                            <td className="px-5 py-3.5 text-right">
                              <Button
                                variant="outline"
                                onClick={() => toggleEstado(org)}
                                className={`h-8 gap-1.5 px-3 text-xs font-bold transition-all ${
                                  org.estado === 'activa'
                                    ? 'border-slate-700 bg-slate-900 text-slate-300 hover:border-red-500 hover:text-red-400'
                                    : 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40'
                                }`}
                              >
                                <Power className="size-3.5" />
                                {org.estado === 'activa' ? 'Suspender Servicio' : 'Activar Servicio'}
                              </Button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* PESTAÑA 2: CONFIGURADOR DE PLANES Y OFERTA COMERCIAL               */}
        {/* ------------------------------------------------------------------ */}
        {pestana === 'planes' && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Planes Comerciales de Avanxapp</h3>
                <p className="text-xs text-slate-400">
                  Define los precios, límites y características que podrán contratar las constructoras.
                </p>
              </div>
              <Button
                onClick={() => setModalPlan(true)}
                className="h-9 gap-1.5 bg-orange px-3 text-xs font-bold text-white hover:brightness-95"
              >
                <Plus className="size-4" /> Crear Nuevo Plan
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {planes.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg backdrop-blur-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-bold text-white">{p.nombre}</h4>
                      <span className="rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-extrabold text-orange uppercase">
                        Activo
                      </span>
                    </div>

                    <div className="mt-3">
                      <span className="text-2xl font-black text-white">{formatearCOP(p.precio_cop_mes)}</span>
                      <span className="text-xs text-slate-400 font-medium"> / mes</span>
                    </div>

                    <ul className="mt-4 space-y-2 border-t border-slate-800/80 pt-4 text-xs text-slate-300">
                      <li className="flex items-center gap-2">
                        <Check className="size-3.5 text-emerald-400" />
                        Hasta <strong className="text-white">{p.limite_obras} obras</strong> activas
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-3.5 text-emerald-400" />
                        Hasta <strong className="text-white">{p.limite_usuarios} ingenieros</strong> / miembros
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-3.5 text-emerald-400" />
                        <strong className="text-white">{p.limite_storage_gb} GB</strong> de almacenamiento en la nube
                      </li>
                      <li className="flex items-center gap-2">
                        {p.soporte_3d ? (
                          <Check className="size-3.5 text-emerald-400" />
                        ) : (
                          <X className="size-3.5 text-slate-500" />
                        )}
                        Visor 3D y Renders 360° incluidos
                      </li>
                      <li className="flex items-center gap-2">
                        {p.soporte_ia ? (
                          <Check className="size-3.5 text-emerald-400" />
                        ) : (
                          <X className="size-3.5 text-slate-500" />
                        )}
                        Groq IA (Whisper LPU + Llama 3)
                      </li>
                    </ul>
                  </div>

                  <p className="mt-5 text-[10px] text-slate-500 border-t border-slate-800/60 pt-3">
                    ID Plan: {p.id}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: DAR DE ALTA EMPRESA */}
      <Dialog
        open={modalEmpresa}
        onClose={() => setModalEmpresa(false)}
        title="Dar de Alta Nueva Constructora / Empresa"
        description="Aprovisiona una nueva organización para otorgarle acceso a Avanxapp."
      >
        <div className="grid gap-3">
          <Field label="Razón Social / Nombre Comercial" htmlFor="org-nombre">
            <Input
              id="org-nombre"
              placeholder="Ej. Constructora Hábitat S.A.S."
              value={nombreEmpresa}
              onChange={(e) => setNombreEmpresa(e.target.value)}
            />
          </Field>

          <Field label="NIT / RUT de la Empresa" htmlFor="org-nit">
            <Input
              id="org-nit"
              placeholder="Ej. 901.458.120-1"
              value={nitEmpresa}
              onChange={(e) => setNitEmpresa(e.target.value)}
            />
          </Field>

          <Field label="Identificador Único (Slug)" htmlFor="org-slug">
            <Input
              id="org-slug"
              placeholder="constructora-habitat"
              value={slugEmpresa}
              onChange={(e) => setSlugEmpresa(e.target.value)}
            />
          </Field>

          <Field label="Plan Comercial Asignado" htmlFor="org-plan">
            <select
              id="org-plan"
              value={planParaEmpresa}
              onChange={(e) => setPlanParaEmpresa(e.target.value)}
              className="w-full rounded-sm border border-gray-300 p-2 text-sm text-navy"
            >
              {planes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} — {formatearCOP(p.precio_cop_mes)}/mes (Hasta {p.limite_obras} obras)
                </option>
              ))}
            </select>
          </Field>

          <div className="mt-3 flex gap-2">
            <Button variant="outline" className="w-1/3" onClick={() => setModalEmpresa(false)}>
              Cancelar
            </Button>
            <Button
              className="w-2/3 bg-orange text-white hover:brightness-95"
              onClick={handleCrearEmpresa}
            >
              Aprovisionar Empresa
            </Button>
          </div>
        </div>
      </Dialog>

      {/* MODAL 2: CREAR NUEVO PLAN COMERCIAL */}
      <Dialog
        open={modalPlan}
        onClose={() => setModalPlan(false)}
        title="Crear Nuevo Plan de Suscripción"
        description="Configura una nueva tarifa y límites para ofrecer a tus clientes B2B."
      >
        <div className="grid gap-3">
          <Field label="Nombre Comercial del Plan" htmlFor="plan-nom">
            <Input
              id="plan-nom"
              placeholder="Ej. Plan Arquitectos & Diseñadores"
              value={nuevoPlanNombre}
              onChange={(e) => setNuevoPlanNombre(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Precio Mensual (COP)" htmlFor="plan-pre">
              <Input
                id="plan-pre"
                type="number"
                placeholder="199000"
                value={nuevoPlanPrecio}
                onChange={(e) => setNuevoPlanPrecio(e.target.value)}
              />
            </Field>

            <Field label="Límite Obras Activas" htmlFor="plan-obr">
              <Input
                id="plan-obr"
                type="number"
                placeholder="10"
                value={nuevoPlanObras}
                onChange={(e) => setNuevoPlanObras(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Límite Usuarios / Ing." htmlFor="plan-usr">
              <Input
                id="plan-usr"
                type="number"
                placeholder="5"
                value={nuevoPlanUsuarios}
                onChange={(e) => setNuevoPlanUsuarios(e.target.value)}
              />
            </Field>

            <Field label="Almacenamiento (GB)" htmlFor="plan-sto">
              <Input
                id="plan-sto"
                type="number"
                placeholder="20"
                value={nuevoPlanStorage}
                onChange={(e) => setNuevoPlanStorage(e.target.value)}
              />
            </Field>
          </div>

          <div className="rounded-sm border border-gray-200 bg-gray-50 p-2.5 space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
              <input
                type="checkbox"
                checked={nuevoPlan3D}
                onChange={(e) => setNuevoPlan3D(e.target.checked)}
                className="size-4 rounded text-orange"
              />
              Habilitar Visor 3D y Renders 360°
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
              <input
                type="checkbox"
                checked={nuevoPlanIA}
                onChange={(e) => setNuevoPlanIA(e.target.checked)}
                className="size-4 rounded text-orange"
              />
              Habilitar Copiloto Groq IA (Whisper + Llama 3)
            </label>
          </div>

          <div className="mt-3 flex gap-2">
            <Button variant="outline" className="w-1/3" onClick={() => setModalPlan(false)}>
              Cancelar
            </Button>
            <Button
              className="w-2/3 bg-orange text-white hover:brightness-95"
              onClick={handleCrearPlan}
            >
              Publicar Nuevo Plan
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
