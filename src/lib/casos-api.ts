import { apiFetch } from './api';
import type { CasoBaseApi } from './caso-mappers';
import type { ServiceType } from './types';
import { mapServiceTypeToTipo } from './caso-mappers';

export interface CreateCasoPayload {
  tipoServicioCod: string;
  companiaId: number;
  polizaId: number;
  beneficiarioId: number;
  usuarioCreadorId?: number;
  aseguradoId?: number;
  motivoConsulta?: string;
  esPrioritario?: boolean;
  casoOrigenId?: number;
  datosEspecificos?: Record<string, unknown>;
  intakeStepData?: Record<string, string>;
  portalStepData?: Array<{ serviceStepId: number; data: Record<string, string> }>;
}

export async function listCasos(params?: {
  tipo_servicio_cod?: string;
  estado_actual_cod?: string;
  compania_id?: number;
}): Promise<CasoBaseApi[]> {
  const search = new URLSearchParams();
  if (params?.tipo_servicio_cod) search.set('tipo_servicio_cod', params.tipo_servicio_cod);
  if (params?.estado_actual_cod) search.set('estado_actual_cod', params.estado_actual_cod);
  if (params?.compania_id) search.set('compania_id', String(params.compania_id));
  const qs = search.toString();
  return apiFetch<CasoBaseApi[]>(`/casos${qs ? `?${qs}` : ''}`);
}

export async function getCaso(id: number): Promise<CasoBaseApi> {
  return apiFetch<CasoBaseApi>(`/casos/${id}`);
}

export async function createCaso(payload: CreateCasoPayload): Promise<CasoBaseApi> {
  return apiFetch<CasoBaseApi>('/casos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function cambiarEstadoCaso(
  casoId: number,
  estadoCod: string,
  observacion?: string,
  usuarioId?: number,
): Promise<CasoBaseApi> {
  return apiFetch<CasoBaseApi>(`/casos/${casoId}/cambiar-estado`, {
    method: 'POST',
    body: JSON.stringify({
      estadoCod,
      observacion,
      usuarioId,
    }),
  });
}

export interface AiValidationDocumentResult {
  documentoId: number;
  tipoDocumentoCod: string;
  nombreArchivo: string;
  puedeAnalizar: boolean;
  esLegible: boolean;
  esConforme: boolean;
  confianza: number;
  observaciones: string;
}

export interface AiValidationResult {
  casoId: number;
  numeroCaso: string;
  allPassed: boolean;
  escaladoMedico: boolean;
  nuevoEstado: string;
  documentos: AiValidationDocumentResult[];
  resumen: string;
  modoDemo: boolean;
  confiabilidadPct?: number;
  analisisIA?: {
    identificacionDocumentos: { status: boolean; observaciones: string };
    legibilidadIntegridad: { status: boolean; observaciones: string };
    completitud: { status: boolean; observaciones: string };
    correspondenciaBeneficiario: { status: boolean; observaciones: string };
    validacionFechas: { status: boolean; observaciones: string };
    coherenciaDiagnostico?: { status: boolean; observaciones: string };
  };
  pertinenciaMedica?: {
    evaluacionSalud: {
      sintomas: string;
      signosVitales: {
        tensionArterial?: string;
        frecuenciaCardiaca?: string;
        frecuenciaRespiratoria?: string;
        saturacionOxigeno?: string;
        temperatura?: string;
      };
      exploracionFisica: string;
      laboratorio: string;
      imagenes: string;
    };
    pertinencia: {
      necesidadMedicaReal: { status: boolean; observaciones: string };
      proporcionalidad: { status: boolean; observaciones: string };
      adecuacionGuiasClinicas: { status: boolean; observaciones: string };
      coherenciaDocumental: { status: boolean; observaciones: string };
      riesgoBeneficio: { status: boolean; observaciones: string };
    };
    esPertinente: boolean;
    observacionesGenerales: string;
  };
  vigenciaPoliza?: { desde?: string; hasta?: string };
  compromisoDatos?: {
    causa?: string;
    subcausa?: string;
    tratamiento?: string;
    coberturaNombre?: string;
    sumaAsegurada?: number;
    montoAjuste?: number;
    sumaDisponible?: number;
    reservaInicial?: number;
    montoReserva?: number;
    tasaCambio?: number;
    totales?: number;
    tipoPago?: string;
  };
}

export async function validarDocumentosIa(casoId: number): Promise<AiValidationResult> {
  return apiFetch<AiValidationResult>(`/casos/${casoId}/validar-ia`, {
    method: 'POST',
  });
}

function asInt(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`${field} inválido`);
  }
  return n;
}

export function buildCreateCasoPayload(
  serviceType: ServiceType,
  companiaId: number,
  polizaId: number,
  beneficiarioId: number,
  usuarioCreadorId?: number,
  extras?: {
    motivoConsulta?: string;
    montoSolicitado?: number;
    esPrioritario?: boolean;
    casoOrigenId?: number;
    aseguradoId?: number;
    intakeStepData?: Record<string, string>;
    portalStepData?: Array<{ serviceStepId: number; data: Record<string, string> }>;
  },
): CreateCasoPayload {
  const payload: CreateCasoPayload = {
    tipoServicioCod: mapServiceTypeToTipo(serviceType),
    companiaId: asInt(companiaId, 'companiaId'),
    polizaId: asInt(polizaId, 'polizaId'),
    beneficiarioId: asInt(beneficiarioId, 'beneficiarioId'),
    usuarioCreadorId:
      usuarioCreadorId != null ? asInt(usuarioCreadorId, 'usuarioCreadorId') : undefined,
    motivoConsulta: extras?.motivoConsulta,
    esPrioritario: extras?.esPrioritario,
    casoOrigenId:
      extras?.casoOrigenId != null ? asInt(extras.casoOrigenId, 'casoOrigenId') : undefined,
    aseguradoId:
      extras?.aseguradoId != null ? asInt(extras.aseguradoId, 'aseguradoId') : undefined,
    intakeStepData: extras?.intakeStepData,
    portalStepData: extras?.portalStepData,
  };

  if (serviceType === "reembolso") {
    payload.datosEspecificos = {
      montoSolicitado:
        extras?.montoSolicitado != null &&
        Number.isFinite(Number(extras.montoSolicitado))
          ? Number(extras.montoSolicitado)
          : 0,
    };
  }

  return payload;
}
