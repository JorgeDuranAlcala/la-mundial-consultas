import type { CasoCompletoApi } from './caso-detail-api';
import { apiFetch } from './api';

const TIPOS_ACTIVABLES = new Set(['CARTA_AVAL', 'EMERGENCIA', 'FARMACIA', 'APS']);

const ESTADOS_TERMINALES = new Set([
  'CERRADO',
  'ANULADO',
  'SERVICIO_FINALIZADO',
  'RECHAZADO',
  'COMPLETADO',
  'CANCELADO',
]);

const ESTADOS_CASO_ACTIVABLES = new Set([
  'PENDIENTE',
  'SOLICITADO',
  'INICIADO',
  'APROBADO',
  'ANALISIS',
  'ANALISIS_MEDICO',
  'EN_VALIDACION',
  'RECAUDO_PENDIENTE',
  'RECHAZADO_PENDIENTE',
]);

const ESTADOS_ORDEN_ACTIVABLES = new Set(['EMITIDA', 'PENDIENTE', 'IMPRESA']);

export function puedeActivarPorProveedor(data: CasoCompletoApi): boolean {
  const { caso } = data;
  if (!TIPOS_ACTIVABLES.has(caso.tipoServicioCod)) return false;
  if (caso.fechaActivacion) return false;
  if (ESTADOS_TERMINALES.has(caso.estadoActualCod)) return false;

  switch (caso.tipoServicioCod) {
    case 'CARTA_AVAL':
    case 'EMERGENCIA':
      return Boolean(data.cartaAval?.codigoCarta);
    case 'FARMACIA': {
      const orden = data.ordenesFarmacia?.[0];
      if (orden) return ESTADOS_ORDEN_ACTIVABLES.has(orden.estado);
      return ESTADOS_CASO_ACTIVABLES.has(caso.estadoActualCod);
    }
    case 'APS': {
      const orden = data.ordenesAps?.[0];
      if (orden) return ESTADOS_ORDEN_ACTIVABLES.has(orden.estado);
      return ESTADOS_CASO_ACTIVABLES.has(caso.estadoActualCod);
    }
    default:
      return false;
  }
}

export function puedeCompletarPorProveedor(data: CasoCompletoApi): boolean {
  const { caso } = data;
  if (!TIPOS_ACTIVABLES.has(caso.tipoServicioCod)) return false;
  if (ESTADOS_TERMINALES.has(caso.estadoActualCod)) return false;

  const ordenFarmacia = data.ordenesFarmacia?.[0];
  const ordenAps = data.ordenesAps?.[0];

  return (
    Boolean(caso.fechaActivacion) ||
    ordenFarmacia?.estado === 'ACTIVADA' ||
    ordenAps?.estado === 'ACTIVADA'
  );
}

export async function activarCasoPorProveedor(casoId: number): Promise<CasoCompletoApi> {
  return apiFetch<CasoCompletoApi>(`/casos/${casoId}/activar-proveedor`, {
    method: 'POST',
  });
}

export async function completarServicioPorProveedor(
  casoId: number,
  input: { completado: boolean; observacion?: string; usuarioId?: number },
): Promise<CasoCompletoApi> {
  return apiFetch<CasoCompletoApi>(`/casos/${casoId}/completar-proveedor`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
