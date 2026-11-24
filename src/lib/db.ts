import Dexie, { type EntityTable } from 'dexie'

export type SyncTable =
  | 'planes_suscripcion'
  | 'organizaciones'
  | 'obras'
  | 'obra_etapas'
  | 'etapa_avances'
  | 'diario_obra_entradas'
  | 'diario_fotos'
  | 'obra_adicionales'
  | 'materiales'
  | 'consumos'

export type OutboxOperation = 'insert' | 'upsert' | 'delete'

export interface OutboxItem {
  id?: number
  table: SyncTable
  op: OutboxOperation
  row: Record<string, unknown>
  attempts: number
  lastError: string | null
  createdAt: string
}

export interface MediaQueueItem {
  id?: number
  entity: string
  entityId: string
  blob: Blob
  status: 'pending' | 'uploading' | 'done' | 'error'
  attempts: number
  createdAt: string
}

// -----------------------------------------------------------------------------
// PLANES Y ORGANIZACIONES (SUPER ADMIN ERP)
// -----------------------------------------------------------------------------
export interface PlanSuscripcion {
  id: string
  nombre: string
  precio_cop_mes: number
  limite_obras: number
  limite_usuarios: number
  limite_storage_gb: number
  soporte_3d: boolean
  soporte_ia: boolean
  created_at: string
}

export interface Organizacion {
  id: string
  nombre: string
  slug: string
  nit_rut?: string
  logo_url?: string | null
  color_primario?: string
  color_secundario?: string
  plan_id: string
  estado: 'activa' | 'suspendida' | 'en_prueba'
  limite_obras_activas?: number
  limite_usuarios?: number
  storage_usado_mb?: number
  created_at: string
}

// -----------------------------------------------------------------------------
// OBRAS Y SEGUIMIENTO TÉCNICO (AVANXAPP PARA EMPRESAS, INGENIEROS Y CLIENTES)
// -----------------------------------------------------------------------------
export type TipoProyecto = 'obra_nueva' | 'remodelacion' | 'adecuacion' | 'personalizado'
export type ModeloVisualTipo = '3d_glb' | 'render_360' | 'renders_planos' | 'ninguno'

export interface ModulosActivos {
  fotos: boolean
  materiales: boolean
  portal_cliente: boolean
  adicionales: boolean
  visor_3d: boolean
}

export interface Obra {
  id: string
  organizacion_id?: string
  nombre: string
  tipo_proyecto: TipoProyecto
  cliente_nombre: string
  cliente_telefono: string | null
  cliente_email?: string | null
  direccion: string
  presupuesto_estimado?: number
  fecha_inicio?: string | null
  fecha_fin_estimada?: string | null
  estado: 'activa' | 'pausada' | 'entregada' | 'archivada'
  
  modelo_visual_tipo: ModeloVisualTipo
  modelo_visual_url?: string | null
  config_visual?: Record<string, unknown>
  modulos_activos: ModulosActivos
  
  token_cliente: string
  notas: string
  
  // Trazabilidad de entrega y conformidad del cliente
  entregado_a_conformidad?: boolean
  entregado_cliente_nombre?: string | null
  entregado_at?: string | null
  entregado_notas?: string | null

  deleted_at: string | null
  client_updated_at: string
  created_at: string
}

export interface ChecklistItem {
  id: string
  titulo: string
  peso: number
  completado: boolean
}

export interface Proveedor {
  id: string
  nombre: string
  contacto?: string
  telefono?: string
  especialidad?: string // ej. Mesones de cuarzo, Melaminas, Vidrios, Eléctricos, Pinturas, Cemento
  direccion?: string
  notas?: string
  deleted_at: string | null
  client_updated_at: string
}

export interface MaterialSuministro {
  id: string
  nombre: string
  cantidad_estimada: number
  unidad: string
  estado: 'pendiente' | 'pedido' | 'en_taller' | 'en_sitio' | 'instalado'
  proveedor?: string
  proveedor_id?: string
  fecha_entrega_estimada?: string | null
  costo_estimado?: number
  notas?: string
}

export interface Etapa {
  id: string
  obra_id: string
  nombre: string
  descripcion?: string
  orden: number
  peso: number
  
