import {
  db,
  type Etapa,
  type EtapaAvance,
  type ModeloVisualTipo,
  type ModulosActivos,
  type Obra,
  type TipoProyecto,
} from '@/lib/db'

export interface MaterialPlantilla {
  nombre: string
  cantidad_estimada: number
  unidad: string
}

export interface EtapaPlantilla {
  nombre: string
  peso: number
  cantidad_total?: number
  unidad_medida?: string
  materiales?: MaterialPlantilla[]
}

export interface PlantillaPersonalizada {
  id: string
  nombre: string
  tipo: TipoProyecto
  descripcion?: string
  etapas: EtapaPlantilla[]
}

export const PLANTILLA_COCINA_PREMIUM: EtapaPlantilla[] = [
  {
    nombre: 'Desmonte y adecuaciones hidrosanitarias y de gas',
    peso: 15,
    cantidad_total: 12,
    unidad_medida: 'ml',
    materiales: [
      { nombre: 'Tubería y accesorios PVC/CPVC', cantidad_estimada: 6, unidad: 'ml' },
      { nombre: 'Puntos de gas y manguera certificada', cantidad_estimada: 1, unidad: 'und' },
    ],
  },
  {
    nombre: 'Adecuación de puntos eléctricos (isla, horno, campana)',
    peso: 15,
    cantidad_total: 8,
    unidad_medida: 'pto',
    materiales: [
      { nombre: 'Cableado calibre 12 y tomas GFCI', cantidad_estimada: 8, unidad: 'und' },
    ],
  },
  {
    nombre: 'Enchape de muros y salpicadero (Splashback)',
    peso: 20,
    cantidad_total: 18,
    unidad_medida: 'm2',
    materiales: [
      { nombre: 'Porcelanato / Cerámica rectificada', cantidad_estimada: 20, unidad: 'm2' },
      { nombre: 'Pega enchape blanco flexible', cantidad_estimada: 4, unidad: 'bultos' },
    ],
  },
  {
    nombre: 'Fabricación e instalación de mueble bajo y alto',
    peso: 25,
    cantidad_total: 9,
    unidad_medida: 'ml',
    materiales: [
      { nombre: 'Módulos en melamina RH hidrófuga 15mm', cantidad_estimada: 9, unidad: 'ml' },
      { nombre: 'Bisagras y rieles de cierre lento', cantidad_estimada: 24, unidad: 'und' },
    ],
  },
  {
    nombre: 'Suministro e instalación de mesón en cuarzo / granito',
    peso: 15,
    cantidad_total: 6,
    unidad_medida: 'ml',
    materiales: [
      { nombre: 'Plancha de cuarzo blanco calacatta', cantidad_estimada: 6, unidad: 'ml' },
      { nombre: 'Lavaplatos submontar en acero inoxidable', cantidad_estimada: 1, unidad: 'und' },
    ],
  },
  {
    nombre: 'Instalación de grifería, electrodomésticos y aseo',
    peso: 10,
    cantidad_total: 1,
    unidad_medida: 'gl',
    materiales: [
      { nombre: 'Grifería monocontrol extensible', cantidad_estimada: 1, unidad: 'und' },
      { nombre: 'Campana extractora y cubierta', cantidad_estimada: 2, unidad: 'und' },
    ],
  },
]

export const PLANTILLA_REMODELACION: EtapaPlantilla[] = [
  {
    nombre: 'Demoliciones y desmontes',
    peso: 15,
    cantidad_total: 80,
    unidad_medida: 'm2',
    materiales: [{ nombre: 'Costales de escombros y lonas', cantidad_estimada: 40, unidad: 'und' }],
  },
  {
    nombre: 'Redes hidrosanitarias y eléctricas',
    peso: 20,
    cantidad_total: 45,
    unidad_medida: 'ml',
    materiales: [
      { nombre: 'Tubería hidráulica 1/2" RDE 9', cantidad_estimada: 10, unidad: 'tubos' },
      { nombre: 'Tubería sanitaria 3" y 2"', cantidad_estimada: 6, unidad: 'tubos' },
    ],
  },
  {
    nombre: 'Muros drywall y pañetes',
    peso: 15,
    cantidad_total: 90,
    unidad_medida: 'm2',
    materiales: [
      { nombre: 'Placas de yeso Drywall standard', cantidad_estimada: 30, unidad: 'und' },
      { nombre: 'Perfiles canal y parante', cantidad_estimada: 45, unidad: 'und' },
    ],
  },
  {
    nombre: 'Pisos y enchapes',
    peso: 20,
    cantidad_total: 75,
    unidad_medida: 'm2',
    materiales: [
      { nombre: 'Piso porcelanato rectificado', cantidad_estimada: 85, unidad: 'm2' },
      { nombre: 'Pegante para porcelanato', cantidad_estimada: 18, unidad: 'bultos' },
    ],
  },
  {
    nombre: 'Pintura y carpintería',
    peso: 20,
    cantidad_total: 120,
    unidad_medida: 'm2',
    materiales: [
      { nombre: 'Pintura tipo 1 lavable', cantidad_estimada: 3, unidad: 'cuñetes' },
      { nombre: 'Puertas entableradas con marco', cantidad_estimada: 4, unidad: 'und' },
    ],
  },
  {
    nombre: 'Aseo y entrega final',
    peso: 10,
    cantidad_total: 1,
    unidad_medida: 'gl',
    materiales: [{ nombre: 'Kit de protección y limpieza profunda', cantidad_estimada: 1, unidad: 'gl' }],
  },
]

