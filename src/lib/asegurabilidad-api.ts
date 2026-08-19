import { apiFetch } from './api';

export interface AsegurabilidadResponse {
  asegurado: boolean;
  mensaje: string;
  cedulaConsultada: string;
  beneficiario?: {
    id: number;
    nombres: string;
    apellidos: string;
    nombreCompleto: string;
    cedula: string;
    tipoCedula: string;
    parentescoCod?: string | null;
    parentescoNombre?: string | null;
  };
  poliza?: {
    id: number;
    numeroPoliza: string;
    estado: string;
    fechaInicioVigencia?: string;
    fechaFinVigencia?: string | null;
    sumaAsegurada?: number | null;
  };
  deducible?: string | null;
}

export async function consultarAsegurabilidad(
  cedula: string,
): Promise<AsegurabilidadResponse> {
  const params = new URLSearchParams({ cedula: cedula.trim() });
  return apiFetch<AsegurabilidadResponse>(`/polizas/asegurabilidad?${params}`);
}
