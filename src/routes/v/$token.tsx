import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Award,
  Box,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Layers,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Logo } from '@/components/logo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { VisualViewer } from '@/components/viewer/visual-viewer'
import { db } from '@/lib/db'
import { calcularAvance, formatearFecha, formatearPresupuestoCOP } from '@/lib/obras'

export const Route = createFileRoute('/v/$token')({
  component: VistaDuenoPage,
})

function VistaDuenoPage() {
  const { token } = Route.useParams()

  // Configuración de marca blanca de la empresa desde localStorage
  const [empresaNombre, setEmpresaNombre] = useState('Constructora / Estudio')
  const [empresaLogo, setEmpresaLogo] = useState('')
  const [empresaColor, setEmpresaColor] = useState('#0B2D5B')
  const [mostrarNombreJuntoALogo, setMostrarNombreJuntoALogo] = useState(true)

  // Estado del formulario de conformidad
  const [nombreConformidad, setNombreConformidad] = useState('')
  const [notasConformidad, setNotasConformidad] = useState('')
  const [guardandoConformidad, setGuardandoConformidad] = useState(false)
  const [mostrarFormularioCierre, setMostrarFormularioCierre] = useState(false)

  useEffect(() => {
    const nom = localStorage.getItem('avanx_empresa_nombre')
    if (nom) setEmpresaNombre(nom)
    const logo = localStorage.getItem('avanx_empresa_logo')
    if (logo) setEmpresaLogo(logo)
    const col = localStorage.getItem('avanx_empresa_color')
    if (col) setEmpresaColor(col)
    const verNom = localStorage.getItem('avanx_empresa_mostrar_nombre_logo')
    if (verNom !== null) setMostrarNombreJuntoALogo(verNom === 'true')
  }, [])

  const obra = useLiveQuery(
    () => db.obras.where('token_cliente').equals(token).first(),
    [token],
  )

  const etapas = useLiveQuery(
    async () => {
      if (!obra?.id) return []
      return (await db.etapas.where('obra_id').equals(obra.id).toArray())
        .filter((e) => !e.deleted_at)
        .sort((a, b) => a.orden - b.orden)
    },
    [obra?.id],
  )

  const reportes = useLiveQuery(
    async () => {
      if (!obra?.id) return []
      return (await db.diario_entradas.where('obra_id').equals(obra.id).toArray()).sort((a, b) =>
        b.captured_at.localeCompare(a.captured_at),
      )
    },
    [obra?.id],
  )

  const adicionales = useLiveQuery(
    async () => {
      if (!obra?.id) return []
      return (await db.adicionales.where('obra_id').equals(obra.id).toArray()).sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      )
    },
    [obra?.id],
  )

  const adicionalesPendientes = useMemo(() => {
    return (adicionales ?? []).filter((a) => a.estado === 'pendiente')
  }, [adicionales])

  async function handleResponderAdicional(id: string, decision: 'aprobado' | 'rechazado') {
    const ahora = new Date().toISOString()
    await db.adicionales.update(id, {
      estado: decision,
      aprobado_at: ahora,
      aprobado_por_nombre: obra?.cliente_nombre || 'Cliente',
    })
  }

  const avance = useMemo(() => calcularAvance(etapas ?? []), [etapas])

  async function handleAceptarConformidad() {
    if (!obra || !nombreConformidad.trim()) return
    setGuardandoConformidad(true)
    const ahora = new Date().toISOString()

    try {
      await db.obras.update(obra.id, {
        estado: 'entregada',
        entregado_a_conformidad: true,
        entregado_cliente_nombre: nombreConformidad.trim(),
        entregado_at: ahora,
        entregado_notas: notasConformidad.trim() || undefined,
        client_updated_at: ahora,
      })
      setMostrarFormularioCierre(false)
    } finally {
      setGuardandoConformidad(false)
    }
  }

  if (obra === undefined) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-8 text-center">
        <div className="mx-auto size-8 animate-spin rounded-full border-4 border-orange border-t-transparent" />
        <p className="mt-3 text-sm text-gray-500">Cargando el estado de tu proyecto...</p>
      </div>
    )
  }

  if (obra === null) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-8 text-center">
        <Building2 className="mx-auto size-12 text-gray-300" />
        <h1 className="mt-3 text-lg font-bold text-navy">Proyecto no encontrado</h1>
        <p className="mt-1 text-xs text-gray-500">
          El enlace puede haber expirado o aún no se ha sincronizado en este dispositivo.
        </p>
      </div>
    )
  }

  const ultimoResumen = reportes?.find((r) => r.resumen_cliente_ia)?.resumen_cliente_ia
  const yaEntregado = obra.entregado_a_conformidad

  return (
    <div className="min-h-dvh bg-slate-50 antialiased pb-12">
      {/* Barra Superior con Marca Blanca Dinámica */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 px-4 py-3 shadow-2xs backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            {empresaLogo ? (
              <img
                src={empresaLogo}
                alt={empresaNombre}
                className="h-8 max-w-36 object-contain"
              />
            ) : null}

            {(!empresaLogo || mostrarNombreJuntoALogo) && (
              <span className="font-extrabold text-sm sm:text-base text-navy tracking-tight truncate max-w-56">
                {empresaNombre}
              </span>
            )}
          </div>

          <Badge
            variant={yaEntregado ? 'blue' : 'green'}
            className={`font-bold text-[11px] px-2.5 py-0.5 shadow-2xs ${
              yaEntregado ? 'bg-navy text-white' : 'bg-emerald-600 text-white'
            }`}
          >
            {yaEntregado ? '✓ Proyecto Entregado' : '● Avance en Vivo'}
          </Badge>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 pt-6 space-y-4">
        {/* Saludo y Nombre del Proyecto */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-xs"
              style={{ backgroundColor: `${empresaColor}15`, color: empresaColor }}
            >
              {obra.tipo_proyecto.replace('_', ' ')}
            </span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs font-semibold text-gray-500">
              Propietario: {obra.cliente_nombre || 'Cliente'}
            </span>
          </div>

          <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-navy">
            {obra.nombre}
          </h1>

          {obra.direccion && (
            <p className="mt-1 text-xs text-gray-500">
              Ubicación: {obra.direccion}
            </p>
          )}
        </div>

        {/* NOTIFICACIÓN DESTACADA DE TRABAJOS ADICIONALES POR CONFIRMAR */}
        {adicionalesPendientes.length > 0 && (
          <div className="rounded-xl border-2 border-orange bg-orange/5 p-4 shadow-soft">
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-orange animate-ping" />
              <h3 className="font-extrabold text-navy text-sm sm:text-base">
                Tienes {adicionalesPendientes.length} trabajo(s) adicional(es) pendiente(s) por autorizar
              </h3>
            </div>
            <p className="mt-1 text-xs text-gray-600">
              El equipo técnico registró estas solicitudes adicionales para tu proyecto. Revisa el valor y autoriza o rechaza:
            </p>

            <div className="mt-3 space-y-2.5">
              {adicionalesPendientes.map((a) => (
                <div key={a.id} className="rounded-lg border border-orange/20 bg-white p-3 shadow-2xs">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-navy text-sm">{a.titulo}</h4>
                      {a.descripcion && <p className="text-xs text-gray-500 mt-0.5">{a.descripcion}</p>}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-orange">
                        {formatearPresupuestoCOP(a.costo_adicional).formateado}
                      </span>
                      {a.tiempo_adicional_dias > 0 && (
                        <p className="text-[10px] text-gray-400">+{a.tiempo_adicional_dias} días estimados</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end gap-2 border-t border-gray-100 pt-2">
                    <Button
                      variant="outline"
                      className="h-8 px-3 text-xs text-gray-600 hover:text-red-600 hover:border-red-200"
                      onClick={() => handleResponderAdicional(a.id, 'rechazado')}
                    >
                      Rechazar
                    </Button>
                    <Button
                      className="h-8 px-3 text-xs bg-emerald-600 text-white hover:bg-emerald-700 font-bold"
                      onClick={() => handleResponderAdicional(a.id, 'aprobado')}
                    >
                      <Check className="size-3.5 mr-1" /> Autorizar Trabajo
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HISTORIAL DE ADICIONALES YA GESTIONADOS */}
        {adicionales && adicionales.some((a) => a.estado !== 'pendiente') && (
          <Card className="shadow-soft">
            <CardTitle className="text-sm font-bold text-navy">
              Historial de Trabajos Adicionales
            </CardTitle>
            <div className="mt-2 divide-y divide-gray-100 text-xs">
              {adicionales
                .filter((a) => a.estado !== 'pendiente')
                .map((a) => (
                  <div key={a.id} className="py-2 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-navy">{a.titulo}</p>
                      <p className="text-[10px] text-gray-400">
                        {a.estado === 'aprobado' ? '✓ Autorizado' : 'Rechazado'} el{' '}
                        {a.aprobado_at ? new Date(a.aprobado_at).toLocaleDateString('es-CO') : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-bold ${
                          a.estado === 'aprobado' ? 'text-emerald-700' : 'text-gray-400 line-through'
                        }`}
                      >
                        {formatearPresupuestoCOP(a.costo_adicional).formateado}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        )}
        {yaEntregado && (
          <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50/70 p-4 shadow-soft">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
                <Award className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                  Acta Digital de Cierre & Conformidad
                </span>
                <h3 className="text-base font-bold text-emerald-950">
                  Proyecto Recibido a Conformidad
                </h3>
                <p className="mt-1 text-xs text-emerald-900 leading-relaxed font-medium">
                  Aceptado formalmente por: <strong>{obra.entregado_cliente_nombre}</strong>
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-emerald-800 font-semibold">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3.5" />
                    {obra.entregado_at ? new Date(obra.entregado_at).toLocaleDateString('es-CO', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }) : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" />
                    {obra.entregado_at ? new Date(obra.entregado_at).toLocaleTimeString('es-CO', {
                      hour: '2-digit',
                      minute: '2-digit',
                    }) : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="size-3.5" /> Trazabilidad Digital Verificada
                  </span>
                </div>
                {obra.entregado_notas && (
                  <p className="mt-2 text-[11px] italic text-emerald-900 border-t border-emerald-200/60 pt-1.5">
                    Nota: "{obra.entregado_notas}"
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TARJETA 1: AVANCE GENERAL */}
        <Card
          className="text-white shadow-soft transition-all"
          style={{
            background: `linear-gradient(135deg, ${empresaColor} 0%, #0F172A 100%)`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">
              Progreso General de la Obra
            </span>
            <span className="text-3xl sm:text-4xl font-black text-orange">{avance}%</span>
          </div>

          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-orange transition-all duration-700"
              style={{ width: `${avance}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-gray-300">
            <span>
              Estado: <strong className="text-white capitalize">{obra.estado}</strong>
            </span>
            <span>{etapas?.length || 0} fases en ejecución</span>
          </div>
        </Card>

        {/* TARJETA 2: RESUMEN DE CAMPO EN LENGUAJE HUMANO */}
        {ultimoResumen && (
          <Card className="border-orange/20 bg-orange/5 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-orange uppercase tracking-wider">
              <Sparkles className="size-3.5" /> Novedades Recientes en Sitio
            </div>
            <p className="mt-2 text-sm text-gray-800 leading-relaxed font-semibold">
              "{ultimoResumen}"
            </p>
            <p className="mt-2 text-[10px] text-gray-400 font-medium">
              Reportado por el residente de obra para tu tranquilidad.
            </p>
          </Card>
        )}

        {/* TARJETA 3: VISOR 3D / RENDER 360 / RENDERS HD */}
        {obra.modelo_visual_tipo !== 'ninguno' && (
          <Card className="overflow-hidden p-0 shadow-soft border-gray-200">
            <div className="border-b bg-gray-50 px-4 py-3 text-xs font-bold text-navy flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Box className="size-4 text-orange" />
                Diseño & Acabados Aprobados
              </span>
              <span className="text-[11px] text-gray-500 font-medium">
                {obra.modelo_visual_tipo === '3d_glb'
                  ? 'Modelo 3D Interactivo'
                  : obra.modelo_visual_tipo === 'render_360'
                    ? 'Panorámica 360°'
                    : 'Renders de Calidad HD'}
              </span>
            </div>
            <VisualViewer
              tipo={obra.modelo_visual_tipo}
              url={obra.modelo_visual_url}
              titulo={`Diseño: ${obra.nombre}`}
            />
          </Card>
        )}

        {/* TARJETA 4: FASES Y METRADOS REALES */}
        <Card className="shadow-soft">
          <CardTitle className="text-base font-bold text-navy flex items-center gap-2">
            <Layers className="size-4 text-orange" />
            Avance por Fases de Trabajo
          </CardTitle>
          <CardDescription className="mb-3 text-xs">
            Cantidades físicas ejecutadas y medidas en obra.
          </CardDescription>

          <div className="space-y-3">
            {(etapas ?? []).map((etapa) => (
              <div key={etapa.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-navy">{etapa.nombre}</span>
                  <span className="font-extrabold text-navy">{etapa.porcentaje}%</span>
                </div>
                <Progress value={etapa.porcentaje} className="mt-2 h-2" />
                <div className="mt-1.5 flex justify-between text-[11px] text-gray-500 font-medium">
                  <span>
                    Completado: <strong>{etapa.cantidad_acumulada || 0}</strong> de {etapa.cantidad_total || 100} {etapa.unidad_medida || 'm2'}
                  </span>
                  <span>{etapa.porcentaje >= 100 ? '✅ Finalizada' : 'En ejecución'}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* SECCIÓN DE ACEPTACIÓN FINAL / CONFORMIDAD (DISPONIBLE SI AVANCE >= 80% O POR CULMINACIÓN) */}
        {!yaEntregado && (
          <Card className="border-blue-200 bg-blue-50/40 p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-800">
                  Cierre de Entrega
                </span>
                <CardTitle className="text-base font-bold text-navy">
                  ¿El proyecto ya está culminado?
                </CardTitle>
                <CardDescription className="text-xs text-gray-600 mt-1">
                  Si ya recibiste las instalaciones y acabados a tu entera satisfacción, puedes registrar la conformidad de entrega.
                </CardDescription>
              </div>

              {!mostrarFormularioCierre && (
                <Button
                  onClick={() => {
                    setNombreConformidad(obra.cliente_nombre || '')
                    setMostrarFormularioCierre(true)
                  }}
                  className="shrink-0 bg-navy text-white text-xs font-bold hover:bg-navy-hover"
                >
                  <CheckCircle2 className="size-4 mr-1 text-emerald-400" /> Dar Conformidad
                </Button>
              )}
            </div>

            {mostrarFormularioCierre && (
              <div className="mt-4 border-t border-blue-200 pt-3 space-y-3">
                <p className="text-xs font-semibold text-navy">
                  Ingresa tu nombre completo para validar el recibo a satisfacción. Se registrará la fecha y hora exacta como constancia digital.
                </p>

                <Field label="Nombre Completo del Propietario / Recipiente" htmlFor="conf-nombre">
                  <Input
                    id="conf-nombre"
                    value={nombreConformidad}
                    onChange={(e) => setNombreConformidad(e.target.value)}
                    placeholder="Ej. Carlos Andrés Restrepo"
                    className="bg-white text-xs font-bold"
                  />
                </Field>

                <Field label="Comentarios u Observaciones Finales (Opcional)" htmlFor="conf-notas">
                  <Input
                    id="conf-notas"
                    value={notasConformidad}
                    onChange={(e) => setNotasConformidad(e.target.value)}
                    placeholder="Ej. Recibido a satisfacción con llaves y acabados completos."
                    className="bg-white text-xs"
                  />
                </Field>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    className="text-xs h-8"
                    onClick={() => setMostrarFormularioCierre(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    disabled={!nombreConformidad.trim() || guardandoConformidad}
                    onClick={handleAceptarConformidad}
                    className="text-xs h-8 bg-emerald-600 text-white hover:bg-emerald-700 font-bold"
                  >
                    <Check className="size-3.5 mr-1" />
                    {guardandoConformidad ? 'Registrando...' : 'Confirmar y Finalizar Proyecto'}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* TARJETA 5: CRONOLOGÍA DE ACTIVIDAD */}
        <Card className="shadow-soft">
          <CardTitle className="text-base font-bold text-navy flex items-center gap-2">
            <Calendar className="size-4 text-orange" />
            Bitácora de Campo Reciente
          </CardTitle>
          <CardDescription className="mb-3 text-xs">
            Registro cronológico de actividades y clima en sitio.
          </CardDescription>

          {!reportes || reportes.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">
              Aún no hay reportes de campo registrados en esta obra.
            </p>
          ) : (
            <div className="space-y-2">
              {reportes.slice(0, 5).map((r) => (
                <div key={r.id} className="rounded-lg border-l-4 border-navy bg-gray-50 p-3 text-xs">
                  <div className="flex justify-between text-[11px] text-gray-500 font-bold">
                    <span className="text-navy">{formatearFecha(r.captured_at)}</span>
                    {r.clima && <span className="capitalize">Clima: {r.clima}</span>}
                  </div>
                  <p className="mt-1.5 text-gray-800 font-medium leading-relaxed">
                    {r.resumen_cliente_ia || r.nota_tecnica}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <footer className="mt-8 pt-4 text-center">
          <p className="text-xs text-gray-500 font-medium">
            ¿Tienes alguna consulta o novedad sobre tu proyecto?
          </p>
          <p className="mt-1 text-xs text-navy font-bold">
            Comunícate directamente con el equipo de {empresaNombre}.
          </p>
          <div className="mt-4 flex justify-center">
            <Logo className="text-xs text-gray-300 opacity-60" />
          </div>
        </footer>
      </div>
    </div>
  )
}
