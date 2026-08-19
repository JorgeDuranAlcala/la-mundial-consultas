import { apiFetch } from './api';

export interface TipoServicioApi {
  codigo: string;
  nombre: string;
  activo?: boolean;
}

export interface TipoDocumentoApi {
  codigo: string;
  nombre: string;
  activo?: boolean;
}

export interface ServiceStepApi {
  id: number;
  compania_id: number;
  id_tipo_servicio: string;
  code: string;
  name: string;
  display_order: number;
  descripcion?: string | null;
  tipoServicio?: { codigo?: string; nombre?: string };
}

export interface ServiceStepFieldApi {
  id: number;
  service_step_id: number;
  code: string;
  name: string;
  field_type: string;
  required: boolean;
  display_order: number;
  descripcion?: string | null;
}

export interface ServiceStepDocumentApi {
  id: number;
  service_step_id: number;
  tipo_documento_cod: string;
  orden: number;
  obligatorio: boolean;
  activo: boolean;
  tipoDocumento?: { codigo?: string; nombre?: string };
}

export const PORTAL_TIPOS_SERVICIO = [
  'CARTA_AVAL',
  'ACTIVACION_CARTA',
  'EMERGENCIA',
  'FARMACIA',
  'APS',
  'REEMBOLSO',
] as const;

export async function fetchTiposServicio(): Promise<TipoServicioApi[]> {
  return apiFetch<TipoServicioApi[]>('/catalogs/tipos-servicio-carta?activo=true');
}

export async function fetchTiposDocumento(): Promise<TipoDocumentoApi[]> {
  return apiFetch<TipoDocumentoApi[]>('/catalogs/tipos-documento?activo=true');
}

export async function fetchServiceSteps(
  companiaId: number,
  tipoServicio: string,
): Promise<ServiceStepApi[]> {
  const qs = new URLSearchParams({
    compania_id: String(companiaId),
    id_tipo_servicio: tipoServicio,
  });
  return apiFetch<ServiceStepApi[]>(`/configuracion/service-steps?${qs}`);
}

