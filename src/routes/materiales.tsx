import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Package,
  Plus,
  Search,
  Truck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Field, Input } from '@/components/ui/input'
import { db, type Etapa, type MaterialSuministro } from '@/lib/db'

export const Route = createFileRoute('/materiales')({
  component: SuministrosPage,
})

const ESTADOS_SUMINISTRO: {
  id: MaterialSuministro['estado']
  label: string
  color: string
}[] = [
  { id: 'pendiente', label: 'Por Comprar', color: 'bg-amber-100 text-amber-800' },
  { id: 'pedido', label: 'En Pedido / Taller', color: 'bg-blue-100 text-blue-800' },
  { id: 'en_sitio', label: 'En Obra / Sitio', color: 'bg-purple-100 text-purple-800' },
  { id: 'instalado', label: 'Instalado & Aprobado', color: 'bg-emerald-100 text-emerald-800' },
]

function SuministrosPage() {
  const [busqueda, setBusqueda] = useState('')
  const [proyectoFiltro, setProyectoFiltro] = useState<string>('todos')
  const [estadoFiltro, setEstadoFiltro] = useState<string>('todos')

  // Modal para agregar suministro rápido a una fase
  const [modalAbierto, setModalAbierto] = useState(false)
  const [etapaDestinoId, setEtapaDestinoId] = useState('')
  const [nombreSuministro, setNombreSuministro] = useState('')
  const [cantidadSuministro, setCantidadSuministro] = useState('1')
  const [unidadSuministro, setUnidadSuministro] = useState('und')
  const [proveedorSeleccionadoId, setProveedorSeleccionadoId] = useState('')
  const [fechaEntrega, setFechaEntrega] = useState('')

  const obras = useLiveQuery(
    async () => (await db.obras.toArray()).filter((o) => !o.deleted_at),
    [],
  )

  const etapas = useLiveQuery(
    async () => (await db.etapas.toArray()).filter((e) => !e.deleted_at),
    [],
  )

  const proveedores = useLiveQuery(
    async () => (await db.proveedores.toArray()).filter((p) => !p.deleted_at),
    [],
  )

  const obrasMap = useMemo(() => {
    const map = new Map<string, string>()
    obras?.forEach((o) => map.set(o.id, o.nombre))
    return map
  }, [obras])

  const proveedoresMap = useMemo(() => {
    const map = new Map<string, string>()
    proveedores?.forEach((p) => map.set(p.id, p.nombre))
    return map
  }, [proveedores])

  // Aplanar todos los suministros de todas las fases
  const todosLosSuministros = useMemo(() => {
    const lista: {
      suministro: MaterialSuministro
      etapa: Etapa
      obraNombre: string
    }[] = []

    etapas?.forEach((etapa) => {
      const obraNombre = obrasMap.get(etapa.obra_id) || 'Proyecto General'
      etapa.materiales_suministros?.forEach((s) => {
        lista.push({ suministro: s, etapa, obraNombre })
      })
    })

    return lista
  }, [etapas, obrasMap])

  // Filtrado reactivo
  const suministrosFiltrados = useMemo(() => {
    return todosLosSuministros.filter((item) => {
      const cumpleTexto =
        !busqueda.trim() ||
        item.suministro.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        item.etapa.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        item.obraNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (item.suministro.proveedor &&
          item.suministro.proveedor.toLowerCase().includes(busqueda.toLowerCase()))

      const cumpleProyecto =
        proyectoFiltro === 'todos' || item.etapa.obra_id === proyectoFiltro

      const cumpleEstado =
        estadoFiltro === 'todos' || item.suministro.estado === estadoFiltro

      return cumpleTexto && cumpleProyecto && cumpleEstado
    })
  }, [todosLosSuministros, busqueda, proyectoFiltro, estadoFiltro])

  // Cambiar estado del suministro en 1 toque
  async function cambiarEstadoSuministro(
    etapaId: string,
    suministroId: string,
    nuevoEstado: MaterialSuministro['estado'],
  ) {
    const etapa = etapas?.find((e) => e.id === etapaId)
    if (!etapa || !etapa.materiales_suministros) return

    const actualizados = etapa.materiales_suministros.map((s) =>
      s.id === suministroId ? { ...s, estado: nuevoEstado } : s,
    )

    await db.etapas.update(etapaId, {
      materiales_suministros: actualizados,
      client_updated_at: new Date().toISOString(),
    })
  }

  // Agregar suministro a una fase con proveedor y fecha de entrega
  async function handleAgregarSuministro() {
    if (!etapaDestinoId || !nombreSuministro.trim()) return
    const etapa = etapas?.find((e) => e.id === etapaDestinoId)
    if (!etapa) return

    const proveedorNombre = proveedoresMap.get(proveedorSeleccionadoId)

    const nuevo: MaterialSuministro = {
      id: crypto.randomUUID(),
      nombre: nombreSuministro.trim(),
      cantidad_estimada: parseFloat(cantidadSuministro) || 1,
      unidad: unidadSuministro,
      estado: 'pendiente',
      proveedor_id: proveedorSeleccionadoId || undefined,
      proveedor: proveedorNombre || undefined,
      fecha_entrega_estimada: fechaEntrega || null,
    }

    const prev = etapa.materiales_suministros || []
    await db.etapas.update(etapaDestinoId, {
      materiales_suministros: [...prev, nuevo],
      client_updated_at: new Date().toISOString(),
    })

    setNombreSuministro('')
    setCantidadSuministro('1')
    setProveedorSeleccionadoId('')
    setFechaEntrega('')
    setModalAbierto(false)
  }

  // Resumen de suministros críticos
  const pendientesCount = todosLosSuministros.filter(
    (s) => s.suministro.estado === 'pendiente',
  ).length
  const enSitioCount = todosLosSuministros.filter(
    (s) => s.suministro.estado === 'en_sitio',
  ).length
  const instaladosCount = todosLosSuministros.filter(
    (s) => s.suministro.estado === 'instalado',
  ).length

  return (
    <div className="grid gap-4">
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-3">
        <div>
          <p className="text-[11px] font-extrabold tracking-[2px] text-orange uppercase">
            Gestión de Compras & Logística
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy">
            Suministros Críticos por Fase
          </h1>
          <p className="text-xs text-gray-500">
            Control de materiales, proveedores aliados y fechas de entrega para cada proyecto.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            to="/proveedores"
            className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-gray-300 bg-white px-3 text-xs font-bold text-navy hover:bg-gray-50"
          >
            <Truck className="size-3.5 text-orange" /> Directorio Proveedores
          </Link>
          <Button
            onClick={() => {
              if (etapas && etapas.length > 0) setEtapaDestinoId(etapas[0].id)
              setModalAbierto(true)
            }}
            className="h-9 gap-1.5 bg-orange px-3 text-xs text-white hover:brightness-95"
          >
            <Plus className="size-4" /> Agregar Suministro
          </Button>
        </div>
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-center">
          <Clock className="mx-auto size-5 text-amber-600 mb-1" />
          <span className="text-lg font-black text-amber-900">{pendientesCount}</span>
          <p className="text-[10px] font-bold text-amber-800 uppercase">Por Comprar / Pedir</p>
        </div>
        <div className="rounded-lg border border-purple-200 bg-purple-50/60 p-3 text-center">
          <Truck className="mx-auto size-5 text-purple-600 mb-1" />
          <span className="text-lg font-black text-purple-900">{enSitioCount}</span>
          <p className="text-[10px] font-bold text-purple-800 uppercase">En Sitio / Obra</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-center">
          <CheckCircle2 className="mx-auto size-5 text-emerald-600 mb-1" />
          <span className="text-lg font-black text-emerald-900">{instaladosCount}</span>
          <p className="text-[10px] font-bold text-emerald-800 uppercase">Instalados</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-9 h-9 text-xs"
            placeholder="Buscar por material, proveedor, fecha, fase..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {/* Filtro por Proyecto */}
        <select
          value={proyectoFiltro}
          onChange={(e) => setProyectoFiltro(e.target.value)}
          className="h-9 rounded-sm border border-gray-300 bg-white text-xs px-2 text-navy font-semibold"
        >
          <option value="todos">Todos los proyectos</option>
          {obras?.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombre}
            </option>
          ))}
        </select>

        {/* Filtro por Estado */}
        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
          className="h-9 rounded-sm border border-gray-300 bg-white text-xs px-2 text-navy font-semibold"
        >
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Por Comprar</option>
          <option value="pedido">En Pedido / Taller</option>
          <option value="en_sitio">En Obra / Sitio</option>
          <option value="instalado">Instalado</option>
        </select>
      </div>

      {/* Lista de Suministros */}
      {suministrosFiltrados.length === 0 ? (
        <EmptyState
          icon={<Package className="size-7" />}
          title="No hay suministros registrados"
          description="Al crear proyectos con plantillas (ej. Cocina o Remodelación) o agregar suministros a fases, los verás organizados aquí con su proveedor y fecha."
          action={
            <Button
              onClick={() => {
                if (etapas && etapas.length > 0) setEtapaDestinoId(etapas[0].id)
                setModalAbierto(true)
              }}
            >
              <Plus className="size-4" /> Agregar primer suministro
            </Button>
          }
        />
      ) : (
        <div className="grid gap-2">
          {suministrosFiltrados.map(({ suministro, etapa, obraNombre }) => {
            // Verificar si el suministro está retrasado
            const hoyStr = new Date().toISOString().slice(0, 10)
            const estaRetrasado =
              suministro.fecha_entrega_estimada &&
              suministro.fecha_entrega_estimada < hoyStr &&
              suministro.estado !== 'en_sitio' &&
              suministro.estado !== 'instalado'

            return (
              <div
                key={suministro.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-3.5 shadow-soft transition-colors ${
                  estaRetrasado
                    ? 'border-red-300 bg-red-50/40 ring-1 ring-red-200'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500 font-bold">
                    <span className="text-orange">
                      {obraNombre}
                    </span>
                    <span>·</span>
                    <span className="text-navy flex items-center gap-1">
                      <Layers className="size-3" /> {etapa.nombre}
                    </span>
                    {estaRetrasado && (
                      <span className="rounded-xs bg-red-600 px-1.5 py-0.5 text-[9px] font-black text-white animate-pulse">
                        ⚠️ ENTREGA RETRASADA
                      </span>
                    )}
                  </div>

                  <h4 className="mt-1 font-bold text-navy text-sm">
                    {suministro.nombre}
                  </h4>

                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                    <span className="font-bold text-navy">
                      Cantidad: {suministro.cantidad_estimada} {suministro.unidad}
                    </span>

                    {(suministro.proveedor || suministro.proveedor_id) && (
                      <span className="flex items-center gap-1 text-gray-600">
                        <Truck className="size-3.5 text-orange" />
                        Proveedor: <strong className="text-navy">{suministro.proveedor || proveedoresMap.get(suministro.proveedor_id || '')}</strong>
                      </span>
                    )}

                    {suministro.fecha_entrega_estimada && (
                      <span className={`flex items-center gap-1 ${estaRetrasado ? 'text-red-700 font-bold' : 'text-gray-600'}`}>
                        <Calendar className="size-3.5 text-blue-600" />
                        Entrega: <strong>{suministro.fecha_entrega_estimada}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Botón de cambio de estado rápido */}
                <div className="flex items-center gap-2">
                  <select
                    value={suministro.estado}
                    onChange={(e) =>
                      cambiarEstadoSuministro(
                        etapa.id,
                        suministro.id,
                        e.target.value as MaterialSuministro['estado'],
                      )
                    }
                    className={`h-8 rounded-sm border px-2 text-xs font-bold text-navy ${
                      estaRetrasado ? 'border-red-300 bg-red-50 text-red-900' : 'border-gray-300 bg-white'
                    }`}
                  >
                    <option value="pendiente">⏳ Por Comprar</option>
                    <option value="pedido">📦 En Pedido / Taller</option>
                    <option value="en_sitio">🚚 En Obra / Sitio</option>
                    <option value="instalado">✅ Instalado & Aprobado</option>
                  </select>

                  <Badge
                    className={`text-[10px] font-bold ${
                      ESTADOS_SUMINISTRO.find((e) => e.id === suministro.estado)?.color
                    }`}
                  >
                    {ESTADOS_SUMINISTRO.find((e) => e.id === suministro.estado)?.label}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal para agregar suministro a una fase */}
      <Dialog
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title="Agregar Suministro a una Fase"
        description="Asocia un material o equipo con su proveedor y fecha de entrega estimada."
      >
        <div className="grid gap-3">
          <Field label="Proyecto y Fase Destino" htmlFor="fase-sel">
            <select
              id="fase-sel"
              value={etapaDestinoId}
              onChange={(e) => setEtapaDestinoId(e.target.value)}
              className="w-full rounded-sm border border-gray-300 bg-white p-2 text-xs font-bold text-navy"
            >
              {etapas?.map((e) => (
                <option key={e.id} value={e.id}>
                  {obrasMap.get(e.obra_id) || 'Proyecto'} → {e.nombre}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Nombre del Suministro / Material" htmlFor="sum-nom">
            <Input
              id="sum-nom"
              placeholder="Ej. Plancha de Cuarzo Blanco / Porcelanato 60x120"
              value={nombreSuministro}
              onChange={(e) => setNombreSuministro(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Cantidad Estimada" htmlFor="sum-cant">
              <Input
                id="sum-cant"
                type="number"
                value={cantidadSuministro}
                onChange={(e) => setCantidadSuministro(e.target.value)}
              />
            </Field>
            <Field label="Unidad" htmlFor="sum-und">
              <select
                id="sum-und"
                value={unidadSuministro}
                onChange={(e) => setUnidadSuministro(e.target.value)}
                className="w-full rounded-sm border border-gray-300 bg-white p-2 text-xs font-semibold"
              >
                <option value="und">und (Unidades)</option>
                <option value="m2">m² (Área)</option>
                <option value="ml">ml (Metros lineales)</option>
                <option value="bultos">bultos</option>
                <option value="tubos">tubos</option>
                <option value="cuñetes">cuñetes</option>
                <option value="gl">gl (Global)</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Proveedor Asignado" htmlFor="sum-prov">
              <select
                id="sum-prov"
                value={proveedorSeleccionadoId}
                onChange={(e) => setProveedorSeleccionadoId(e.target.value)}
                className="w-full rounded-sm border border-gray-300 bg-white p-2 text-xs font-semibold"
              >
                <option value="">(Sin proveedor / Por cotizar)</option>
                {proveedores?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} {p.especialidad ? `(${p.especialidad})` : ''}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Fecha de Entrega Estimada" htmlFor="sum-fecha">
              <Input
                id="sum-fecha"
                type="date"
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
              />
            </Field>
          </div>

          <div className="mt-2 flex gap-2">
            <Button variant="outline" className="w-1/3" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Button>
            <Button
              className="w-2/3 bg-navy text-white hover:bg-navy-hover"
              disabled={!nombreSuministro.trim() || !etapaDestinoId}
              onClick={handleAgregarSuministro}
            >
              Guardar Suministro
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
