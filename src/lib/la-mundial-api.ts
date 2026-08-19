import { apiFetch } from './api';

export interface LaMundialPoliza {
  numeroPoliza: string;
  producto: string;
  vigenciaDesde: string;
  vigenciaHasta: string;
  estatus: string;
  sumaAsegurada: number;
  moneda: string;
}

export interface LaMundialDependiente {
  nacionalidad: string;
  cedula: string;
  nombreCompleto: string;
  parentesco: string;
  activo: boolean;
}

export interface LaMundialConsultaResponse {
  fuente: string;
  consultadoEn: string;
  persona: {
    serialpersona: string;
    nacionalidad: string;
    cedula: string;
    correlativo: string;
    nombreCompleto: string;
    email: string | null;
    telefono: string | null;
    tipo: string;
    titular: string | null;
  };
  polizas: LaMundialPoliza[];
  dependientes: LaMundialDependiente[];
}

export async function consultarAseguradoLaMundial(input: {
  nacionalidad: string;
  cedrif: number;
}): Promise<LaMundialConsultaResponse> {
  const params = new URLSearchParams({
    nacionalidad: input.nacionalidad,
    cedrif: String(input.cedrif),
  });
  return apiFetch<LaMundialConsultaResponse>(`/la-mundial/consulta?${params}`);
}