export async function createServiceStep(payload: {
  compania_id: number;
  id_tipo_servicio: string;
  code: string;
  name: string;
  display_order: number;
  descripcion?: string;
}): Promise<ServiceStepApi> {
  return apiFetch<ServiceStepApi>('/configuracion/service-steps', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateServiceStep(
  id: number,
  payload: Partial<{
    code: string;
    name: string;
    display_order: number;
    descripcion: string;
  }>,
): Promise<ServiceStepApi> {
  return apiFetch<ServiceStepApi>(`/configuracion/service-steps/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteServiceStep(id: number): Promise<void> {
  await apiFetch(`/configuracion/service-steps/${id}`, { method: 'DELETE' });
}

export async function fetchStepFields(stepId: number): Promise<ServiceStepFieldApi[]> {
  return apiFetch<ServiceStepFieldApi[]>(`/configuracion/service-steps/${stepId}/fields`);
}

export async function createStepField(
  stepId: number,
  payload: {
    code: string;
    name: string;
    field_type?: string;
    required?: boolean;
    display_order: number;
    descripcion?: string;
  },
): Promise<ServiceStepFieldApi> {
  return apiFetch<ServiceStepFieldApi>(`/configuracion/service-steps/${stepId}/fields`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteStepField(stepId: number, fieldId: number): Promise<void> {
  await apiFetch(`/configuracion/service-steps/${stepId}/fields/${fieldId}`, {
    method: 'DELETE',
  });
}

export async function fetchStepDocuments(stepId: number): Promise<ServiceStepDocumentApi[]> {
  return apiFetch<ServiceStepDocumentApi[]>(`/configuracion/service-steps/${stepId}/documents`);
}

export async function createStepDocument(
  stepId: number,
  payload: {
    tipo_documento_cod: string;
    orden: number;
    obligatorio?: boolean;
    activo?: boolean;
  },
): Promise<ServiceStepDocumentApi> {
  return apiFetch<ServiceStepDocumentApi>(`/configuracion/service-steps/${stepId}/documents`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteStepDocument(stepId: number, documentId: number): Promise<void> {
  await apiFetch(`/configuracion/service-steps/${stepId}/documents/${documentId}`, {
    method: 'DELETE',
  });
}

export interface CriterioValidacionApi {
  criterio_id: number;
  clave: string;
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
}

export interface ConfigValidacionApi {
  config_id: number;
  compania_id: number;
  tipo_servicio_cod: string;
  criterio_id: number;
  orden_ejecucion: number;
  es_obligatorio: boolean;
  regla_validacion?: string | null;
  activo: boolean;
  criterio?: CriterioValidacionApi;
  tipoServicio?: { codigo?: string; nombre?: string };
}

export async function fetchCriteriosValidacion(): Promise<CriterioValidacionApi[]> {
  return apiFetch<CriterioValidacionApi[]>('/catalogs/criterios-validacion?activo=true');
}

export async function fetchConfigValidacion(
  companiaId: number,
  tipoServicio: string,
): Promise<ConfigValidacionApi[]> {
  const qs = new URLSearchParams({
    compania_id: String(companiaId),
    tipo_servicio_cod: tipoServicio,
    activo: 'true',
  });
  return apiFetch<ConfigValidacionApi[]>(`/configuracion/config-validacion?${qs}`);
}

export async function createConfigValidacion(payload: {
  compania_id: number;
  tipo_servicio_cod: string;
  criterio_id: number;
  orden_ejecucion: number;
  es_obligatorio?: boolean;
  regla_validacion: string;
  activo?: boolean;
}): Promise<ConfigValidacionApi> {
  return apiFetch<ConfigValidacionApi>('/configuracion/config-validacion', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateConfigValidacion(
  id: number,
  payload: Partial<{
    orden_ejecucion: number;
    es_obligatorio: boolean;
    regla_validacion: string;
    activo: boolean;
  }>,
): Promise<ConfigValidacionApi> {
  return apiFetch<ConfigValidacionApi>(`/configuracion/config-validacion/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteConfigValidacion(id: number): Promise<void> {
  await apiFetch(`/configuracion/config-validacion/${id}`, { method: 'DELETE' });
}

export interface ConfigDocumentoUploadApi {
  configId: number;
  companiaId: number;
  tipoDocumentoCod: string;
  maxSizeMb: number;
  resolucionPreset: string;
  minAnchoPx?: number | null;
  minAltoPx?: number | null;
  calidadImagen?: number | null;
  formatosPermitidos: string[];
  activo: boolean;
  tipoDocumento?: { codigo?: string; nombre?: string };
}

export interface DocumentUploadMetaApi {
  tamanoMbOpciones: number[];
  resolucionPresets: Record<string, { label: string; minWidth: number; minHeight: number }>;
  formatosDocumento: string[];
}

export async function fetchDocumentUploadMeta(): Promise<DocumentUploadMetaApi> {
  return apiFetch<DocumentUploadMetaApi>('/configuracion/document-upload-meta');
}

export async function fetchConfigDocumento(
  companiaId: number,
  activo = true,
): Promise<ConfigDocumentoUploadApi[]> {
  const qs = new URLSearchParams({
    compania_id: String(companiaId),
    activo: String(activo),
  });
  return apiFetch<ConfigDocumentoUploadApi[]>(`/configuracion/config-documento?${qs}`);
}

export async function createConfigDocumento(payload: {
  compania_id: number;
  tipo_documento_cod: string;
  max_size_mb?: number;
  resolucion_preset?: string;
  min_ancho_px?: number;
  min_alto_px?: number;
  calidad_imagen?: number;
  formatos_permitidos?: string[];
  activo?: boolean;
}): Promise<ConfigDocumentoUploadApi> {
  return apiFetch<ConfigDocumentoUploadApi>('/configuracion/config-documento', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateConfigDocumento(
  id: number,
  payload: Partial<{
    max_size_mb: number;
    resolucion_preset: string;
    min_ancho_px: number;
    min_alto_px: number;
    calidad_imagen: number;
    formatos_permitidos: string[];
    activo: boolean;
  }>,
): Promise<ConfigDocumentoUploadApi> {
  return apiFetch<ConfigDocumentoUploadApi>(`/configuracion/config-documento/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteConfigDocumento(id: number): Promise<void> {
  await apiFetch(`/configuracion/config-documento/${id}`, { method: 'DELETE' });
}
