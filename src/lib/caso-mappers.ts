import type { RequestStatus, ServiceType } from './types';

export interface CasoBeneficiarioApi {
  id: number;
  nombres: string;
  apellidos: string;
  cedula: string;
  tipoCedula?: string;
  parentescoCod?: string | null;
  parentesco?: { nombre?: string } | null;
}

export interface CasoPolizaApi {
  id: number;
  numeroPoliza: string;
  estado?: string;
  fechaInicioVigencia?: string | null;
  fechaFinVigencia?: string | null;
}

export interface CasoReembolsoApi {
  montoSolicitado?: number;
  montoAprobado?: number | null;
}

export interface CasoBaseApi {
  id: number;
  numeroCaso: string;
  companiaId: number;
  tipoServicioCod: string;
  estadoActualCod: string;
  polizaId: number;
  beneficiarioId: number;
  usuarioCreadorId?: number | null;
  esPrioritario?: boolean;
  fechaSolicitud?: string;
  creadoEn?: string;
  actualizadoEn?: string;
  beneficiario?: CasoBeneficiarioApi;
  poliza?: CasoPolizaApi;
  tipoServicio?: { nombre?: string };
  estadoActual?: { nombre?: string };
  montoSolicitado?: number;
  montoAprobado?: number | null;
  extension?: {
    montoSolicitado?: number;
    montoAprobado?: number | null;
  };
}

const TIPO_TO_SERVICE: Record<string, ServiceType> = {
  REEMBOLSO: 'reembolso',
  APS: 'aps',
  FARMACIA: 'farmacia',
  CARTA_AVAL: 'carta-aval',
  EMERGENCIA: 'emergencia',
  ACTIVACION_CARTA: 'activacion-carta-aval',
};

const SERVICE_TO_TIPO: Record<ServiceType, string> = {
  reembolso: 'REEMBOLSO',
  aps: 'APS',
  farmacia: 'FARMACIA',
  'carta-aval': 'CARTA_AVAL',
  emergencia: 'EMERGENCIA',
  'activacion-aps': 'ACTIVACION_CARTA',
  'activacion-farmacia': 'ACTIVACION_CARTA',
  'activacion-carta-aval': 'ACTIVACION_CARTA',
};

const ESTADO_TO_STATUS: Record<string, RequestStatus> = {
  INICIADO: 'pendiente',
  SOLICITADO: 'pendiente',
  PENDIENTE: 'pendiente',
  ANALISIS: 'analisis',
  EN_VALIDACION: 'analisis',
  ANALISIS_MEDICO: 'analisis-medico',
  RECAUDO_PENDIENTE: 'recaudo-pendiente',
  RECHAZADO_PENDIENTE: 'recaudo-pendiente',
  APROBADO: 'aprobado',
  RECHAZADO: 'rechazado',
  CARTA_AVAL_ACTIVA: 'activa',
  SERVICIO_FINALIZADO: 'finalizada',
  COMPLETADO: 'finalizada',
  CERRADO: 'finalizada',
  ANULADO: 'rechazado',
  CANCELADO: 'rechazado',
};

const STATUS_TO_ESTADO: Partial<Record<RequestStatus, string>> = {
  'recaudo-pendiente': 'RECAUDO_PENDIENTE',
  rechazado: 'RECHAZADO',
  aprobado: 'APROBADO',
  activa: 'CARTA_AVAL_ACTIVA',
  finalizada: 'SERVICIO_FINALIZADO',
  analisis: 'ANALISIS',
  'analisis-medico': 'ANALISIS_MEDICO',
  pendiente: 'PENDIENTE',
};

export function mapTipoServicioToServiceType(codigo: string): ServiceType {
  return TIPO_TO_SERVICE[codigo] ?? 'reembolso';
}

export function mapServiceTypeToTipo(servicio: ServiceType): string {
  return SERVICE_TO_TIPO[servicio];
}

export function mapEstadoToStatus(estadoCod: string): RequestStatus {
  return ESTADO_TO_STATUS[estadoCod] ?? 'pendiente';
}

export function mapStatusToEstado(status: RequestStatus): string {
  return STATUS_TO_ESTADO[status] ?? 'PENDIENTE';
}

export function formatCedula(b: CasoBeneficiarioApi): string {
  const tipo = b.tipoCedula ?? 'V';
  return `${tipo}-${b.cedula}`;
}

export function mapCasoToServiceRequest(caso: CasoBaseApi) {
  const b = caso.beneficiario;
  const nombre = b
    ? `${b.nombres} ${b.apellidos}`.trim()
    : 'Beneficiario';
  const cedula = b ? formatCedula(b) : '—';
  const monto =
    caso.montoSolicitado ??
    caso.extension?.montoSolicitado ??
    caso.montoAprobado ??
    caso.extension?.montoAprobado ??
    undefined;

  return {
    id: caso.numeroCaso,
    casoId: caso.id,
    type: mapTipoServicioToServiceType(caso.tipoServicioCod),
    status: mapEstadoToStatus(caso.estadoActualCod),
    beneficiaryName: nombre,
    cedula,
    createdAt: caso.fechaSolicitud ?? caso.creadoEn ?? new Date().toISOString(),
    updatedAt: caso.actualizadoEn ?? caso.creadoEn ?? new Date().toISOString(),
    amount: monto ? Number(monto) : undefined,
    requiresDoctor:
      caso.estadoActualCod === 'ANALISIS_MEDICO' || Boolean(caso.esPrioritario),
    estadoCod: caso.estadoActualCod,
    tipoServicioCod: caso.tipoServicioCod,
    beneficiarioId: caso.beneficiarioId ?? caso.beneficiario?.id,
    polizaId: caso.polizaId ?? caso.poliza?.id,
  };
}

export type MappedServiceRequest = ReturnType<typeof mapCasoToServiceRequest>;
