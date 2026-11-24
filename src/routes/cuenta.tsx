import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Building2,
  Check,
  Eye,
  FileSpreadsheet,
  Hammer,
  HardHat,
  ImageIcon,
  Lock,
  LogOut,
  Palette,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UploadCloud,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/input'
import {
  PLANTILLA_ACABADOS,
  PLANTILLA_ADECUACIONES,
  PLANTILLA_COCINA_PREMIUM,
  PLANTILLA_OBRA_NUEVA,
  PLANTILLA_REMODELACION,
  type EtapaPlantilla,
  type PlantillaPersonalizada,
} from '@/lib/obras'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export const Route = createFileRoute('/cuenta')({
  component: CuentaPage,
})

export type EspecialidadEmpresa =
  | 'remodelacion'
  | 'construccion'
  | 'adecuaciones'
  | 'acabados'

export interface Colaborador {
  id: string
  nombre: string
  email: string
  rol: 'Administrador' | 'Ingeniero Residente' | 'Director de Proyecto' | 'Maestro General'
}

export function CuentaPage() {
  // Simulación de rol del usuario actual autenticado (por defecto Administrador/Dueño de la Empresa)
  const [rolUsuarioActual, setRolUsuarioActual] = useState<'Administrador' | 'Ingeniero Residente'>(() => {
    return (localStorage.getItem('avanx_usuario_rol_activo') as any) || 'Administrador'
  })

  const esAdmin = rolUsuarioActual === 'Administrador'

  // Datos de la empresa (persistidos localmente y sincronizables)
  const [razonSocial, setRazonSocial] = useState(() => {
    return localStorage.getItem('avanx_empresa_nombre') || 'Mi Empresa de Construcción'
  })
  const [nit, setNit] = useState(() => {
    return localStorage.getItem('avanx_empresa_nit') || '901.000.000-1'
  })
  const [telefono, setTelefono] = useState(() => {
    return localStorage.getItem('avanx_empresa_tel') || '300 123 4567'
  })
  const [especialidad, setEspecialidad] = useState<EspecialidadEmpresa>(() => {
    return (localStorage.getItem('avanx_empresa_esp') as EspecialidadEmpresa) || 'remodelacion'
  })
  const [colorMarca, setColorMarca] = useState(() => {
    return localStorage.getItem('avanx_empresa_color') || '#0B2D5B'
  })
  const [logoEmpresa, setLogoEmpresa] = useState<string>(() => {
    return localStorage.getItem('avanx_empresa_logo') || ''
  })
  const [mostrarNombreJuntoALogo, setMostrarNombreJuntoALogo] = useState<boolean>(() => {
    const val = localStorage.getItem('avanx_empresa_mostrar_nombre_logo')
    return val !== null ? val === 'true' : true
  })

  // Plantillas personalizadas de proyectos
  const [plantillas, setPlantillas] = useState<PlantillaPersonalizada[]>(() => {
    const guardado = localStorage.getItem('avanx_empresa_plantillas')
    if (guardado) {
      try {
        return JSON.parse(guardado)
      } catch {
        // fallback
      }
    }
    return [
      {
        id: 'p-cocina-1',
        nombre: 'Cocina Integral de Lujo',
        tipo: 'remodelacion',
        descripcion: 'Para carpintería arquitectónica, mesón de cuarzo y puntos de gas/agua.',
        etapas: PLANTILLA_COCINA_PREMIUM,
      },
      {
        id: 'p-remod-1',
        nombre: 'Remodelación Apartamento Completo',
        tipo: 'remodelacion',
        descripcion: 'Demolición, adecuación de redes, drywall, enchape y pintura general.',
        etapas: PLANTILLA_REMODELACION,
      },
      {
        id: 'p-obra-1',
        nombre: 'Construcción Obra Nueva / Casa',
        tipo: 'obra_nueva',
        descripcion: 'Cimentación, estructura, mampostería e instalaciones técnicas.',
        etapas: PLANTILLA_OBRA_NUEVA,
      },
    ]
  })

  // Modal para ver y editar plantilla completa
  const [plantillaDetalle, setPlantillaDetalle] = useState<PlantillaPersonalizada | null>(null)
  const [editandoFases, setEditandoFases] = useState<EtapaPlantilla[]>([])
  const [nombrePlantillaEdit, setNombrePlantillaEdit] = useState('')
  const [descPlantillaEdit, setDescPlantillaEdit] = useState('')

  // Formulario nueva plantilla rápida
  const [creandoPlantilla, setCreandoPlantilla] = useState(false)
  const [nombreNuevaPlantilla, setNombreNuevaPlantilla] = useState('')
  const [descNuevaPlantilla, setDescNuevaPlantilla] = useState('')
  const [tipoNuevaPlantilla, setTipoNuevaPlantilla] = useState<'remodelacion' | 'obra_nueva'>('remodelacion')

  // Miembros de equipo
  const [equipo, setEquipo] = useState<Colaborador[]>(() => {
    const guardado = localStorage.getItem('avanx_empresa_equipo')
    if (guardado) {
      try {
        return JSON.parse(guardado)
      } catch {
        // fallback
      }
    }
    return [
      {
        id: 'admin-1',
        nombre: 'Tú (Gerente General)',
        email: 'gerencia@empresa.com',
        rol: 'Administrador',
      },
      {
        id: '1',
        nombre: 'Ing. Carlos Mendoza',
        email: 'carlos.mendoza@empresa.com',
        rol: 'Ingeniero Residente',
      },
      {
        id: '2',
        nombre: 'Arq. Laura Rivas',
        email: 'laura.rivas@empresa.com',
        rol: 'Director de Proyecto',
      },
    ]
  })

  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoEmail, setNuevoEmail] = useState('')
  const [nuevoRol, setNuevoRol] = useState<Colaborador['rol']>('Ingeniero Residente')
  const [guardadoExitoso, setGuardadoExitoso] = useState(false)

  // Manejador del logo
  function handleLogoSubido(e: React.ChangeEvent<HTMLInputElement>) {
    if (!esAdmin) return
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoEmpresa(reader.result)
        localStorage.setItem('avanx_empresa_logo', reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  // Guardar configuración completa
  function handleGuardarConfiguracion() {
    if (!esAdmin) {
      alert('Solo el Administrador tiene permisos para modificar la configuración corporativa.')
      return
    }
    localStorage.setItem('avanx_empresa_nombre', razonSocial)
    localStorage.setItem('avanx_empresa_nit', nit)
    localStorage.setItem('avanx_empresa_tel', telefono)
    localStorage.setItem('avanx_empresa_esp', especialidad)
    localStorage.setItem('avanx_empresa_color', colorMarca)
    localStorage.setItem('avanx_empresa_logo', logoEmpresa)
    localStorage.setItem('avanx_empresa_mostrar_nombre_logo', String(mostrarNombreJuntoALogo))
    localStorage.setItem('avanx_empresa_plantillas', JSON.stringify(plantillas))
    localStorage.setItem('avanx_empresa_equipo', JSON.stringify(equipo))

    setGuardadoExitoso(true)
    setTimeout(() => setGuardadoExitoso(false), 2500)
  }

  // Abrir visor / editor de plantilla al hacer clic
  function abrirVisorPlantilla(p: PlantillaPersonalizada) {
    setPlantillaDetalle(p)
    setNombrePlantillaEdit(p.nombre)
    setDescPlantillaEdit(p.descripcion || '')
    setEditandoFases(JSON.parse(JSON.stringify(p.etapas)))
  }

  // Guardar cambios dentro del modal de la plantilla
  function handleGuardarEdicionPlantilla() {
    if (!plantillaDetalle) return
    const actualizadas = plantillas.map((p) => {
      if (p.id === plantillaDetalle.id) {
        return {
          ...p,
          nombre: nombrePlantillaEdit.trim() || p.nombre,
          descripcion: descPlantillaEdit.trim(),
          etapas: editandoFases,
        }
      }
      return p
    })
    setPlantillas(actualizadas)
    localStorage.setItem('avanx_empresa_plantillas', JSON.stringify(actualizadas))
    setPlantillaDetalle(null)
  }

  function handleCrearPlantilla() {
    if (!nombreNuevaPlantilla.trim()) return
    const baseEtapas =
      tipoNuevaPlantilla === 'remodelacion'
        ? especialidad === 'acabados'
          ? PLANTILLA_ACABADOS
          : especialidad === 'adecuaciones'
            ? PLANTILLA_ADECUACIONES
            : PLANTILLA_REMODELACION
        : PLANTILLA_OBRA_NUEVA

    const nueva: PlantillaPersonalizada = {
      id: crypto.randomUUID(),
      nombre: nombreNuevaPlantilla.trim(),
      tipo: tipoNuevaPlantilla,
      descripcion: descNuevaPlantilla.trim() || 'Plantilla estandarizada de fases y suministros.',
      etapas: baseEtapas,
    }

    const actualizadas = [...plantillas, nueva]
    setPlantillas(actualizadas)
    localStorage.setItem('avanx_empresa_plantillas', JSON.stringify(actualizadas))
    setNombreNuevaPlantilla('')
    setDescNuevaPlantilla('')
    setCreandoPlantilla(false)
  }

  function handleEliminarPlantilla(id: string) {
    const actualizadas = plantillas.filter((p) => p.id !== id)
    setPlantillas(actualizadas)
    localStorage.setItem('avanx_empresa_plantillas', JSON.stringify(actualizadas))
  }

  function handleAgregarMiembro() {
    if (!esAdmin) {
      alert('Solo el Administrador puede agregar miembros y gestionar roles.')
      return
    }
    if (!nuevoNombre.trim() || !nuevoEmail.trim()) return
    const nuevo: Colaborador = {
      id: crypto.randomUUID(),
      nombre: nuevoNombre.trim(),
      email: nuevoEmail.trim(),
      rol: nuevoRol,
    }
    const nuevoEquipo = [...equipo, nuevo]
    setEquipo(nuevoEquipo)
    localStorage.setItem('avanx_empresa_equipo', JSON.stringify(nuevoEquipo))
    setNuevoNombre('')
    setNuevoEmail('')
  }

  function handleEliminarMiembro(id: string) {
    if (!esAdmin) {
      alert('Solo el Administrador puede eliminar miembros.')
      return
    }
    const nuevoEquipo = equipo.filter((m) => m.id !== id)
    setEquipo(nuevoEquipo)
    localStorage.setItem('avanx_empresa_equipo', JSON.stringify(nuevoEquipo))
  }

  async function handleCerrarSesion() {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut()
    }
    window.location.href = '/login'
  }

  return (
    <div className="grid gap-6">
      {/* Encabezado y Switch de Rol para Pruebas RBAC */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold tracking-wider text-orange uppercase">
              Centro de Control Corporativo
            </span>
            <Badge
              variant={esAdmin ? 'blue' : 'gray'}
              className="text-[10px] font-bold"
            >
              {esAdmin ? <ShieldCheck className="size-3 mr-1 inline" /> : <Lock className="size-3 mr-1 inline" />}
              Sesión: {rolUsuarioActual}
            </Badge>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-navy">
            Configuración & Marca de Empresa
          </h1>
          <p className="text-xs text-gray-500">
            {esAdmin
              ? 'Control total sobre marca blanca, permisos de equipo y plantillas de trabajo.'
              : 'Modo lectura: Solo los administradores pueden alterar credenciales o el equipo.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Selector de rol para verificar RBAC */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-sm border border-gray-200 bg-white p-1 text-[11px]">
            <span className="text-gray-400 font-bold px-1">Probar Rol:</span>
            <button
              type="button"
              onClick={() => {
                setRolUsuarioActual('Administrador')
                localStorage.setItem('avanx_usuario_rol_activo', 'Administrador')
              }}
              className={`rounded-xs px-2 py-0.5 font-bold ${
                esAdmin ? 'bg-navy text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => {
                setRolUsuarioActual('Ingeniero Residente')
                localStorage.setItem('avanx_usuario_rol_activo', 'Ingeniero Residente')
              }}
              className={`rounded-xs px-2 py-0.5 font-bold ${
                !esAdmin ? 'bg-orange text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Residente
            </button>
          </div>

          {esAdmin && (
            <Button
              onClick={handleGuardarConfiguracion}
              className="h-10 gap-2 bg-navy px-4 text-xs font-bold text-white hover:bg-navy-hover shadow-xs"
            >
              {guardadoExitoso ? <Check className="size-4 text-emerald-400" /> : <Save className="size-4" />}
              {guardadoExitoso ? 'Configuración Guardada' : 'Guardar Cambios'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* TARJETA 1: IDENTIDAD Y ESPECIALIDAD */}
        <Card className="space-y-4 shadow-soft">
          <CardTitle className="flex items-center gap-2 text-base text-navy font-bold">
            <Building2 className="size-4 text-orange" />
            Perfil & Especialidad del Negocio
          </CardTitle>
          <CardDescription className="text-xs">
            Ajusta los datos contractuales y el tipo de proyectos que realizas.
          </CardDescription>

          <Field label="Razón Social / Nombre Comercial" htmlFor="empresa-nombre">
            <Input
              id="empresa-nombre"
              disabled={!esAdmin}
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              placeholder="Ej. Espacios & Cocinas Modernas SAS"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="NIT / Documento" htmlFor="empresa-nit">
              <Input
                id="empresa-nit"
                disabled={!esAdmin}
                value={nit}
                onChange={(e) => setNit(e.target.value)}
                placeholder="901.123.456-7"
              />
            </Field>
            <Field label="Teléfono de Contacto" htmlFor="empresa-tel">
              <Input
                id="empresa-tel"
                disabled={!esAdmin}
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="300 123 4567"
              />
            </Field>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700">Especialidad Principal</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                {
                  id: 'remodelacion',
                  label: 'Remodelaciones & Cocinas',
                  desc: 'Cocinas, baños, acabados e interiores',
                  icon: Hammer,
                },
                {
                  id: 'construccion',
                  label: 'Construcción / Obra Nueva',
                  desc: 'Cimentación, estructura y obra gris',
                  icon: HardHat,
                },
                {
                  id: 'adecuaciones',
                  label: 'Adecuación Comercial',
                  desc: 'Locales comerciales y oficinas',
                  icon: Building2,
                },
                {
                  id: 'acabados',
                  label: 'Acabados & Drywall',
                  desc: 'Pintura, cielo rasos y pisos',
                  icon: Palette,
                },
              ].map(({ id, label, desc, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  disabled={!esAdmin}
                  onClick={() => setEspecialidad(id as EspecialidadEmpresa)}
                  className={`flex flex-col items-start rounded-lg border p-3 text-left transition-all ${
                    especialidad === id
                      ? 'border-orange bg-orange/5 ring-1 ring-orange'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-navy">
                    <Icon className="size-3.5 text-orange" />
                    {label}
                  </div>
                  <span className="mt-1 text-[10px] text-gray-500 leading-tight">{desc}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* TARJETA 2: MARCA BLANCA (LOGO Y VISUALIZACIÓN EN PORTAL) */}
        <Card className="space-y-4 shadow-soft">
          <CardTitle className="flex items-center gap-2 text-base text-navy font-bold">
            <Palette className="size-4 text-orange" />
            Marca Blanca para tus Clientes
          </CardTitle>
          <CardDescription className="text-xs">
            Personaliza cómo verán el portal web tus clientes (logo, color y cabecera).
          </CardDescription>

          {/* Subida de Logo */}
          <div>
            <label className="text-xs font-bold text-gray-700">Logo Oficial de tu Empresa</label>
            <div className="mt-1.5 flex items-center gap-3">
              {logoEmpresa ? (
                <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white p-1 shadow-2xs">
                  <img src={logoEmpresa} alt="Logo Empresa" className="size-full object-contain" />
                </div>
              ) : (
                <div className="grid size-16 shrink-0 place-items-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-400">
                  <ImageIcon className="size-6" />
                </div>
              )}

              <div className="flex-1">
                {esAdmin && (
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-navy shadow-xs hover:bg-gray-50">
                    <UploadCloud className="size-4 text-orange" />
                    {logoEmpresa ? 'Cambiar Logo' : 'Subir Logo (PNG/JPG)'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={handleLogoSubido}
                    />
                  </label>
                )}
                {logoEmpresa && esAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoEmpresa('')
                      localStorage.removeItem('avanx_empresa_logo')
                    }}
                    className="ml-2 text-[11px] text-red-600 hover:underline"
                  >
                    Eliminar
                  </button>
                )}
                <p className="mt-1 text-[10px] text-gray-500">
                  Formato horizontal o cuadrado con fondo transparente o blanco.
                </p>
              </div>
            </div>
          </div>

          {/* Opción: Mostrar o no el nombre junto al logo */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-2.5">
            <div>
              <p className="text-xs font-bold text-navy">Mostrar Nombre junto al Logo</p>
              <p className="text-[10px] text-gray-500">
                Si tu logo ya incluye el texto de tu empresa, puedes apagar esto para que solo se vea el logo.
              </p>
            </div>
            <input
              type="checkbox"
              disabled={!esAdmin}
              checked={mostrarNombreJuntoALogo}
              onChange={(e) => setMostrarNombreJuntoALogo(e.target.checked)}
              className="size-4 rounded-sm border-gray-300 text-navy cursor-pointer"
            />
          </div>

          {/* Selector de Color Corporativo */}
          <div>
            <label className="text-xs font-bold text-gray-700">Color Primario Corporativo</label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="color"
                disabled={!esAdmin}
                value={colorMarca}
                onChange={(e) => setColorMarca(e.target.value)}
                className="size-10 cursor-pointer rounded-lg border border-gray-300"
              />
              <span className="font-mono text-xs font-bold text-navy uppercase">{colorMarca}</span>

              {esAdmin && (
                <div className="flex gap-1.5">
                  {['#0B2D5B', '#0F172A', '#1E3A8A', '#065F46', '#991B1B'].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setColorMarca(col)}
                      className="size-6 rounded-full border border-gray-300 transition-transform hover:scale-110"
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Vista Previa de la cabecera del portal cliente */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase">
              Vista Previa en el Portal del Cliente:
            </span>
            <div
              className="mt-2 rounded-lg p-3 text-white shadow-2xs transition-colors"
              style={{ backgroundColor: colorMarca }}
            >
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  {logoEmpresa && (
                    <img src={logoEmpresa} alt="Logo" className="h-6 w-auto rounded-xs bg-white/90 p-0.5 object-contain" />
                  )}
                  {(!logoEmpresa || mostrarNombreJuntoALogo) && (
                    <span className="font-extrabold">{razonSocial || 'Tu Empresa'}</span>
                  )}
                </div>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">● Portal en Vivo</span>
              </div>
              <p className="mt-2 text-sm font-bold">Avance de tu Proyecto: 65%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* TARJETA 3: GESTOR DE PLANTILLAS PROPIAS ESTANDARIZADAS */}
      <Card className="space-y-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-navy font-bold">
              <FileSpreadsheet className="size-4 text-orange" />
              Gestor de Plantillas Estandarizadas de Proyectos
            </CardTitle>
            <CardDescription className="text-xs">
              Haz clic en cualquier plantilla para ver sus fases, metas y suministros asociados, o editarla.
            </CardDescription>
          </div>
          {esAdmin && (
            <Button
              onClick={() => setCreandoPlantilla(true)}
              className="h-8 gap-1.5 bg-orange px-3 text-xs text-white hover:brightness-95"
            >
              <Plus className="size-3.5" /> Nueva Plantilla
            </Button>
          )}
        </div>

        {/* Modal / Formulario para crear plantilla rápida */}
        {creandoPlantilla && (
          <div className="rounded-lg border border-orange/30 bg-orange/5 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-navy">Crear Nueva Plantilla de Trabajo</h4>
              <button
                type="button"
                onClick={() => setCreandoPlantilla(false)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Cancelar
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="Nombre (ej. Remodelación Cocina Tipo Isla)"
                value={nombreNuevaPlantilla}
                onChange={(e) => setNombreNuevaPlantilla(e.target.value)}
                className="h-8 text-xs bg-white"
              />
              <select
                value={tipoNuevaPlantilla}
                onChange={(e) => setTipoNuevaPlantilla(e.target.value as 'remodelacion' | 'obra_nueva')}
                className="h-8 rounded-sm border border-gray-300 bg-white text-xs px-2"
              >
                <option value="remodelacion">Especialidad: Remodelación / Acabados</option>
                <option value="obra_nueva">Especialidad: Obra Nueva / Construcción</option>
              </select>
            </div>
            <Input
              placeholder="Descripción breve (ej. Incluye desmonte, mesón de cuarzo y carpintería)"
              value={descNuevaPlantilla}
              onChange={(e) => setDescNuevaPlantilla(e.target.value)}
              className="h-8 text-xs bg-white"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" className="h-8 text-xs" onClick={() => setCreandoPlantilla(false)}>
                Cancelar
              </Button>
              <Button className="h-8 bg-navy text-xs text-white" onClick={handleCrearPlantilla}>
                Guardar Plantilla
              </Button>
            </div>
          </div>
        )}

        {/* Listado de Plantillas con CLIC para ver y editar */}
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {plantillas.map((p) => (
            <div
              key={p.id}
              onClick={() => abrirVisorPlantilla(p)}
              className="group cursor-pointer relative flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-3.5 shadow-soft transition-all hover:border-orange hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange">
                    {p.tipo.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400 group-hover:text-navy text-[11px] font-bold flex items-center gap-1">
                      <Eye className="size-3" /> Ver / Editar
                    </span>
                    {esAdmin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEliminarPlantilla(p.id)
                        }}
                        className="text-gray-300 hover:text-red-500 p-1"
                        title="Eliminar plantilla"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <h4 className="mt-1 font-bold text-navy text-sm group-hover:text-orange transition-colors">
                  {p.nombre}
                </h4>
                <p className="mt-1 text-[11px] text-gray-500 leading-tight">
                  {p.descripcion || 'Sin descripción'}
                </p>
              </div>

              <div className="mt-3 border-t border-gray-100 pt-2 text-[10px] text-gray-500">
                <span className="font-bold text-navy">{p.etapas.length} fases configuradas</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {p.etapas.slice(0, 3).map((fase, i) => (
                    <span key={i} className="rounded-xs bg-gray-100 px-1 py-0.5 text-[9px] text-gray-600 truncate max-w-28">
                      {fase.nombre}
                    </span>
                  ))}
                  {p.etapas.length > 3 && (
                    <span className="rounded-xs bg-gray-100 px-1 py-0.5 text-[9px] text-gray-600">
                      +{p.etapas.length - 3} más
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* TARJETA 4: GESTIÓN DE ROLES Y EQUIPO DE TRABAJO (SOLO ADMIN) */}
      <Card className="shadow-soft">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-navy font-bold">
              <Users className="size-4 text-orange" />
              Equipo & Gestión de Accesos (Control Administrativo)
            </CardTitle>
            <CardDescription className="text-xs">
              {esAdmin
                ? 'Como Administrador, puedes autorizar o remover miembros y asignarles su rol de campo.'
                : 'Solo los Administradores de la empresa tienen permiso para conceder o retirar accesos.'}
            </CardDescription>
          </div>
        </div>

        {/* Lista de Miembros */}
        <div className="mt-3 divide-y divide-gray-100">
          {equipo.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <div className="grid size-8 place-items-center rounded-full bg-navy/5 text-navy font-bold text-xs">
                  {m.nombre.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-navy">{m.nombre}</p>
                  <p className="text-[11px] text-gray-500">{m.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant={m.rol === 'Administrador' ? 'blue' : 'gray'}
                  className="text-[10px] font-bold"
                >
                  {m.rol}
                </Badge>

                {esAdmin && m.id !== 'admin-1' && (
                  <button
                    type="button"
                    onClick={() => handleEliminarMiembro(m.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="Eliminar del equipo"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Agregar Miembro - Solo visible para Administrador */}
        {esAdmin ? (
          <div className="mt-4 flex flex-wrap gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3">
            <Input
              placeholder="Nombre del colaborador"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              className="h-8 flex-1 text-xs bg-white"
            />
            <Input
              placeholder="correo@ejemplo.com"
              value={nuevoEmail}
              onChange={(e) => setNuevoEmail(e.target.value)}
              className="h-8 flex-1 text-xs bg-white"
            />
            <select
              value={nuevoRol}
              onChange={(e) => setNuevoRol(e.target.value as Colaborador['rol'])}
              className="h-8 rounded-sm border border-gray-300 bg-white text-xs px-2 font-semibold"
            >
              <option value="Ingeniero Residente">Ingeniero Residente</option>
              <option value="Director de Proyecto">Director de Proyecto</option>
              <option value="Maestro General">Maestro General</option>
              <option value="Administrador">Administrador</option>
            </select>
            <Button
              onClick={handleAgregarMiembro}
              className="h-8 gap-1 bg-navy px-3 text-xs text-white hover:bg-navy-hover"
            >
              <Plus className="size-3.5" /> Asignar Rol
            </Button>
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500 flex items-center gap-2">
            <Lock className="size-4 text-gray-400 shrink-0" />
            <span>Zona protegida: Solo el Gerente o Administrador puede invitar y gestionar colaboradores.</span>
          </div>
        )}
      </Card>

      {/* TARJETA 5: SESIÓN Y SEGURIDAD */}
      <Card className="flex items-center justify-between border-red-100 bg-red-50/30 p-4 shadow-soft">
        <div>
          <CardTitle className="text-sm font-bold text-navy">Cierre de Sesión</CardTitle>
          <CardDescription className="text-xs text-gray-500">
            Finaliza la sesión actual de trabajo en este dispositivo.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          onClick={handleCerrarSesion}
          className="h-9 gap-1.5 border-red-200 px-3 text-xs text-red-600 hover:bg-red-50 font-bold"
        >
          <LogOut className="size-3.5" /> Salir de la Cuenta
        </Button>
      </Card>

      {/* MODAL DETALLE Y EDICIÓN COMPLETA DE PLANTILLA */}
      <Dialog
        open={!!plantillaDetalle}
        onClose={() => setPlantillaDetalle(null)}
        title={`Plantilla: ${nombrePlantillaEdit}`}
        description="Visualiza todas las fases, unidades, ponderación y suministros incluidos. Puedes editar antes de guardar."
      >
        <div className="grid gap-3">
          <Field label="Nombre de la Plantilla" htmlFor="plantilla-nom">
            <Input
              id="plantilla-nom"
              value={nombrePlantillaEdit}
              onChange={(e) => setNombrePlantillaEdit(e.target.value)}
              className="text-sm font-bold"
            />
          </Field>

          <Field label="Descripción de la Plantilla" htmlFor="plantilla-desc">
            <Input
              id="plantilla-desc"
              value={descPlantillaEdit}
              onChange={(e) => setDescPlantillaEdit(e.target.value)}
              className="text-xs"
            />
          </Field>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-navy">
                Fases Configuradas ({editandoFases.length})
              </label>
              <span className="text-[11px] font-bold text-orange">
                Peso Total: {editandoFases.reduce((s, f) => s + (Number(f.peso) || 0), 0)}%
              </span>
            </div>

            <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
              {editandoFases.map((fase, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      value={fase.nombre}
                      onChange={(e) => {
                        const val = e.target.value
                        setEditandoFases((prev) =>
                          prev.map((f, i) => (i === idx ? { ...f, nombre: val } : f)),
                        )
                      }}
                      className="h-7 text-xs font-bold bg-white flex-1"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setEditandoFases((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-gray-400 hover:text-red-500"
                      title="Eliminar fase"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-gray-500 font-medium">Meta:</span>
                    <Input
                      type="number"
                      value={fase.cantidad_total || 100}
                      onChange={(e) => {
                        const cant = parseFloat(e.target.value) || 0
                        setEditandoFases((prev) =>
                          prev.map((f, i) => (i === idx ? { ...f, cantidad_total: cant } : f)),
                        )
                      }}
                      className="h-6 w-16 text-[11px] bg-white px-1.5"
                    />
                    <select
                      value={fase.unidad_medida || 'm2'}
                      onChange={(e) => {
                        const und = e.target.value
                        setEditandoFases((prev) =>
                          prev.map((f, i) => (i === idx ? { ...f, unidad_medida: und } : f)),
                        )
                      }}
                      className="h-6 rounded-xs border border-gray-300 bg-white text-[10px] px-1 font-bold"
                    >
                      <option value="m2">m²</option>
                      <option value="m3">m³</option>
                      <option value="ml">ml</option>
                      <option value="und">und</option>
                      <option value="pto">pto</option>
                      <option value="kg">kg</option>
                      <option value="gl">gl</option>
                    </select>

                    <span className="text-gray-500 font-medium ml-auto">Ponderación:</span>
                    <Input
                      type="number"
                      value={fase.peso}
                      onChange={(e) => {
                        const peso = parseFloat(e.target.value) || 0
                        setEditandoFases((prev) =>
                          prev.map((f, i) => (i === idx ? { ...f, peso } : f)),
                        )
                      }}
                      className="h-6 w-14 text-[11px] bg-white px-1.5 font-bold text-navy"
                    />
                    <span className="text-navy font-bold">%</span>
                  </div>

                  {/* Suministros predeterminados de la fase */}
                  {fase.materiales && fase.materiales.length > 0 && (
                    <div className="mt-1 border-t border-gray-200 pt-1.5 text-[10px] text-gray-600">
                      <span className="font-bold text-navy">Suministros asociados: </span>
                      {fase.materiales.map((m, mi) => (
                        <span key={mi} className="mr-1.5 inline-block rounded-xs bg-white px-1 border border-gray-200">
                          {m.nombre} ({m.cantidad_estimada} {m.unidad})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-2 flex gap-2">
            <Button
              variant="outline"
              className="w-1/3"
              onClick={() => setPlantillaDetalle(null)}
            >
              Cancelar
            </Button>
            <Button
              className="w-2/3 bg-navy text-white hover:bg-navy-hover"
              onClick={handleGuardarEdicionPlantilla}
            >
              <Check className="mr-1.5 size-4" /> Guardar Cambios en Plantilla
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
