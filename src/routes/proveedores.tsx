import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Truck,
  User,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Field, Input } from '@/components/ui/input'
import { db, type Proveedor } from '@/lib/db'

export const Route = createFileRoute('/proveedores')({
  component: ProveedoresPage,
})

function ProveedoresPage() {
  const [busqueda, setBusqueda] = useState('')
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [proveedorEditando, setProveedorEditando] = useState<Proveedor | null>(null)

  // Campos formulario
  const [nombre, setNombre] = useState('')
  const [especialidad, setEspecialidad] = useState('')
  const [contacto, setContacto] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const [notas, setNotas] = useState('')

  const proveedores = useLiveQuery(
    async () =>
      (await db.proveedores.toArray())
        .filter((p) => !p.deleted_at)
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [],
  )

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return proveedores ?? []
    return (proveedores ?? []).filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.especialidad && p.especialidad.toLowerCase().includes(q)) ||
        (p.contacto && p.contacto.toLowerCase().includes(q)),
    )
  }, [proveedores, busqueda])

  function abrirNuevo() {
    setProveedorEditando(null)
    setNombre('')
    setEspecialidad('')
    setContacto('')
    setTelefono('')
    setDireccion('')
    setNotas('')
    setDialogoAbierto(true)
  }

  function abrirEdicion(p: Proveedor) {
    setProveedorEditando(p)
    setNombre(p.nombre)
    setEspecialidad(p.especialidad || '')
    setContacto(p.contacto || '')
    setTelefono(p.telefono || '')
    setDireccion(p.direccion || '')
    setNotas(p.notas || '')
    setDialogoAbierto(true)
  }

  async function handleGuardar() {
    if (!nombre.trim()) return
    const ahora = new Date().toISOString()

    if (proveedorEditando) {
      await db.proveedores.update(proveedorEditando.id, {
        nombre: nombre.trim(),
        especialidad: especialidad.trim() || undefined,
        contacto: contacto.trim() || undefined,
        telefono: telefono.trim() || undefined,
        direccion: direccion.trim() || undefined,
        notas: notas.trim() || undefined,
        client_updated_at: ahora,
      })
    } else {
      await db.proveedores.add({
        id: crypto.randomUUID(),
        nombre: nombre.trim(),
        especialidad: especialidad.trim() || undefined,
        contacto: contacto.trim() || undefined,
        telefono: telefono.trim() || undefined,
        direccion: direccion.trim() || undefined,
        notas: notas.trim() || undefined,
        deleted_at: null,
        client_updated_at: ahora,
      })
    }

    setDialogoAbierto(false)
  }

  async function handleEliminar(id: string) {
    if (confirm('¿Deseas eliminar este proveedor del directorio?')) {
      await db.proveedores.update(id, {
        deleted_at: new Date().toISOString(),
      })
    }
  }

  return (
    <div className="grid gap-4">
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-3">
        <div>
          <p className="text-[11px] font-extrabold tracking-[2px] text-orange uppercase">
            Directorio Logístico
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy">
            Mis Proveedores
          </h1>
          <p className="text-xs text-gray-500">
            Registra los talleres, marmolerías, carpinterías o ferreterías con los que trabaja tu empresa.
          </p>
        </div>

        <Button
          onClick={abrirNuevo}
          className="h-9 gap-1.5 bg-orange px-3 text-xs text-white hover:brightness-95"
        >
          <Plus className="size-4" /> Agregar Proveedor
        </Button>
      </div>

      {/* Buscador */}
      {proveedores && proveedores.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-9 h-9 text-xs"
            placeholder="Buscar por nombre, especialidad (cuarzo, melamina, eléctrico)..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      )}

      {/* Lista */}
      {!proveedores || proveedores.length === 0 ? (
        <EmptyState
          icon={<Truck className="size-7" aria-hidden="true" />}
          title="Aún no tienes proveedores registrados"
          description="Agrega a tus aliados comerciales para poder vincularlos a los materiales y fechas de entrega de tus proyectos."
          action={
            <Button onClick={abrirNuevo}>
              <Plus className="size-4" /> Registrar Primer Proveedor
            </Button>
          }
        />
      ) : filtrados.length === 0 ? (
        <p className="rounded-sm border border-dashed border-gray-300 bg-white p-6 text-center text-xs text-gray-500">
          No hay proveedores que coincidan con «{busqueda}».
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtrados.map((p) => (
            <Card key={p.id} className="relative flex flex-col justify-between p-4 transition-all hover:border-gray-300">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="blue" className="bg-navy/10 text-navy font-bold text-[10px]">
                    {p.especialidad || 'Suministros Generales'}
                  </Badge>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => abrirEdicion(p)}
                      className="p-1 text-gray-400 hover:text-navy"
                      title="Editar"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEliminar(p.id)}
                      className="p-1 text-gray-400 hover:text-red-500"
                      title="Eliminar"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                <CardTitle className="mt-2 text-base font-bold text-navy">{p.nombre}</CardTitle>

                <div className="mt-3 space-y-1 text-xs text-gray-600">
                  {p.contacto && (
                    <div className="flex items-center gap-1.5">
                      <User className="size-3.5 text-orange shrink-0" />
                      <span>{p.contacto}</span>
                    </div>
                  )}
                  {p.telefono && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="size-3.5 text-orange shrink-0" />
                      <a href={`tel:${p.telefono}`} className="font-semibold hover:underline">
                        {p.telefono}
                      </a>
                    </div>
                  )}
                  {p.direccion && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-orange shrink-0" />
                      <span>{p.direccion}</span>
                    </div>
                  )}
                </div>
              </div>

              {p.notas && (
                <div className="mt-3 border-t border-gray-100 pt-2 text-[11px] text-gray-500 italic">
                  "{p.notas}"
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Diálogo Crear / Editar Proveedor */}
      <Dialog
        open={dialogoAbierto}
        onClose={() => setDialogoAbierto(false)}
        title={proveedorEditando ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        description="Registra los datos de contacto y especialidad para vincularlo a las compras."
      >
        <div className="grid gap-3">
          <Field label="Nombre Comercial / Razón Social" htmlFor="p-nom">
            <Input
              id="p-nom"
              placeholder="Ej. Marmolería Imperial SAS"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </Field>

          <Field label="Especialidad / Tipo de Suministro" htmlFor="p-esp">
            <Input
              id="p-esp"
              placeholder="Ej. Cuarzo, Melaminas, Vidrios, Acero, Iluminación..."
              value={especialidad}
              onChange={(e) => setEspecialidad(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Persona de Contacto" htmlFor="p-cont">
              <Input
                id="p-cont"
                placeholder="Nombre del asesor"
                value={contacto}
                onChange={(e) => setContacto(e.target.value)}
              />
            </Field>
            <Field label="Teléfono / WhatsApp" htmlFor="p-tel">
              <Input
                id="p-tel"
                placeholder="300 123 4567"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Dirección / Taller" htmlFor="p-dir">
            <Input
              id="p-dir"
              placeholder="Dirección del local o planta"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
            />
          </Field>

          <Field label="Notas Comerciales / Tiempos de Entrega" htmlFor="p-notas">
            <Input
              id="p-notas"
              placeholder="Ej. Despacha en 5 días hábiles, crédito a 15 días"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </Field>

          <div className="mt-2 flex gap-2">
            <Button variant="outline" className="w-1/3" onClick={() => setDialogoAbierto(false)}>
              Cancelar
            </Button>
            <Button
              className="w-2/3 bg-navy text-white hover:bg-navy-hover"
              disabled={!nombre.trim()}
              onClick={handleGuardar}
            >
              Guardar Proveedor
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
