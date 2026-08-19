import type { CasoBaseApi } from './caso-mappers';
import { apiFetch } from './api';

export interface CasoPasoActualApi {
  stepId?: number;
  code?: string;
  name?: string;
  estado?: string;
}

export interface CasoHistorialApi {
  id: number;
  estadoCod: string;
  observacion?: string | null;
  registradoEn: string;
  estado?: { nombre?: string };
  usuario?: { username?: string; nombre?: string };
}

export interface CasoDocumentoApi {
  id: number;
  casoId: number;
  tipoDocumentoCod: string;
  nombreArchivo: string;
  storageUrl: string;
  mimeType?: string | null;
  tamanoBytes?: number | null;
  cargadoEn?: string;
  esVigente?: boolean;
  tipoDocumento?: { nombre?: string };
}

export interface CasoStepProgresoApi {
  id: number;
  estado: string;
  completadoEn?: string | null;
  serviceStep?: { code?: string; name?: string; display_order?: number };
}

export interface CasoStepDatoApi {
  id: number;
  valor?: string | null;
  serviceStep?: { code?: string; name?: string };
  serviceStepField?: { code?: string; name?: string };
}

export interface CasoValidacionDocumentoApi {
  id: number;
  documentoId: number;
  etapa: string;
  resultadoCod: string;
  esLegible?: boolean | null;
  esConforme?: boolean | null;
  observaciones?: string | null;
  validadoEn?: string;
  documento?: { nombreArchivo?: string; tipoDocumentoCod?: string };
  resultado?: { nombre?: string };
}

export interface CasoObservacionApi {
  id: number;
  etapa: string;
  motivo: string;
  requiereCorreccion?: boolean;
  registradoEn: string;
}

export interface CasoCompletoApi {
  caso: CasoBaseApi & {
    pasoActual?: CasoPasoActualApi | null;
    casoOrigen?: { id: number; numeroCaso: string; tipoServicioCod?: string } | null;
    fechaActivacion?: string | null;
    fechaCierre?: string | null;
    compania?: { nombre?: string; codigo?: string };
    extension?: {
      motivoConsulta?: string;
      montoSolicitado?: number;
      montoAprobado?: number;
      cartaAval?: { codigoCarta?: string; montoAprobado?: number };
    };
  };
  historial: CasoHistorialApi[];
  documentos: CasoDocumentoApi[];
  cartaAval?: {
    id?: number;
    codigoCarta?: string;
    montoAprobado?: number;
    fechaEmision?: string;
    fechaVigenciaHasta?: string;
    rmsIdExterno?: string | null;
  } | null;
  reembolso?: {
    id?: number;
    montoSolicitado?: number;
    montoAprobado?: number | null;
    rmsIdExterno?: string | null;
  } | null;
  ordenesFarmacia?: Array<{
    id: number;
    codigoOrden: string;
    estado: string;
    fechaEmision?: string;
    fechaActivacion?: string | null;
    rmsIdExterno?: string | null;
  }>;
  ordenesAps?: Array<{
    id: number;
    codigoOrden: string;
    estado: string;
    montoTotal?: number | null;
    fechaEmision?: string;
    rmsIdExterno?: string | null;
    sysipIdExterno?: string | null;
  }>;
  sincronizacionesRms?: Array<{
    id: number;
    sistemaCod: string;
    operacion: string;
    entidadId: number;
    idExterno?: string | null;
    exitoso: boolean;
    mensajeError?: string | null;
    sincronizadoEn?: string;
    payloadJson?: unknown;
  }>;
  stepProgreso: CasoStepProgresoApi[];
  stepDatos: CasoStepDatoApi[];
  observaciones?: CasoObservacionApi[];
  validaciones?: CasoValidacionDocumentoApi[];
  anexos?: Array<{
    id: number;
    estado: string;
    motivoSolicitud?: string;
    fechaSolicitud?: string;
  }>;
}

export async function getCasoCompleto(casoId: number): Promise<CasoCompletoApi> {
  return apiFetch<CasoCompletoApi>(`/casos/${casoId}/completo`);
}