export const PLANTILLA_OBRA_NUEVA: EtapaPlantilla[] = [
  { nombre: 'Preliminares y excavación', peso: 10, cantidad_total: 150, unidad_medida: 'm3' },
  { nombre: 'Cimentación', peso: 15, cantidad_total: 60, unidad_medida: 'm3' },
  { nombre: 'Estructura en concreto', peso: 25, cantidad_total: 200, unidad_medida: 'm2' },
  { nombre: 'Mampostería y muros', peso: 15, cantidad_total: 280, unidad_medida: 'm2' },
  { nombre: 'Instalaciones técnicas', peso: 15, cantidad_total: 120, unidad_medida: 'ml' },
  { nombre: 'Acabados y carpintería', peso: 15, cantidad_total: 200, unidad_medida: 'm2' },
  { nombre: 'Limpieza y entrega', peso: 5, cantidad_total: 1, unidad_medida: 'global' },
]

export const PLANTILLA_ADECUACIONES: EtapaPlantilla[] = [
  { nombre: 'Desmonte y retiro de instalaciones previas', peso: 15, cantidad_total: 60, unidad_medida: 'm2' },
  { nombre: 'Adecuación de redes y canalizaciones', peso: 25, cantidad_total: 40, unidad_medida: 'ml' },
  { nombre: 'Divisiones ligeras, tabiquería y techos', peso: 25, cantidad_total: 75, unidad_medida: 'm2' },
  { nombre: 'Pintura, enchapes y pisos', peso: 20, cantidad_total: 100, unidad_medida: 'm2' },
  { nombre: 'Iluminación, tomas y remates finales', peso: 15, cantidad_total: 25, unidad_medida: 'pto' },
]

export const PLANTILLA_ACABADOS: EtapaPlantilla[] = [
  { nombre: 'Resanes, estucos y preparación de muros', peso: 20, cantidad_total: 150, unidad_medida: 'm2' },
  { nombre: 'Pisos porcelanato / vinílico / madera', peso: 25, cantidad_total: 80, unidad_medida: 'm2' },
  { nombre: 'Enchapes baños y cocina', peso: 20, cantidad_total: 40, unidad_medida: 'm2' },
  { nombre: 'Pintura general lavable de primera', peso: 15, cantidad_total: 180, unidad_medida: 'm2' },
  { nombre: 'Carpintería arquitectónica y griferías', peso: 20, cantidad_total: 12, unidad_medida: 'und' },
]

export const ETAPAS_PLANTILLA = PLANTILLA_REMODELACION

export function formatearPresupuestoCOP(valor: number): { formateado: string; textoMillones: string } {
  if (!valor || isNaN(valor) || valor <= 0) {
    return { formateado: '$ 0', textoMillones: '' }
  }

  const formateado = `$ ${valor.toLocaleString('es-CO')}`

  let textoMillones = ''
  if (valor >= 1_000_000_000) {
    const milesDeMillones = valor / 1_000_000_000
    textoMillones = `${milesDeMillones % 1 === 0 ? milesDeMillones : milesDeMillones.toFixed(1)} mil millones de pesos COP`
  } else if (valor >= 1_000_000) {
    const millones = valor / 1_000_000
    textoMillones = `${millones % 1 === 0 ? millones : millones.toFixed(1)} millones de pesos COP`
  } else if (valor >= 1_000) {
    const miles = valor / 1_000
    textoMillones = `${miles % 1 === 0 ? miles : miles.toFixed(0)} mil pesos COP`
  }

  return { formateado, textoMillones }
}

