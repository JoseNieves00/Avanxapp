import { useEffect, useRef, useState } from 'react'
import { Camera, Check, Mic, MicOff, Sparkles, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/input'
import { db, type DiarioEntrada, type Etapa } from '@/lib/db'
import { estructurarReporteConGroq, transcribirAudioConGroq } from '@/lib/groq'

interface ReporteRapidoDialogProps {
  open: boolean
  onClose: () => void
  obraId: string
  etapas: Etapa[]
  onSaved?: () => void
}

export function ReporteRapidoDialog({
  open,
  onClose,
  obraId,
  etapas,
  onSaved,
}: ReporteRapidoDialogProps) {
  const [grabando, setGrabando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [procesandoIA, setProcesandoIA] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)

  const [etapaSeleccionadaId, setEtapaSeleccionadaId] = useState<string>(etapas[0]?.id ?? '')
  const [cantidadReportada, setCantidadReportada] = useState<number>(0)
  const [notaTecnica, setNotaTecnica] = useState('')
  const [resumenCliente, setResumenCliente] = useState('')
  const [personalActivo, setPersonalActivo] = useState<number>(0)
  const [clima, setClima] = useState<'soleado' | 'lluvia' | 'nublado'>('soleado')
  const [fotos, setFotos] = useState<{ id: string; url: string; blob: Blob }[]>([])
  const [audioBlobGuardado, setAudioBlobGuardado] = useState<Blob | null>(null)

  const etapaActual = etapas.find((e) => e.id === etapaSeleccionadaId)

  const cantidadTotal = etapaActual?.cantidad_total || 100
  const cantidadAcumuladaPrevia = etapaActual?.cantidad_acumulada || 0
  const nuevaCantidadAcumulada = cantidadAcumuladaPrevia + Number(cantidadReportada || 0)
  const nuevoPorcentajeCalculado = Math.min(
    100,
    Math.round((nuevaCantidadAcumulada / cantidadTotal) * 1000) / 10,
  )

  useEffect(() => {
    if (etapas.length > 0 && !etapaSeleccionadaId) {
      setEtapaSeleccionadaId(etapas[0].id)
    }
  }, [etapas, etapaSeleccionadaId])

  useEffect(() => {
    if (grabando) {
      timerRef.current = window.setInterval(() => {
        setSegundos((s) => s + 1)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setSegundos(0)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [grabando])

  async function toggleGrabacion() {
    if (grabando) {
      mediaRecorderRef.current?.stop()
      setGrabando(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data)
        }

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          setAudioBlobGuardado(audioBlob)
          stream.getTracks().forEach((track) => track.stop())
          await procesarConGroq(audioBlob)
        }

        mediaRecorder.start()
        setGrabando(true)
      } catch (err) {
        console.error('Error micrófono:', err)
        alert('No se pudo acceder al micrófono. Puedes escribir el reporte manualmente.')
      }
    }
  }

  async function procesarConGroq(audioBlob: Blob) {
    setProcesandoIA(true)
    try {
      const texto = await transcribirAudioConGroq(audioBlob)
      const estructurado = await estructurarReporteConGroq(
        texto,
        etapas.map((e) => ({
          id: e.id,
          nombre: e.nombre,
          unidad_medida: e.unidad_medida,
          cantidad_total: e.cantidad_total,
          cantidad_acumulada: e.cantidad_acumulada,
        })),
      )

      if (estructurado.etapa_id) setEtapaSeleccionadaId(estructurado.etapa_id)
      if (estructurado.cantidad_reportada > 0) setCantidadReportada(estructurado.cantidad_reportada)
      setNotaTecnica(estructurado.nota_tecnica || texto)
      setResumenCliente(estructurado.resumen_cliente || '')
      if (estructurado.personal_activo) setPersonalActivo(estructurado.personal_activo)
      if (estructurado.clima) setClima(estructurado.clima)
    } catch (err) {
      console.error('Error Groq:', err)
    } finally {
      setProcesandoIA(false)
    }
  }

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setFotos((prev) => [...prev, { id: crypto.randomUUID(), url, blob: file }])
  }

  async function handleGuardar() {
    if (!etapaSeleccionadaId) return
    const ahora = new Date().toISOString()
    const entradaId = crypto.randomUUID()

    const nuevaEntrada: DiarioEntrada = {
      id: entradaId,
      obra_id: obraId,
      etapa_id: etapaSeleccionadaId,
      tipo: 'avance',
      cantidad_reportada: Number(cantidadReportada || 0),
      porcentaje_calculado: nuevoPorcentajeCalculado,
      nota_tecnica: notaTecnica || 'Avance de obra registrado.',
      resumen_cliente_ia: resumenCliente || null,
      audio_blob: audioBlobGuardado,
      clima,
      personal_activo: personalActivo,
      captured_at: ahora,
      created_at: ahora,
    }

    await db.transaction('rw', db.diario_entradas, db.etapas, db.outbox, async () => {
      await db.diario_entradas.add(nuevaEntrada)
      if (etapaActual) {
        await db.etapas.update(etapaSeleccionadaId, {
          cantidad_acumulada: nuevaCantidadAcumulada,
          porcentaje: nuevoPorcentajeCalculado,
          estado: nuevoPorcentajeCalculado >= 100 ? 'completada' : 'en_progreso',
          client_updated_at: ahora,
        })
      }
      await db.outbox.add({
        table: 'diario_obra_entradas',
        op: 'insert',
        row: { ...nuevaEntrada },
        attempts: 0,
        lastError: null,
        createdAt: ahora,
      })
    })

    onSaved?.()
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Registrar Informe Semanal de Avance"
      description="Toca el micrófono para dictar el avance de la semana o ingresa las cantidades directamente."
    >
      <div className="grid gap-3">
        {/* Micrófono Groq */}
        <div className="rounded-md border border-orange/20 bg-orange/5 p-3 text-center">
          <p className="text-xs font-semibold text-gray-700">
            {grabando
              ? `Grabando... ${segundos}s (Toca para terminar)`
              : procesandoIA
                ? 'Analizando informe semanal y calculando avance...'
                : 'Dicta el avance de la semana (ej. "Avanzamos 25 m² de pañete y se dejaron listos los puntos eléctricos")'}
          </p>

          <div className="mt-2 flex justify-center">
            <button
              type="button"
              onClick={toggleGrabacion}
              disabled={procesandoIA}
              className={`flex size-14 items-center justify-center rounded-full shadow-md transition-all ${
                grabando
                  ? 'animate-pulse bg-red-600 text-white ring-4 ring-red-200'
                  : procesandoIA
                    ? 'bg-gray-300 text-gray-500'
                    : 'bg-orange text-white hover:brightness-95'
              }`}
            >
              {grabando ? <MicOff className="size-6" /> : <Mic className="size-6" />}
            </button>
          </div>
        </div>

        {/* Selección de Fase */}
        <Field label="Fase / Hito a Reportar" htmlFor="etapa">
          <select
            id="etapa"
            value={etapaSeleccionadaId}
            onChange={(e) => setEtapaSeleccionadaId(e.target.value)}
            className="w-full rounded-sm border border-gray-300 bg-white p-2 text-sm font-semibold text-navy"
          >
            {etapas.map((etapa) => (
              <option key={etapa.id} value={etapa.id}>
                {etapa.nombre} (Meta: {etapa.cantidad_total} {etapa.unidad_medida})
              </option>
            ))}
          </select>
        </Field>

        {/* Medición Cuantitativa */}
        <div className="rounded-sm border border-gray-100 bg-gray-50 p-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-gray-700">
              Cantidad Ejecutada en la Semana ({etapaActual?.unidad_medida || 'm2'})
            </span>
            <Badge variant="blue" className="bg-navy text-white text-[10px]">
              Meta: {cantidadTotal} {etapaActual?.unidad_medida || 'm2'}
            </Badge>
          </div>

          <div className="mt-1.5 flex items-center gap-3">
            <Input
              type="number"
              step="0.1"
              min="0"
              value={cantidadReportada || ''}
              onChange={(e) => setCantidadReportada(parseFloat(e.target.value) || 0)}
              placeholder="Ej. 25"
              className="text-base font-bold text-navy"
            />
            <div className="min-w-24 text-right">
              <span className="text-[10px] text-gray-500">Nuevo Avance:</span>
              <p className="text-lg font-extrabold text-success">
                {nuevoPorcentajeCalculado}%
              </p>
            </div>
          </div>
        </div>

        {/* Fotos */}
        <div>
          <label className="text-xs font-bold text-gray-700">Fotos de Evidencia</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {fotos.map((foto, index) => (
              <div key={foto.id} className="relative size-14 overflow-hidden rounded-sm border">
                <img src={foto.url} alt={`Evidencia ${index}`} className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => setFotos(fotos.filter((f) => f.id !== foto.id))}
                  className="absolute top-0 right-0 bg-black/60 p-0.5 text-white"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}

            <label className="flex size-14 cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-100">
              <Camera className="size-5 text-gray-400" />
              <span className="text-[9px] font-bold">Foto</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFoto}
              />
            </label>
          </div>
        </div>

        {/* Nota Técnica */}
        <Field label="Nota Técnica (Libro de Obra)" htmlFor="nota">
          <textarea
            id="nota"
            rows={2}
            value={notaTecnica}
            onChange={(e) => setNotaTecnica(e.target.value)}
            placeholder="Detalles técnicos..."
            className="w-full rounded-sm border border-gray-300 p-1.5 text-xs text-gray-800"
          />
        </Field>

        {/* Resumen para el Cliente */}
        {resumenCliente && (
          <div className="rounded-sm border border-blue-100 bg-blue-50/60 p-2 text-xs">
            <div className="flex items-center gap-1 font-bold text-blue-900">
              <Sparkles className="size-3 text-orange" /> Para el Portal del Cliente:
            </div>
            <p className="mt-1 text-blue-950 italic">"{resumenCliente}"</p>
          </div>
        )}

        <div className="mt-2 flex gap-2">
          <Button variant="outline" className="w-1/3" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="w-2/3 bg-navy text-white hover:bg-navy-hover" onClick={handleGuardar}>
            <Check className="mr-1.5 size-4" /> Guardar
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
