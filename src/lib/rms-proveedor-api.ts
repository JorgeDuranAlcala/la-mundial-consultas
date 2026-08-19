import { apiFetch } from './api';
import type { PersonaRmsResponse } from './rms-persona-api';

export type ProveedorRmsResponse = PersonaRmsResponse;

export async function buscarProveedorRmsPorCedula(params: {
  nacionalidad: string;
  cedrif: number;
  correlativo: number;
}): Promise<ProveedorRmsResponse> {
  const search = new URLSearchParams({
    nacionalidad: params.nacionalidad,
    cedrif: String(params.cedrif),
    correlativo: String(params.correlativo),
  });
  return apiFetch<ProveedorRmsResponse>(`/rms/proveedores/cedula?${search}`);
}