export interface NuevaObraInput {
  nombre: string
  tipo_proyecto?: TipoProyecto
  cliente_nombre: string
  cliente_telefono?: string
  cliente_email?: string
  direccion?: string
  notas?: string
  presupuesto_estimado?: number
  fecha_inicio?: string
  fecha_fin_estimada?: string
  modelo_visual_tipo?: ModeloVisualTipo
  modelo_visual_url?: string | null
  modulos_activos?: ModulosActivos
  etapas: EtapaPlantilla[]
}

export interface ObraError {
  campo: string
  mensaje: string
}

export function normalizarTelefono(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  if (!digits) return null
  const national = digits.startsWith('57') && digits.length > 10 ? digits.slice(2) : digits
  if (!/^[36]\d{9}$/.test(national)) return null
  return `+57${national}`
}

export function redondear(valor: number, decimales = 1): number {
  const factor = 10 ** decimales
  return Math.round(valor * factor) / factor
}

export function parsearFasesCSV(csvTexto: string): EtapaPlantilla[] {
  const lineas = csvTexto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lineas.length <= 1) return []

  const resultado: EtapaPlantilla[] = []
  const inicio = lineas[0].toLowerCase().includes('nombre') || lineas[0].toLowerCase().includes('fase') ? 1 : 0

  for (let i = inicio; i < lineas.length; i++) {
    const partes = lineas[i].split(/[,;\t]/).map((p) => p.trim())
    if (partes[0]) {
      const nombre = partes[0]
      const cantidad = parseFloat(partes[1]) || 100
      const unidad = partes[2] || 'm2'
      const peso = parseFloat(partes[3]) || 0
      resultado.push({
        nombre,
        cantidad_total: cantidad,
        unidad_medida: unidad,
        peso,
      })
    }
  }

  const tienePesos = resultado.some((r) => r.peso > 0)
  if (!tienePesos && resultado.length > 0) {
    const pesoPorFase = redondear(100 / resultado.length)
    resultado.forEach((r) => (r.peso = pesoPorFase))
  }

  return resultado
}

export function validarNuevaObra(input: NuevaObraInput): ObraError[] {
  const errores: ObraError[] = []

  if (!input.nombre || input.nombre.trim().length < 2) {
    errores.push({
      campo: 'nombre',
      mensaje: 'Escribe un nombre de al menos 2 caracteres.',
    })
  }

  if (input.cliente_telefono?.trim() && !normalizarTelefono(input.cliente_telefono)) {
    errores.push({
      campo: 'cliente_telefono',
      mensaje: 'Escribe un teléfono colombiano válido (10 dígitos).',
    })
  }

  const etapasValidas = input.etapas.filter((e) => e.nombre.trim())
  if (etapasValidas.length === 0) {
    errores.push({
      campo: 'etapas',
      mensaje: 'Agrega al menos una fase de trabajo.',
    })
  } else {
    const total = etapasValidas.reduce((sum, etapa) => sum + (Number(etapa.peso) || 0), 0)
    if (Math.abs(total - 100) > 0.01) {
      errores.push({
        campo: 'etapas',
        mensaje: `Los pesos deben sumar 100% (van ${redondear(total)}%).`,
      })
    }
    if (etapasValidas.some((etapa) => (etapa.peso || 0) <= 0)) {
      errores.push({
        campo: 'etapas',
        mensaje: 'Cada etapa necesita un peso mayor que 0.',
      })
    }
  }

  return errores
}

