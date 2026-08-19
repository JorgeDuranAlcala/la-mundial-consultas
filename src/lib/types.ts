export type UserRole = 'asegurado' | 'clinica';

export interface PortalCompania {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  shortName: string;
  color: string;
}

export type ServiceType =
  | 'emergencia'
  | 'reembolso'
  | 'carta-aval'
  | 'aps'
  | 'farmacia'
  | 'activacion-aps'
  | 'activacion-farmacia'
  | 'activacion-carta-aval';

export type RequestStatus =
  | 'pendiente'
  | 'analisis'
  | 'recaudo-pendiente'
  | 'analisis-medico'
  | 'aprobado'
  | 'rechazado'
  | 'liquidada'
  | 'activa'
  | 'finalizada';

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  backendRoles: string[];
  companiaId?: number | null;
  companiaNombre?: string;
}

export interface Beneficiary {
  id: string;
  beneficiarioId: number;
  polizaId: number;
  name: string;
  cedula: string;
  relationship: string;
  policyNumber: string;
}

export interface ServiceRequest {
  id: string;
  casoId: number;
  type: ServiceType;
  status: RequestStatus;
  beneficiaryName: string;
  cedula: string;
  createdAt: string;
  updatedAt: string;
  amount?: number;
  requiresDoctor: boolean;
  notes?: string;
  estadoCod?: string;
  tipoServicioCod?: string;
  beneficiarioId?: number;
  polizaId?: number;
}

export const STATUS_LABELS: Record<RequestStatus, string> = {
  pendiente: 'Pendiente',
  analisis: 'En análisis (IA)',
  'recaudo-pendiente': 'Recaudo pendiente',
  'analisis-medico': 'Análisis médico',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  liquidada: 'Liquidada',
  activa: 'Activa',
  finalizada: 'Finalizada',
};

export const SERVICE_LABELS: Record<ServiceType, string> = {
  emergencia: 'Emergencias médicas',
  reembolso: 'Reembolso',
  'carta-aval': 'Carta aval',
  aps: 'Orden de servicio (APS)',
  farmacia: 'Orden de farmacia',
  'activacion-aps': 'Activación APS',
  'activacion-farmacia': 'Activación farmacia',
  'activacion-carta-aval': 'Activación carta aval',
};
