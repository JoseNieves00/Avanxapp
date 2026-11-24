-- ==============================================================================
-- AVANXAPP — MIGRACIÓN INICIAL MULTI-TENANT, ROLES, 3D, GROQ IA Y ADICIONALES
-- Archivo: supabase/migrations/20261123000001_initial_schema.sql
-- ==============================================================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PLANES DE SUSCRIPCIÓN (Para el ERP Super Admin)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.planes_suscripcion (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    precio_cop_mes NUMERIC(14, 2) NOT NULL DEFAULT 0,
    limite_obras INTEGER NOT NULL DEFAULT 3,
    limite_usuarios INTEGER NOT NULL DEFAULT 2,
    limite_storage_gb NUMERIC(8, 2) NOT NULL DEFAULT 5.0,
    soporte_3d BOOLEAN NOT NULL DEFAULT true,
    soporte_ia BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Datos iniciales de planes
INSERT INTO public.planes_suscripcion (id, nombre, precio_cop_mes, limite_obras, limite_usuarios, limite_storage_gb, soporte_3d, soporte_ia)
VALUES 
    ('plan_starter', 'Starter (Contratistas)', 99000, 3, 2, 5, true, true),
    ('plan_pro', 'Profesional (Empresas Remodelación)', 199000, 10, 5, 25, true, true),
    ('plan_enterprise', 'Constructora / Ilimitado', 399000, 50, 20, 100, true, true)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. ORGANIZACIONES / EMPRESAS (Multi-Tenancy)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    nit_rut TEXT,
    logo_url TEXT,
    color_primario TEXT DEFAULT '#0B2D5B',
    color_secundario TEXT DEFAULT '#FF6600',
    plan_id TEXT REFERENCES public.planes_suscripcion(id) DEFAULT 'plan_starter',
    estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'suspendida', 'en_prueba')),
    limite_obras_activas INTEGER NOT NULL DEFAULT 3,
    limite_usuarios INTEGER NOT NULL DEFAULT 2,
    storage_usado_mb NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 3. PERFILES DE USUARIO & SUPER ADMIN
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usuarios_perfil (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    nombre_completo TEXT NOT NULL,
    telefono TEXT,
    is_super_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Miembros de cada organización con roles granulares
CREATE TABLE IF NOT EXISTS public.organizacion_miembros (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.usuarios_perfil(id) ON DELETE CASCADE,
    rol TEXT NOT NULL CHECK (rol IN ('org_admin', 'ingeniero', 'cliente', 'auditor')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(organizacion_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 4. OBRAS / PROYECTOS (Con soporte visual 3D, Renders 360° y módulos conmutables)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.obras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizacion_id UUID NOT NULL REFERENCES public.organizaciones(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    tipo_proyecto TEXT NOT NULL DEFAULT 'remodelacion' CHECK (tipo_proyecto IN ('obra_nueva', 'remodelacion', 'adecuacion', 'personalizado')),
    cliente_nombre TEXT NOT NULL,
    cliente_telefono TEXT,
    cliente_email TEXT,
    direccion TEXT,
    presupuesto_estimado NUMERIC(14, 2) DEFAULT 0,
    fecha_inicio DATE,
    fecha_fin_estimada DATE,
    estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'pausada', 'entregada', 'archivada')),
    
    -- Visualización Híbrida Universal (3D, 360 o Renders)
    modelo_visual_tipo TEXT NOT NULL DEFAULT 'ninguno' CHECK (modelo_visual_tipo IN ('3d_glb', 'render_360', 'renders_planos', 'ninguno')),
    modelo_visual_url TEXT,
    config_visual JSONB DEFAULT '{}'::jsonb, -- luces, cámara inicial, hotspots
    
    -- Módulos conmutables por obra
    modulos_activos JSONB NOT NULL DEFAULT '{"fotos": true, "materiales": false, "portal_cliente": true, "adicionales": true, "visor_3d": true}'::jsonb,
    
    -- Enlace del cliente (sin contraseña)
    token_cliente TEXT UNIQUE NOT NULL,
    notas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ
);

-- ------------------------------------------------------------------------------
-- 5. ETAPAS / FASES (Medición cuantitativa m², ml, unidades o checklist de hitos)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.obra_etapas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    orden INTEGER NOT NULL DEFAULT 1,
    peso NUMERIC(5, 2) NOT NULL DEFAULT 0, -- Peso porcentual en el proyecto
    
    -- Medición cuantitativa objetiva (Cero subjetividad)
    tipo_medicion TEXT NOT NULL DEFAULT 'cantidad' CHECK (tipo_medicion IN ('cantidad', 'checklist')),
    cantidad_total NUMERIC(12, 3) DEFAULT 0,
    cantidad_acumulada NUMERIC(12, 3) DEFAULT 0,
    unidad_medida TEXT DEFAULT 'm2', -- 'm2', 'm3', 'ml', 'und', 'global'
    checklists_items JSONB DEFAULT '[]'::jsonb, -- [{ "id": "1", "titulo": "Regata", "peso": 20, "completado": true }]
    
    porcentaje NUMERIC(5, 2) NOT NULL DEFAULT 0, -- Calculado automáticamente
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_progreso', 'completada')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 6. DIARIO DE OBRA / BITÁCORA Y REPORTE RÁPIDO CON GROQ IA
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.diario_obra_entradas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
    etapa_id UUID REFERENCES public.obra_etapas(id) ON DELETE SET NULL,
    ingeniero_id UUID REFERENCES public.usuarios_perfil(id) ON DELETE SET NULL,
    
    tipo TEXT NOT NULL DEFAULT 'avance' CHECK (tipo IN ('avance', 'incidencia', 'inspeccion', 'nota_general')),
    cantidad_reportada NUMERIC(12, 3) DEFAULT 0,
    porcentaje_calculado NUMERIC(5, 2) DEFAULT 0,
    
    -- Notas y procesamiento IA
    nota_tecnica TEXT NOT NULL,
    resumen_cliente_ia TEXT, -- Traducción amigable sin tecnicismos generada por Groq
    audio_url TEXT,
    groq_raw_data JSONB,
    
    -- Contexto de obra
    clima TEXT CHECK (clima IN ('soleado', 'lluvia', 'nublado', 'viento')),
    personal_activo INTEGER DEFAULT 0,
    latitud NUMERIC(10, 8),
    longitud NUMERIC(11, 8),
    
    captured_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Fotos asociadas a los reportes de campo
CREATE TABLE IF NOT EXISTS public.diario_fotos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entrada_id UUID NOT NULL REFERENCES public.diario_obra_entradas(id) ON DELETE CASCADE,
    obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    thumb_path TEXT,
    anotaciones JSONB DEFAULT '[]'::jsonb,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 7. TRABAJOS ADICIONALES (Change Orders con aprobación del cliente)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.obra_adicionales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    costo_adicional NUMERIC(14, 2) NOT NULL DEFAULT 0,
    tiempo_adicional_dias INTEGER NOT NULL DEFAULT 0,
    foto_url TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
    aprobado_at TIMESTAMPTZ,
    aprobado_por_nombre TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 8. POLÍTICAS DE SEGURIDAD (Row Level Security - RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.organizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_perfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizacion_miembros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obra_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diario_obra_entradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diario_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obra_adicionales ENABLE ROW LEVEL SECURITY;

-- Función de ayuda: ¿Es Super Admin de Avanxapp?
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.usuarios_perfil
        WHERE id = auth.uid() AND is_super_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función de ayuda: ¿Es miembro de la organización?
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organizacion_miembros
        WHERE organizacion_id = org_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas para Organizaciones
CREATE POLICY "Super admin acceso total a organizaciones"
    ON public.organizaciones FOR ALL
    USING (public.is_super_admin());

CREATE POLICY "Miembros pueden ver su organizacion"
    ON public.organizaciones FOR SELECT
    USING (public.is_org_member(id));

-- Políticas para Obras
CREATE POLICY "Super admin acceso total a obras"
    ON public.obras FOR ALL
    USING (public.is_super_admin());

CREATE POLICY "Miembros de la organizacion pueden ver y gestionar sus obras"
    ON public.obras FOR ALL
    USING (public.is_org_member(organizacion_id));

CREATE POLICY "Acceso publico de lectura por token para cliente"
    ON public.obras FOR SELECT
    USING (true); -- La validación por token se efectúa en las consultas del portal del cliente

-- Políticas para Etapas, Entradas, Fotos y Adicionales
CREATE POLICY "Acceso a etapas por pertenencia de obra"
    ON public.obra_etapas FOR ALL
    USING (
        public.is_super_admin() OR 
        EXISTS (SELECT 1 FROM public.obras WHERE obras.id = obra_etapas.obra_id AND public.is_org_member(obras.organizacion_id))
    );

CREATE POLICY "Acceso a entradas de diario por pertenencia de obra"
    ON public.diario_obra_entradas FOR ALL
    USING (
        public.is_super_admin() OR 
        EXISTS (SELECT 1 FROM public.obras WHERE obras.id = diario_obra_entradas.obra_id AND public.is_org_member(obras.organizacion_id))
    );

CREATE POLICY "Acceso a fotos por pertenencia de obra"
    ON public.diario_fotos FOR ALL
    USING (
        public.is_super_admin() OR 
        EXISTS (SELECT 1 FROM public.obras WHERE obras.id = diario_fotos.obra_id AND public.is_org_member(obras.organizacion_id))
    );

CREATE POLICY "Acceso a adicionales por pertenencia de obra"
    ON public.obra_adicionales FOR ALL
    USING (
        public.is_super_admin() OR 
        EXISTS (SELECT 1 FROM public.obras WHERE obras.id = obra_adicionales.obra_id AND public.is_org_member(obras.organizacion_id))
    );

-- Permitir a clientes consultar etapas, fotos y adicionales de su obra mediante su token
CREATE POLICY "Lectura publica de etapas de obra activa"
    ON public.obra_etapas FOR SELECT USING (true);

CREATE POLICY "Lectura publica de entradas de diario"
    ON public.diario_obra_entradas FOR SELECT USING (true);

CREATE POLICY "Lectura publica de fotos"
    ON public.diario_fotos FOR SELECT USING (true);

CREATE POLICY "Lectura publica de adicionales"
    ON public.obra_adicionales FOR SELECT USING (true);
