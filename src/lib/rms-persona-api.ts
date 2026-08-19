import { apiFetch } from './api';

export interface PersonaRmsResponse {
  serialpersona: string;
  nacionalidad: string;
  cedrif: string;
  correlativo: string;
  nombre: string | null;
  apellido: string | null;
  nombreCompleto: string;
  razonsocial: string | null;
  numrif: string | null;
  numnit: string | null;
  sexo: string;
  fecnac: string;
  edocivil: string;
  direccion: string;
  cdPais: string;
  cdEstado: string;
  cdCiudad: string;
  cdMunicipio: string;
  telefono: string | null;
  celular: string | null;
  email: string | null;
  cdEstatus: string;
  fecreg: string;
}

export async function buscarPersonaRmsPorCedula(params: {
  nacionalidad: string;
  cedrif: number;
  correlativo: number;
}): Promise<PersonaRmsResponse> {
  const search = new URLSearchParams({
    nacionalidad: params.nacionalidad,
    cedrif: String(params.cedrif),
    correlativo: String(params.correlativo),
  });
  return apiFetch<PersonaRmsResponse>(`/rms/personas/cedula?${search}`);
}
