import { apiFetch } from './api';

export interface RmsDependenciaResult {
  enMundial: boolean;
  polizas: Array<{
    n_serialcontrato: number;
    n_serialcertif: number;
    n_correlativo?: number;
    [key: string]: unknown;
  }>;
  raw: unknown;
}

export interface RmsSiniestroApsResult {
  creado: boolean;
  omitido: boolean;
  motivoOmitido?: string;
  mensaje: string;
  n_estatus?: number;
  n_clave?: number;
  n_siniestro?: number;
  n_montodef?: number;
  c_cd_filial?: string;
  c_descripcion?: string;
  /** true = confirmado en e_detsinisalud_seg; false = API OK pero no en BD; null = BD no consultable */
  confirmadoEnBd?: boolean | null;
  respuestaRms?: {
    n_estatus?: number;
    c_descripcion?: string;
    n_clave?: number;
    n_siniestro?: number;
    n_montodef?: number;
    c_cd_filial?: string;
  };
}

/** Consulta si el asegurado está en la BD de La Mundial (gate previo a crear siniestro). */
export async function consultarDependenciaRms(params: {
  nacionalidad: string;
  cedula: string;
}): Promise<RmsDependenciaResult> {
  return apiFetch<RmsDependenciaResult>('/rms/siniestros/dependencia', {
    method: 'POST',
    body: JSON.stringify({
      c_nacaseg: params.nacionalidad.toUpperCase().slice(0, 1),
      n_cedaseg: Number(String(params.cedula).replace(/\D/g, '')),
    }),
  });
}

/** Crea (o simula) siniestro APS en RMS solo si el asegurado está en La Mundial. */
export async function crearSiniestroApsRms(params: {
  casoId: number;
  c_serv?: '0' | '1';
}): Promise<RmsSiniestroApsResult> {
  return apiFetch<RmsSiniestroApsResult>('/rms/siniestros/aps', {
    method: 'POST',
    body: JSON.stringify({
      casoId: params.casoId,
      c_serv: params.c_serv ?? '1',
    }),
  });
}

/** Crea (o simula) siniestro RMS para cualquier tipo de caso (APS, farmacia, carta aval, reembolso). */
export async function crearSiniestroRms(params: {
  casoId: number;
  c_serv?: '0' | '1';
}): Promise<RmsSiniestroApsResult> {
  return apiFetch<RmsSiniestroApsResult>('/rms/siniestros/crear', {
    method: 'POST',
    body: JSON.stringify({
      casoId: params.casoId,
      c_serv: params.c_serv ?? '1',
    }),
  });
}