export async function crearObra(input: NuevaObraInput): Promise<Obra> {
  const ahora = new Date().toISOString()
  const telefono = input.cliente_telefono ? normalizarTelefono(input.cliente_telefono) : null
  const tokenCliente = crypto.randomUUID().replace(/-/g, '').slice(0, 24)

  const modulosDefault: ModulosActivos = {
    fotos: true,
    materiales: false,
    portal_cliente: true,
    adicionales: true,
    visor_3d: true,
  }

  const obra: Obra = {
    id: crypto.randomUUID(),
    nombre: input.nombre.trim(),
    tipo_proyecto: input.tipo_proyecto || 'remodelacion',
    cliente_nombre: input.cliente_nombre?.trim() || 'Cliente General',
    cliente_telefono: telefono,
    cliente_email: input.cliente_email?.trim() || null,
    direccion: input.direccion?.trim() || '',
    presupuesto_estimado: input.presupuesto_estimado || 0,
    fecha_inicio: input.fecha_inicio || ahora.slice(0, 10),
    fecha_fin_estimada: input.fecha_fin_estimada || null,
    estado: 'activa',
    modelo_visual_tipo: input.modelo_visual_tipo || '3d_glb',
    modelo_visual_url: input.modelo_visual_url || null,
    modulos_activos: input.modulos_activos || modulosDefault,
    token_cliente: tokenCliente,
    notas: input.notas?.trim() || '',
    deleted_at: null,
    client_updated_at: ahora,
    created_at: ahora,
  }

  const etapas: Etapa[] = input.etapas
    .filter((etapa) => etapa.nombre.trim())
    .map((etapa, index) => ({
      id: crypto.randomUUID(),
      obra_id: obra.id,
      nombre: etapa.nombre.trim(),
      orden: index + 1,
      peso: etapa.peso || redondear(100 / input.etapas.length),
      tipo_medicion: 'cantidad',
      cantidad_total: etapa.cantidad_total || 100,
      cantidad_acumulada: 0,
      unidad_medida: etapa.unidad_medida || 'm2',
      checklists_items: [],
      materiales_suministros: etapa.materiales?.map((m) => ({
        id: crypto.randomUUID(),
        nombre: m.nombre,
        cantidad_estimada: m.cantidad_estimada,
        unidad: m.unidad,
        estado: 'pendiente' as const,
      })) || [],
      porcentaje: 0,
      estado: 'pendiente',
      deleted_at: null,
      client_updated_at: ahora,
    }))

  await db.transaction('rw', db.obras, db.etapas, db.outbox, async () => {
    await db.obras.add(obra)
    await db.etapas.bulkAdd(etapas)
    await db.outbox.bulkAdd([
      {
        table: 'obras',
        op: 'upsert',
        row: { ...obra },
        attempts: 0,
        lastError: null,
        createdAt: ahora,
      },
      ...etapas.map((etapa) => ({
        table: 'obra_etapas' as const,
        op: 'upsert' as const,
        row: { ...etapa },
        attempts: 0,
        lastError: null,
        createdAt: ahora,
      })),
    ])
  })

  return obra
}

/** Avance ponderado de las etapas (0–100) */
export function calcularAvance(etapas: Etapa[]): number {
  const activas = etapas.filter((etapa) => !etapa.deleted_at)
  const pesoTotal = activas.reduce((sum, etapa) => sum + (Number(etapa.peso) || 0), 0)
  if (!pesoTotal) return 0
  const avance = activas.reduce(
    (sum, etapa) => sum + (Number(etapa.peso) || 0) * (etapa.porcentaje / 100),
    0,
  )
  return redondear((avance / pesoTotal) * 100)
}

export function formatearFecha(iso: string): string {
  try {
    const fecha = new Date(iso)
    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(fecha)
  } catch {
    return iso
  }
}

// -----------------------------------------------------------------------------
// COMPATIBILIDAD CON DIÁLOGO PREVIO DE AVANCE
// -----------------------------------------------------------------------------
const DEVICE_KEY = 'avanx-device-id'

export function obtenerDeviceId(): string {
  if (typeof window === 'undefined') return 'servidor'
  let deviceId = localStorage.getItem(DEVICE_KEY)
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, deviceId)
  }
  return deviceId
}

export function validarPorcentaje(porcentaje: number): string | null {
  if (!Number.isFinite(porcentaje)) return 'Escribe un porcentaje válido.'
  if (porcentaje < 0 || porcentaje > 100) return 'El porcentaje debe estar entre 0 y 100.'
  return null
}

export interface NuevoAvanceInput {
  obraId: string
  etapaId: string
  porcentaje: number
  nota: string
}

export function validarAvance(input: NuevoAvanceInput): string | null {
  if (!input.obraId) return 'Falta la obra.'
  if (!input.etapaId) return 'Selecciona una etapa.'
  return validarPorcentaje(input.porcentaje)
}

export async function registrarAvance(input: NuevoAvanceInput): Promise<EtapaAvance> {
  const ahora = new Date().toISOString()
  const porcentaje = redondear(input.porcentaje)

  const avance: EtapaAvance = {
    id: crypto.randomUUID(),
    obra_id: input.obraId,
    etapa_id: input.etapaId,
    porcentaje,
    nota: input.nota.trim(),
    captured_at: ahora,
    device_id: obtenerDeviceId(),
    idempotency_key: crypto.randomUUID(),
  }

  await db.transaction('rw', db.etapa_avances, db.etapas, db.outbox, async () => {
    const etapa = await db.etapas.get(input.etapaId)
    if (!etapa) throw new Error('La etapa no existe en este dispositivo.')

    await db.etapa_avances.add(avance)
    await db.etapas.update(input.etapaId, {
      porcentaje,
      estado: porcentaje >= 100 ? 'completada' : 'en_progreso',
      client_updated_at: ahora,
    })

    await db.outbox.add({
      table: 'etapa_avances',
      op: 'insert',
      row: { ...avance },
      attempts: 0,
      lastError: null,
      createdAt: ahora,
    })
  })

  return avance
}
