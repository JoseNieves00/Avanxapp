import { useEffect, useState } from 'react'
import {
  Box,
  Check,
  Eye,
  FileSpreadsheet,
  Hammer,
  Image as ImageIcon,
  Plus,
  Trash2,
  UploadCloud,
  Wrench,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/input'
import type { ModeloVisualTipo, Obra, TipoProyecto } from '@/lib/db'
import {
  crearObra,
  formatearPresupuestoCOP,
  parsearFasesCSV,
  PLANTILLA_ACABADOS,
  PLANTILLA_ADECUACIONES,
  PLANTILLA_COCINA_PREMIUM,
  PLANTILLA_OBRA_NUEVA,
  PLANTILLA_REMODELACION,
  validarNuevaObra,
  type EtapaPlantilla,
  type PlantillaPersonalizada,
} from '@/lib/obras'

export function CrearObraDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (obra: Obra) => void
}) {
  const [paso, setPaso] = useState<1 | 2>(1)
  const [tipoProyecto, setTipoProyecto] = useState<TipoProyecto>('remodelacion')
  const [nombre, setNombre] = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const [presupuesto, setPresupuesto] = useState('')
  const [modeloVisualTipo, setModeloVisualTipo] = useState<ModeloVisualTipo>('3d_glb')
  const [modeloVisualUrl, setModeloVisualUrl] = useState('')
  const [archivoNombre, setArchivoNombre] = useState('')

  // Etapas
  const [etapas, setEtapas] = useState<EtapaPlantilla[]>(PLANTILLA_REMODELACION)
  const [csvTexto, setCsvTexto] = useState('')
  const [mostrandoCsv, setMostrandoCsv] = useState(false)
  const [nuevaFaseNombre, setNuevaFaseNombre] = useState('')
  const [nuevaFaseCantidad, setNuevaFaseCantidad] = useState('100')
  const [nuevaFaseUnidad, setNuevaFaseUnidad] = useState('m2')

  const [errores, setErrores] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)

  // Presupuesto formateado en tiempo real
  const presupuestoNum = parseFloat(presupuesto) || 0
  const { formateado, textoMillones } = formatearPresupuestoCOP(presupuestoNum)

  const [plantillasGuardadas, setPlantillasGuardadas] = useState<PlantillaPersonalizada[]>([])

  useEffect(() => {
    if (open) {
      setPaso(1)
      setNombre('')
      setClienteNombre('')
      setClienteTelefono('')
      setDireccion('')
      setPresupuesto('')
      setModeloVisualUrl('')
      setArchivoNombre('')
      
      // Cargar plantillas de la empresa si existen
      const plantillasStr = localStorage.getItem('avanx_empresa_plantillas')
      if (plantillasStr) {
        try {
          const parsed = JSON.parse(plantillasStr)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPlantillasGuardadas(parsed)
          }
        } catch {}
      }

      // Tomar especialidad de la empresa si existe en localStorage
      const especialidadGuardada = localStorage.getItem('avanx_empresa_esp')
      let tipoInicial: TipoProyecto = 'remodelacion'
      let plantillaInicial = PLANTILLA_REMODELACION

      if (especialidadGuardada === 'construccion') {
        tipoInicial = 'obra_nueva'
        plantillaInicial = PLANTILLA_OBRA_NUEVA
      } else if (especialidadGuardada === 'adecuaciones') {
        tipoInicial = 'remodelacion'
        plantillaInicial = PLANTILLA_ADECUACIONES
      } else if (especialidadGuardada === 'acabados') {
        tipoInicial = 'remodelacion'
        plantillaInicial = PLANTILLA_ACABADOS
      }

      setTipoProyecto(tipoInicial)
      setEtapas(plantillaInicial)
      setErrores({})
      setGuardando(false)
    }
  }, [open])

  function cambiarTipoProyecto(tipo: TipoProyecto, plantilla?: EtapaPlantilla[]) {
    setTipoProyecto(tipo)
    if (plantilla) {
      setEtapas(plantilla)
    } else if (tipo === 'remodelacion') {
      setEtapas(PLANTILLA_REMODELACION)
    } else if (tipo === 'obra_nueva') {
      setEtapas(PLANTILLA_OBRA_NUEVA)
    } else {
      setEtapas([])
    }
  }

  function handleArchivoSeleccionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setArchivoNombre(file.name)

    // Detectar tipo según extensión
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'glb' || ext === 'gltf') {
      setModeloVisualTipo('3d_glb')
    } else if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') {
      if (modeloVisualTipo !== 'render_360') {
        setModeloVisualTipo('renders_planos')
      }
    }

    // Convertir a Data URL para almacenamiento y visualización inmediata sin romper offline
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setModeloVisualUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  function handleImportarCsv() {
    if (!csvTexto.trim()) return
    const fases = parsearFasesCSV(csvTexto)
    if (fases.length > 0) {
      setEtapas(fases)
      setMostrandoCsv(false)
      setCsvTexto('')
    } else {
      alert('El formato CSV no es válido. Usa: Nombre, Cantidad, Unidad, Peso')
    }
  }

  function agregarFaseManual() {
    if (!nuevaFaseNombre.trim()) return
    setEtapas((prev) => [
      ...prev,
      {
        nombre: nuevaFaseNombre.trim(),
        cantidad_total: parseFloat(nuevaFaseCantidad) || 100,
        unidad_medida: nuevaFaseUnidad || 'm2',
        peso: Math.round(100 / (prev.length + 1)),
      },
    ])
    setNuevaFaseNombre('')
  }

  function quitarFase(index: number) {
    setEtapas((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleGuardar() {
    const errorList = validarNuevaObra({
      nombre,
      tipo_proyecto: tipoProyecto,
      cliente_nombre: clienteNombre,
      cliente_telefono: clienteTelefono,
      direccion,
      etapas,
    })

    if (errorList.length > 0) {
      const errMap: Record<string, string> = {}
      errorList.forEach((e) => (errMap[e.campo] = e.mensaje))
      setErrores(errMap)
      return
    }

    setGuardando(true)
    try {
      const obra = await crearObra({
        nombre,
        tipo_proyecto: tipoProyecto,
        cliente_nombre: clienteNombre,
        cliente_telefono: clienteTelefono,
        direccion,
        presupuesto_estimado: parseFloat(presupuesto) || 0,
        modelo_visual_tipo: modeloVisualTipo,
        modelo_visual_url: modeloVisualUrl || undefined,
        etapas,
      })
      onCreated(obra)
      onClose()
    } catch (e: any) {
      setErrores({ general: e.message })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={paso === 1 ? 'Crear Nuevo Proyecto' : 'Configurar Fases Medibles'}
      description={
        paso === 1
          ? 'Ingresa los datos del contrato y arrastra el modelo o renders.'
          : 'Establece cantidades exactas por fase (m², m³, ml, und, pto).'
      }
    >
      {paso === 1 ? (
        <div className="grid gap-3">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700">Tipo y Especialidad</label>
              {plantillasGuardadas.length > 0 && (
                <span className="text-[10px] text-orange font-bold">
                  {plantillasGuardadas.length} plantillas guardadas
                </span>
              )}
            </div>

            {/* Plantillas Guardadas de la Empresa */}
            {plantillasGuardadas.length > 0 && (
              <div className="mt-1 mb-2 flex flex-wrap gap-1.5">
                {plantillasGuardadas.map((pl) => (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => {
                      setTipoProyecto(pl.tipo)
                      setEtapas(pl.etapas)
                    }}
                    className={`rounded-xs border px-2 py-1 text-[10px] font-bold transition-all ${
                      etapas === pl.etapas
                        ? 'border-navy bg-navy text-white shadow-xs'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    ★ {pl.nombre}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-1 grid grid-cols-4 gap-1.5">
              {[
                { id: 'cocina', label: 'Cocina Lujo', icon: Hammer, t: 'remodelacion', p: PLANTILLA_COCINA_PREMIUM },
                { id: 'remodelacion', label: 'Remodelación', icon: Hammer, t: 'remodelacion', p: PLANTILLA_REMODELACION },
                { id: 'obra_nueva', label: 'Construcción', icon: Box, t: 'obra_nueva', p: PLANTILLA_OBRA_NUEVA },
                { id: 'adecuaciones', label: 'Adecuación', icon: Wrench, t: 'remodelacion', p: PLANTILLA_ADECUACIONES },
              ].map(({ id, label, icon: Icon, t, p }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => cambiarTipoProyecto(t as TipoProyecto, p)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-sm border p-2 text-[11px] font-bold transition-all ${
                    etapas === p
                      ? 'border-orange bg-orange/10 text-orange shadow-xs'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Field label="Nombre del Proyecto / Obra" htmlFor="nombre" error={errores.nombre}>
            <Input
              id="nombre"
              placeholder="Ej. Remodelación Cocina Apto 402 / Bodega Siberia"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Cliente / Propietario" htmlFor="cliente">
              <Input
                id="cliente"
                placeholder="Nombre del cliente"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
              />
            </Field>
            <Field label="WhatsApp del Cliente" htmlFor="tel" error={errores.cliente_telefono}>
              <Input
                id="tel"
                placeholder="300 123 4567"
                value={clienteTelefono}
                onChange={(e) => setClienteTelefono(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Dirección / Ubicación" htmlFor="dir">
              <Input
                id="dir"
                placeholder="Ciudad o dirección"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
              />
            </Field>
            <div>
              <Field label="Presupuesto Estimado (COP)" htmlFor="presupuesto">
                <Input
                  id="presupuesto"
                  type="number"
                  placeholder="Ej. 20000000"
                  value={presupuesto}
                  onChange={(e) => setPresupuesto(e.target.value)}
                />
              </Field>
              {presupuestoNum > 0 && (
                <p className="mt-1 text-[11px] font-bold text-navy truncate">
                  {formateado} {textoMillones ? `(${textoMillones})` : ''}
                </p>
              )}
            </div>
          </div>

          {/* Arrastrar y Soltar / Subir Renders o Modelos */}
          <div className="rounded-sm border border-gray-200 bg-gray-50 p-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800">
                Visualización de Diseño (3D, 360° o Renders)
              </label>
              <div className="flex gap-1">
                {[
                  { id: '3d_glb', label: '3D', icon: Box },
                  { id: 'render_360', label: '360°', icon: Eye },
                  { id: 'renders_planos', label: 'Renders', icon: ImageIcon },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setModeloVisualTipo(id as ModeloVisualTipo)}
                    className={`flex items-center gap-1 rounded-xs border px-1.5 py-0.5 text-[10px] font-bold ${
                      modeloVisualTipo === id
                        ? 'border-navy bg-navy text-white'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="size-3" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dropzone */}
            <div className="mt-2">
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    const file = e.dataTransfer.files[0]
                    setArchivoNombre(file.name)
                    const ext = file.name.split('.').pop()?.toLowerCase()
                    if (ext === 'glb' || ext === 'gltf') setModeloVisualTipo('3d_glb')
                    else if (modeloVisualTipo !== 'render_360') setModeloVisualTipo('renders_planos')

                    const reader = new FileReader()
                    reader.onload = () => {
                      if (typeof reader.result === 'string') setModeloVisualUrl(reader.result)
                    }
                    reader.readAsDataURL(file)
                  }
                }}
                className="flex flex-col items-center justify-center rounded-sm border-2 border-dashed border-gray-300 bg-white p-3 text-center cursor-pointer hover:border-orange transition-colors"
              >
                <UploadCloud className="size-6 text-gray-400 mb-1" />
                <p className="text-xs font-bold text-navy">
                  {archivoNombre ? (
                    <span className="text-emerald-700">✓ Archivo cargado: {archivoNombre}</span>
                  ) : (
                    'Arrastra aquí el archivo o haz clic para seleccionarlo'
                  )}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Formatos admitidos: Modelo 3D (.glb, .gltf) · Fotos 360° (.jpg) · Renders HD (.png, .webp)
                </p>
                <input
                  type="file"
                  accept=".glb,.gltf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={handleArchivoSeleccionado}
                />
              </label>
            </div>
          </div>

          <Button className="mt-2 w-full bg-navy text-white hover:bg-navy-hover" onClick={() => setPaso(2)}>
            Continuar a Fases de Obra →
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-700">Fases del Proyecto ({etapas.length})</span>
              <p className="text-[10px] text-gray-500">Unidades cuantitativas para medir el avance físico real</p>
            </div>
            <Button
              variant="outline"
              className="h-8 gap-1 px-2.5 text-xs"
              onClick={() => setMostrandoCsv(!mostrandoCsv)}
            >
              <FileSpreadsheet className="size-3.5" /> Importar Excel/CSV
            </Button>
          </div>

          {mostrandoCsv && (
            <div className="rounded-sm border border-orange/30 bg-orange/5 p-2.5">
              <p className="text-xs font-bold text-orange">Pega las filas de tu presupuesto o Excel:</p>
              <textarea
                rows={3}
                value={csvTexto}
                onChange={(e) => setCsvTexto(e.target.value)}
                placeholder={`Demolición, 80, m2, 15\nRedes Eléctricas, 50, ml, 25\nPuntos Eléctricos, 20, pto, 20\nEstructura Metálica, 500, kg, 40`}
                className="mt-1 w-full rounded-sm border border-gray-300 p-1.5 text-xs font-mono"
              />
              <div className="mt-1.5 flex gap-2">
                <Button className="h-8 px-3 text-xs" onClick={handleImportarCsv}>
                  Procesar CSV
                </Button>
                <Button className="h-8 px-3 text-xs" variant="ghost" onClick={() => setMostrandoCsv(false)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}

          <div className="max-h-52 space-y-1.5 overflow-y-auto">
            {etapas.map((etapa, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 rounded-sm border border-gray-200 bg-white p-2 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-navy">{etapa.nombre}</p>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Meta: {etapa.cantidad_total || 100} {etapa.unidad_medida || 'm2'} · Ponderación: {etapa.peso}%
                    {etapa.materiales && etapa.materiales.length > 0 && (
                      <span className="ml-1 text-orange font-bold">
                        · {etapa.materiales.length} suministros asociados
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => quitarFase(idx)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Agregar nueva fase con todas las unidades técnicas exactas */}
          <div className="flex gap-1.5 rounded-sm border border-dashed border-gray-300 p-1.5">
            <Input
              placeholder="Nombre fase (ej. Mampostería)"
              value={nuevaFaseNombre}
              onChange={(e) => setNuevaFaseNombre(e.target.value)}
              className="h-8 text-xs flex-1"
            />
            <Input
              type="number"
              placeholder="Meta"
              value={nuevaFaseCantidad}
              onChange={(e) => setNuevaFaseCantidad(e.target.value)}
              className="h-8 w-16 text-xs"
            />
            <select
              value={nuevaFaseUnidad}
              onChange={(e) => setNuevaFaseUnidad(e.target.value)}
              className="h-8 rounded-sm border border-gray-300 text-xs px-1 bg-white"
            >
              <option value="m2">m² (Área)</option>
              <option value="m3">m³ (Volumen)</option>
              <option value="ml">ml (Longitud)</option>
              <option value="und">und (Unidades)</option>
              <option value="pto">pto (Puntos)</option>
              <option value="kg">kg (Acero/Kilos)</option>
              <option value="gl">gl (Global)</option>
            </select>
            <Button className="h-8 px-2.5" onClick={agregarFaseManual}>
              <Plus className="size-4" />
            </Button>
          </div>

          <div className="mt-2 flex gap-2">
            <Button variant="outline" className="w-1/3" onClick={() => setPaso(1)}>
              ← Volver
            </Button>
            <Button
              className="w-2/3 bg-orange text-white hover:brightness-95"
              disabled={guardando || etapas.length === 0}
              onClick={handleGuardar}
            >
              <Check className="mr-1.5 size-4" />
              {guardando ? 'Creando...' : 'Crear Obra'}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}
