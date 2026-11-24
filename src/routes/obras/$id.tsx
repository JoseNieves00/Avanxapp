import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowLeft,
  Box,
  CheckCircle2,
  History,
  MapPin,
  MessageCircle,
  Plus,
  Printer,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { ReporteRapidoDialog } from '@/components/obras/reporte-rapido-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Field, Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { VisualViewer } from '@/components/viewer/visual-viewer'
import { db, type ObraAdicional } from '@/lib/db'
import { calcularAvance, formatearFecha, formatearPresupuestoCOP } from '@/lib/obras'

export const Route = createFileRoute('/obras/$id')({
  component: ObraPage,
})

function ObraPage() {
  const { id } = Route.useParams()
  const [reporteRapidoAbierto, setReporteRapidoAbierto] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [mostrarVisor, setMostrarVisor] = useState(true)

  // Modal para crear Adicional
  const [modalAdicionalAbierto, setModalAdicionalAbierto] = useState(false)
  const [adicionalTitulo, setAdicionalTitulo] = useState('')
  const [adicionalDesc, setAdicionalDesc] = useState('')
  const [adicionalCosto, setAdicionalCosto] = useState('')
  const [adicionalDias, setAdicionalDias] = useState('0')
  const [guardandoAdicional, setGuardandoAdicional] = useState(false)

  const obra = useLiveQuery(() => db.obras.get(id), [id])
  const etapas = useLiveQuery(
    async () =>
      (await db.etapas.where('obra_id').equals(id).toArray())
        .filter((etapa) => !etapa.deleted_at)
        .sort((a, b) => a.orden - b.orden),
    [id],
  )
  const reportes = useLiveQuery(
    async () =>
      (await db.diario_entradas.where('obra_id').equals(id).toArray()).sort((a, b) =>
        b.captured_at.localeCompare(a.captured_at),
      ),
    [id],
  )
  const adicionales = useLiveQuery(
    async () =>
      (await db.adicionales.where('obra_id').equals(id).toArray()).sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      ),
    [id],
  )

  const avance = useMemo(() => calcularAvance(etapas ?? []), [etapas])

  const clientPortalUrl = useMemo(() => {
    if (!obra?.token_cliente) return ''
    return `${window.location.origin}/v/${obra.token_cliente}`
  }, [obra])

  // Presupuesto base y adicionales aprobados
  const presupuestoBase = obra?.presupuesto_estimado || 0
  const totalAdicionalesAprobados = useMemo(() => {
    return (adicionales ?? [])
      .filter((a) => a.estado === 'aprobado')
      .reduce((sum, a) => sum + (Number(a.costo_adicional) || 0), 0)
  }, [adicionales])

  const adicionalesPendientes = useMemo(() => {
    return (adicionales ?? []).filter((a) => a.estado === 'pendiente')
  }, [adicionales])

  const presupuestoTotalActualizado = presupuestoBase + totalAdicionalesAprobados

  function copiarEnlaceCliente() {
    if (!clientPortalUrl) return
    navigator.clipboard.writeText(clientPortalUrl)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  function compartirWhatsApp(tipo: 'general' | 'adicional', adicionalItem?: ObraAdicional) {
    if (!obra || !clientPortalUrl) return
    const telLimpio = obra.cliente_telefono ? obra.cliente_telefono.replace(/\D/g, '') : ''

    let mensaje = ''
    if (tipo === 'adicional' && adicionalItem) {
      const costoFormateado = formatearPresupuestoCOP(adicionalItem.costo_adicional).formateado
      mensaje = `Hola ${obra.cliente_nombre || ''}, te compartimos un trabajo adicional solicitado en tu proyecto "${obra.nombre}":\n\n📌 *${adicionalItem.titulo}*\n💰 Valor: ${costoFormateado}\n⏱️ Tiempo estimado: +${adicionalItem.tiempo_adicional_dias} días\n\nPuedes revisar los detalles y confirmar la aprobación desde tu portal en vivo:\n👉 ${clientPortalUrl}`
    } else {
      mensaje = `Hola ${obra.cliente_nombre || ''}, te compartimos el informe semanal de avance y diseño 3D de tu proyecto "${obra.nombre}":\n\n👉 ${clientPortalUrl}`
    }

    const waUrl = telLimpio
      ? `https://wa.me/${telLimpio}?text=${encodeURIComponent(mensaje)}`
      : `https://wa.me/?text=${encodeURIComponent(mensaje)}`

    window.open(waUrl, '_blank')
  }

  async function handleGuardarAdicional() {
    if (!obra || !adicionalTitulo.trim()) return
    setGuardandoAdicional(true)
    const ahora = new Date().toISOString()

    const nuevo: ObraAdicional = {
      id: crypto.randomUUID(),
      obra_id: obra.id,
      titulo: adicionalTitulo.trim(),
      descripcion: adicionalDesc.trim(),
      costo_adicional: parseFloat(adicionalCosto) || 0,
      tiempo_adicional_dias: parseInt(adicionalDias, 10) || 0,
      estado: 'pendiente',
      created_at: ahora,
    }

    try {
      await db.adicionales.add(nuevo)
      setModalAdicionalAbierto(false)
      setAdicionalTitulo('')
      setAdicionalDesc('')
      setAdicionalCosto('')
      setAdicionalDias('0')

      // Abrir opción de notificar al cliente inmediatamente por WhatsApp
      if (confirm('¿Deseas enviar la notificación del adicional al WhatsApp del cliente ahora?')) {
        compartirWhatsApp('adicional', nuevo)
      }
    } finally {
      setGuardandoAdicional(false)
    }
  }

  async function handleEliminarAdicional(id: string) {
    if (confirm('¿Deseas eliminar este adicional?')) {
      await db.adicionales.delete(id)
    }
  }

  function imprimirInforme() {
    if (!obra) return
    const tituloPrevio = document.title
    const clienteStr = obra.cliente_nombre ? obra.cliente_nombre.trim() : 'Cliente'
    const fechaStr = new Date().toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).replace(/\//g, '-')

    document.title = `${obra.nombre.toUpperCase()} / ${clienteStr.toUpperCase()} - Avanxapp (${fechaStr})`
    window.print()
    setTimeout(() => {
      document.title = tituloPrevio
    }, 1000)
  }

  if (obra === undefined) {
    return (
      <div className="grid gap-3" aria-busy="true" aria-live="polite">
        <div className="h-8 w-2/3 animate-pulse rounded-sm bg-gray-100" />
        <div className="h-28 animate-pulse rounded-md bg-gray-100" />
        <div className="h-48 animate-pulse rounded-md bg-gray-100" />
      </div>
    )
  }

  if (obra === null) {
    return (
      <EmptyState
        title="Proyecto no encontrado"
        description="Puede que se haya archivado o eliminado en este dispositivo."
        action={
          <Link
            to="/"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-navy px-5 text-sm font-bold text-white"
          >
            Volver a mis proyectos
          </Link>
        }
      />
    )
  }

  return (
    <div className="grid gap-4 print:p-0">
      {/* Barra de navegación superior */}
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-navy">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Mis proyectos
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => compartirWhatsApp('general')}
            className="h-9 gap-1.5 bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-700 shadow-2xs font-bold"
          >
            <MessageCircle className="size-3.5" /> Enviar por WhatsApp
          </Button>
          <Button variant="outline" onClick={imprimirInforme} className="h-9 gap-1.5 px-3 text-xs font-bold text-navy">
            <Printer className="size-3.5" /> Exportar PDF
          </Button>
          <Button
            className="h-9 gap-1.5 bg-orange px-3 text-xs text-white hover:brightness-95 shadow-2xs font-bold"
            onClick={copiarEnlaceCliente}
          >
            {copiado ? <CheckCircle2 className="size-3.5" /> : <Share2 className="size-3.5" />}
            {copiado ? 'Enlace Copiado' : 'Portal Cliente'}
          </Button>
        </div>
      </div>

      {/* Cabecera del Proyecto */}
      <div className="flex items-start justify-between gap-3 border-b pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold tracking-wider text-orange uppercase">
              {obra.tipo_proyecto.replace('_', ' ')}
            </span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs font-semibold text-gray-500">
              Cliente: {obra.cliente_nombre || 'Sin cliente'}
            </span>
          </div>
          <h1 className="truncate text-2xl font-extrabold tracking-tight text-navy">
            {obra.nombre}
          </h1>
          {obra.direccion && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="size-3.5 text-gray-400" /> {obra.direccion}
            </p>
          )}
        </div>
        <Badge
          variant={
            obra.entregado_a_conformidad
              ? 'blue'
              : obra.estado === 'activa'
                ? 'green'
                : 'gray'
          }
          className="font-bold text-[11px]"
        >
          {obra.entregado_a_conformidad ? '✓ ENTREGADO A CONFORMIDAD' : obra.estado.toUpperCase()}
        </Badge>
      </div>

      {/* Alerta de Cierre y Conformidad Digital */}
      {obra.entregado_a_conformidad && (
        <div className="rounded-lg border-2 border-emerald-500 bg-emerald-50/80 p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
              Acta Digital de Cierre Verificada
            </span>
            <p className="text-xs font-bold text-emerald-950 mt-0.5">
              Recibido formalmente por el cliente: <strong className="text-navy">{obra.entregado_cliente_nombre}</strong>
            </p>
            <p className="text-[11px] text-emerald-800">
              Fecha de firma digital: {obra.entregado_at ? new Date(obra.entregado_at).toLocaleString('es-CO') : ''}
              {obra.entregado_notas && ` · "${obra.entregado_notas}"`}
            </p>
          </div>
          <Badge className="bg-emerald-600 text-white font-bold text-xs shrink-0">
            Cerrado & Facturado
          </Badge>
        </div>
      )}

      {/* VISOR 3D / RENDER 360 / RENDERS HD */}
      {obra.modelo_visual_tipo !== 'ninguno' && (
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-2 text-xs font-bold text-navy">
            <span className="flex items-center gap-1.5">
              <Box className="size-4 text-orange" /> Visualización del Proyecto (Diseño vs Realidad)
            </span>
            <button
              type="button"
              onClick={() => setMostrarVisor(!mostrarVisor)}
              className="text-gray-500 hover:text-navy"
            >
              {mostrarVisor ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          {mostrarVisor && (
            <VisualViewer
              tipo={obra.modelo_visual_tipo}
              url={obra.modelo_visual_url}
              titulo={`Diseño: ${obra.nombre}`}
            />
          )}
        </Card>
      )}

      {/* TARJETA PRINCIPAL: AVANCE GENERAL Y REPORTE SEMANAL */}
      <Card className="border-navy/10 bg-gradient-to-br from-white to-gray-50 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base text-navy font-bold">Avance Físico Ponderado</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              Informe Semanal acumulado sobre {etapas?.length ?? 0} fases exactas.
            </p>
          </div>
          <span className="text-3xl font-black text-navy">{avance}%</span>
        </div>

        <Progress value={avance} className="mt-3 h-3" />

        <div className="mt-4 flex gap-2 print:hidden">
          <Button
            size="lg"
            className="w-full gap-2 bg-navy text-sm font-bold text-white hover:bg-navy-hover shadow-xs"
            onClick={() => setReporteRapidoAbierto(true)}
            disabled={!etapas?.length}
          >
            <Sparkles className="size-4 text-orange" />
            Registrar Informe Semanal (Voz / Foto / Avance)
          </Button>
        </div>
      </Card>

      {/* GESTIÓN FINANCIERA: PRESUPUESTO & COBROS ADICIONALES */}
      <Card className="shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div>
            <CardTitle className="text-base font-bold text-navy flex items-center gap-2">
              Cobros Adicionales & Extras Solicitados
              {adicionalesPendientes.length > 0 && (
                <Badge variant="orange" className="text-[10px] animate-pulse">
                  {adicionalesPendientes.length} por confirmar por el cliente
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              Registra trabajos extras solicitados durante la obra para que el cliente los apruebe desde su portal.
            </CardDescription>
          </div>

          <Button
            onClick={() => setModalAdicionalAbierto(true)}
            className="h-8 gap-1.5 bg-orange px-3 text-xs text-white hover:brightness-95 shadow-2xs font-bold"
          >
            <Plus className="size-3.5" /> Agregar Adicional
          </Button>
        </div>

        {/* Resumen de Presupuesto con Adicionales */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
            <span className="text-[10px] text-gray-500 font-bold uppercase">Presupuesto Inicial</span>
            <p className="text-sm font-extrabold text-navy mt-0.5">
              {formatearPresupuestoCOP(presupuestoBase).formateado}
            </p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5">
            <span className="text-[10px] text-emerald-800 font-bold uppercase">Extras Aprobados</span>
            <p className="text-sm font-extrabold text-emerald-900 mt-0.5">
              +{formatearPresupuestoCOP(totalAdicionalesAprobados).formateado}
            </p>
          </div>
          <div className="rounded-lg border border-navy/20 bg-navy/5 p-2.5">
            <span className="text-[10px] text-navy font-bold uppercase">Presupuesto Actual</span>
            <p className="text-sm font-black text-navy mt-0.5">
              {formatearPresupuestoCOP(presupuestoTotalActualizado).formateado}
            </p>
          </div>
        </div>

        {/* Lista de Adicionales */}
        {!adicionales || adicionales.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-3 italic">
            No hay cobros adicionales registrados. Todo se ejecuta según contrato original.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-gray-100">
            {adicionales.map((a) => (
              <div key={a.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-navy truncate">{a.titulo}</span>
                    <Badge
                      variant={
                        a.estado === 'aprobado'
                          ? 'green'
                          : a.estado === 'rechazado'
                            ? 'gray'
                            : 'orange'
                      }
                      className="text-[9px] font-bold"
                    >
                      {a.estado === 'aprobado'
                        ? '✓ Aprobado por Cliente'
                        : a.estado === 'rechazado'
                          ? 'Rechazado'
                          : '⏳ Pendiente de Aprobación'}
                    </Badge>
                  </div>
                  {a.descripcion && <p className="text-[11px] text-gray-500 mt-0.5">{a.descripcion}</p>}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="font-extrabold text-navy">
                      {formatearPresupuestoCOP(a.costo_adicional).formateado}
                    </p>
                    {a.tiempo_adicional_dias > 0 && (
                      <span className="text-[10px] text-gray-400">+{a.tiempo_adicional_dias} días</span>
                    )}
                  </div>

                  {a.estado === 'pendiente' && (
                    <Button
                      variant="outline"
                      onClick={() => compartirWhatsApp('adicional', a)}
                      className="h-7 px-2 text-[10px] font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                      title="Enviar recordatorio a WhatsApp"
                    >
                      <MessageCircle className="size-3 mr-1" /> Notificar
                    </Button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleEliminarAdicional(a.id)}
                    className="p-1 text-gray-300 hover:text-red-500"
                    title="Eliminar adicional"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* FASES MEDIBLES OBJETIVAS */}
      <Card className="shadow-soft">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Fases y Metrados de Obra</span>
          <span className="text-xs font-normal text-gray-500">Cantidades reales ejecutadas</span>
        </CardTitle>

        <ul className="mt-3 grid gap-2">
          {(etapas ?? []).map((etapa) => {
            const meta = etapa.cantidad_total || 100
            const acumulado = etapa.cantidad_acumulada || 0
            const unidad = etapa.unidad_medida || 'm2'
            return (
              <li key={etapa.id} className="rounded-sm border border-gray-100 bg-white p-3 shadow-2xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-navy">{etapa.nombre}</p>
                    <p className="text-xs text-gray-500">
                      Ejecutado: <strong className="text-navy">{acumulado}</strong> de {meta} {unidad}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-navy">{etapa.porcentaje}%</span>
                    <p className="text-[10px] text-gray-400">Peso {etapa.peso}%</p>
                  </div>
                </div>
                <Progress value={etapa.porcentaje} className="mt-2 h-1.5" />
              </li>
            )
          })}
        </ul>
      </Card>

      {/* HISTORIAL DE BITÁCORA Y REPORTES SEMANALES */}
      <Card className="shadow-soft">
        <CardTitle className="flex items-center gap-2 text-base text-navy">
          <History className="size-4 text-orange" />
          Historial de Informes Semanales
        </CardTitle>
        <CardDescription className="mb-3 text-xs">
          Resúmenes semanales estructurados con notas de avance y reporte para el cliente.
        </CardDescription>

        {!reportes || reportes.length === 0 ? (
          <div className="rounded-sm border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-xs text-gray-500">
            Aún no se han registrado informes semanales. Usa el botón superior para dictar o registrar el primero.
          </div>
        ) : (
          <div className="space-y-3">
            {reportes.slice(0, 10).map((r) => (
              <div key={r.id} className="rounded-sm border border-gray-100 bg-white p-3 shadow-2xs">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-navy">
                      {formatearFecha(r.captured_at)}
                    </span>
                    {r.clima && (
                      <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600 capitalize">
                        Clima: {r.clima}
                      </span>
                    )}
                    {r.personal_activo ? (
                      <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                        {r.personal_activo} operarios
                      </span>
                    ) : null}
                  </div>
                  {r.cantidad_reportada > 0 && (
                    <Badge variant="green" className="text-xs">
                      +{r.cantidad_reportada} ejecutados
                    </Badge>
                  )}
                </div>

                <p className="mt-2 text-xs text-gray-800">{r.nota_tecnica}</p>

                {r.resumen_cliente_ia && (
                  <div className="mt-2 rounded-xs border-l-2 border-orange bg-orange/5 p-2 text-xs text-gray-700 italic">
                    <strong>Resumen semanal enviado al cliente:</strong> "{r.resumen_cliente_ia}"
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* DIÁLOGO DEL REPORTE SEMANAL */}
      <ReporteRapidoDialog
        open={reporteRapidoAbierto}
        onClose={() => setReporteRapidoAbierto(false)}
        obraId={obra.id}
        etapas={etapas ?? []}
      />

      {/* MODAL CREAR COBRO ADICIONAL */}
      <Dialog
        open={modalAdicionalAbierto}
        onClose={() => setModalAdicionalAbierto(false)}
        title="Registrar Trabajo Adicional / Extra"
        description="Ingresa el trabajo extra solicitado por el cliente con su costo estimado para enviarlo a aprobación."
      >
        <div className="grid gap-3">
          <Field label="Título del Adicional" htmlFor="adi-tit">
            <Input
              id="adi-tit"
              placeholder="Ej. Punto de gas adicional para isla / Enchape salpicadero alto"
              value={adicionalTitulo}
              onChange={(e) => setAdicionalTitulo(e.target.value)}
              className="text-xs font-bold"
            />
          </Field>

          <Field label="Descripción del Trabajo o Materiales" htmlFor="adi-desc">
            <Input
              id="adi-desc"
              placeholder="Ej. Incluye tubería certificada, accesorios y mano de obra de instalación."
              value={adicionalDesc}
              onChange={(e) => setAdicionalDesc(e.target.value)}
              className="text-xs"
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Costo Estimado (COP)" htmlFor="adi-costo">
              <Input
                id="adi-costo"
                type="number"
                placeholder="Ej. 450000"
                value={adicionalCosto}
                onChange={(e) => setAdicionalCosto(e.target.value)}
                className="text-xs font-bold"
              />
            </Field>

            <Field label="Días Adicionales a la Obra" htmlFor="adi-dias">
              <Input
                id="adi-dias"
                type="number"
                placeholder="0"
                value={adicionalDias}
                onChange={(e) => setAdicionalDias(e.target.value)}
                className="text-xs"
              />
            </Field>
          </div>

          {parseFloat(adicionalCosto) > 0 && (
            <p className="text-xs font-bold text-navy">
              Valor: {formatearPresupuestoCOP(parseFloat(adicionalCosto)).formateado} ({formatearPresupuestoCOP(parseFloat(adicionalCosto)).textoMillones})
            </p>
          )}

          <div className="mt-2 flex gap-2">
            <Button variant="outline" className="w-1/3" onClick={() => setModalAdicionalAbierto(false)}>
              Cancelar
            </Button>
            <Button
              className="w-2/3 bg-navy text-white hover:bg-navy-hover font-bold"
              disabled={!adicionalTitulo.trim() || guardandoAdicional}
              onClick={handleGuardarAdicional}
            >
              Guardar y Notificar al Cliente
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