  tipo_medicion: 'cantidad' | 'checklist'
  cantidad_total: number
  cantidad_acumulada: number
  unidad_medida: string
  checklists_items: ChecklistItem[]
  materiales_suministros?: MaterialSuministro[]
  
  porcentaje: number
  estado: 'pendiente' | 'en_progreso' | 'completada'
  deleted_at: string | null
  client_updated_at: string
}

export interface EtapaAvance {
  id: string
  obra_id: string
  etapa_id: string
  porcentaje: number
  nota: string
  captured_at: string
  device_id: string
  idempotency_key: string
}

export interface DiarioEntrada {
  id: string
  obra_id: string
  etapa_id?: string | null
  ingeniero_id?: string | null
  
  tipo: 'avance' | 'incidencia' | 'inspeccion' | 'nota_general'
  cantidad_reportada: number
  porcentaje_calculado: number
  
  nota_tecnica: string
  resumen_cliente_ia?: string | null
  audio_url?: string | null
  audio_blob?: Blob | null
  
  clima?: 'soleado' | 'lluvia' | 'nublado' | 'viento' | null
  personal_activo?: number
  latitud?: number | null
  longitud?: number | null
  
  captured_at: string
  created_at: string
}

export interface DiarioFoto {
  id: string
  entrada_id: string
  obra_id: string
  storage_path?: string
  local_blob?: Blob
  thumb_path?: string
  anotaciones?: unknown[]
  captured_at: string
}

export interface ObraAdicional {
  id: string
  obra_id: string
  titulo: string
  descripcion: string
  costo_adicional: number
  tiempo_adicional_dias: number
  foto_url?: string | null
  local_foto_blob?: Blob | null
  estado: 'pendiente' | 'aprobado' | 'rechazado'
  aprobado_at?: string | null
  aprobado_por_nombre?: string | null
  created_at: string
}

export interface Material {
  id: string
  nombre: string
  unidad: string
  stock_minimo: number
  categoria: string
  deleted_at: string | null
  client_updated_at: string
  created_at: string
}

export interface Consumo {
  id: string
  obra_id: string
  material_id: string
  etapa_id: string | null
  cantidad: number
  nota: string
  fecha: string
  created_at: string
}

/**
 * Base local (IndexedDB) con Dexie.
 */
class AvanxDatabase extends Dexie {
  declare planes: EntityTable<PlanSuscripcion, 'id'>
  declare organizaciones: EntityTable<Organizacion, 'id'>
  declare obras: EntityTable<Obra, 'id'>
  declare etapas: EntityTable<Etapa, 'id'>
  declare etapa_avances: EntityTable<EtapaAvance, 'id'>
  declare diario_entradas: EntityTable<DiarioEntrada, 'id'>
  declare diario_fotos: EntityTable<DiarioFoto, 'id'>
  declare adicionales: EntityTable<ObraAdicional, 'id'>
  declare proveedores: EntityTable<Proveedor, 'id'>
  declare materiales: EntityTable<Material, 'id'>
  declare consumos: EntityTable<Consumo, 'id'>
  declare outbox: EntityTable<OutboxItem, 'id'>
  declare mediaQueue: EntityTable<MediaQueueItem, 'id'>

  constructor() {
    super('avanxapp')

    this.version(8).stores({
      planes: 'id, nombre, precio_cop_mes',
      organizaciones: 'id, slug, estado, plan_id',
      obras: 'id, organizacion_id, estado, token_cliente, client_updated_at',
      etapas: 'id, obra_id, orden, tipo_medicion',
      etapa_avances: 'id, obra_id, etapa_id, captured_at',
      diario_entradas: 'id, obra_id, etapa_id, tipo, captured_at',
      diario_fotos: 'id, entrada_id, obra_id, captured_at',
      adicionales: 'id, obra_id, estado, created_at',
      proveedores: 'id, nombre, especialidad, deleted_at',
      materiales: 'id, nombre, deleted_at, client_updated_at',
      consumos: 'id, obra_id, material_id, fecha',
      outbox: '++id, table, createdAt',
      mediaQueue: '++id, entity, entityId, status, createdAt',
    })
  }
}

export const db = new AvanxDatabase()
