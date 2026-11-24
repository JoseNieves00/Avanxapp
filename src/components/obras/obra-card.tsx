import { Link } from '@tanstack/react-router'
import { Building2, ChevronRight, MapPin, Mic, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { Obra } from '@/lib/db'

export function ObraCard({
  obra,
  avance,
  pendientes,
  onReporteRapido,
}: {
  obra: Obra
  avance: number
  pendientes: number
  onReporteRapido?: (obraId: string) => void
}) {
  return (
    <div className="block rounded-md border border-gray-100 bg-white p-4 shadow-soft transition-colors hover:border-gray-300">
      <Link
        to="/obras/$id"
        params={{ id: obra.id }}
        className="block"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-full bg-navy/5 text-navy">
              <Building2 className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-navy">
                {obra.nombre}
              </p>
              <p className="truncate text-xs text-gray-500">
                {obra.cliente_nombre || 'Sin cliente'}
              </p>
            </div>
          </div>
          <ChevronRight
            className="mt-2 size-5 shrink-0 text-gray-300"
            aria-hidden="true"
          />
        </div>

        <Progress value={avance} label="Avance" className="mt-4" />
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 text-xs text-gray-500">
        <div className="flex flex-wrap items-center gap-2">
          {obra.direccion ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden="true" />
              {obra.direccion}
            </span>
          ) : null}
          {obra.cliente_telefono ? (
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3.5" aria-hidden="true" />
              {obra.cliente_telefono}
            </span>
          ) : null}
          {pendientes > 0 ? (
            <Badge variant="orange">{pendientes} sin sincronizar</Badge>
          ) : (
            <Badge variant="green">Sincronizada</Badge>
          )}
        </div>

        {onReporteRapido && (
          <Button
            type="button"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              onReporteRapido(obra.id)
            }}
            className="h-7 gap-1 px-2 text-[11px] font-bold text-orange border-orange/40 bg-orange/5 hover:bg-orange/10"
          >
            <Mic className="size-3" /> Reportar
          </Button>
        )}
      </div>
    </div>
  )
}
