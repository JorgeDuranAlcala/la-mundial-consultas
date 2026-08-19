import { apiFetch } from './api';
import { mapServiceTypeToTipo } from './caso-mappers';
import type { ServiceType } from './types';

export interface PortalStepField {
  id: number;
  code: string;
  name: string;
  field_type: string;
  required: boolean;
  display_order: number;
  descripcion?: string | null;
}

export interface PortalStepDocument {
  id: number;
  tipo_documento_cod: string;
  orden: number;
  obligatorio: boolean;
}

export interface PortalServiceStep {
  id: number;
  code: string;
  name: string;
  display_order: number;
  descripcion?: string | null;
  id_tipo_servicio: string;
  fields: PortalStepField[];
  documents: PortalStepDocument[];
}

/** Pantalla del wizard: formulario de campos o subida de documentos (nunca mezclados). */
export type PortalWizardScreen =
  | { kind: 'fields'; step: PortalServiceStep }
  | { kind: 'documents'; step: PortalServiceStep };

export function parseSelectOptions(descripcion?: string | null): Array<{ value: string; label: string }> {
  if (!descripcion) return [];
  return descripcion.split('|').map((part) => {
    const [value, label] = part.split(':');
    return { value: value?.trim() ?? '', label: (label ?? value)?.trim() ?? '' };
  }).filter((o) => o.value);
}

export async function fetchPortalServiceSteps(
  companiaId: number,
  serviceType: ServiceType,
): Promise<PortalServiceStep[]> {
  const tipoServicio = mapServiceTypeToTipo(serviceType);
  const qs = new URLSearchParams({
    compania_id: String(companiaId),
    id_tipo_servicio: tipoServicio,
  });
  const steps = await apiFetch<PortalServiceStep[]>(
    `/configuracion/service-steps/detalle?${qs}`,
  );
  return Array.isArray(steps) ? steps : [];
}

export function sortWorkflowSteps(steps: PortalServiceStep[]): PortalServiceStep[] {
  return [...steps].sort((a, b) => a.display_order - b.display_order);
}

/**
 * Construye las pantallas del wizard en orden del workflow.
 * Campos y documentos del mismo paso backend → dos pantallas separadas en el portal.
 */
export function buildPortalWizardScreens(steps: PortalServiceStep[] | unknown): PortalWizardScreen[] {
  if (!Array.isArray(steps)) return [];
  const screens: PortalWizardScreen[] = [];
  for (const step of sortWorkflowSteps(steps)) {
    if (step.fields?.length) screens.push({ kind: 'fields', step });
    if (step.documents?.length) screens.push({ kind: 'documents', step });
  }
  return screens;
}

export function wizardScreenLabel(screen: PortalWizardScreen): string {
  if (screen.kind === 'fields') return screen.step.name;
  return `Documentos · ${screen.step.name}`;
}

export function buildWizardLabels(screens: PortalWizardScreen[]): string[] {
  if (!screens.length) return ['Beneficiario', 'Confirmar'];
  return ['Beneficiario', ...screens.map(wizardScreenLabel), 'Confirmar'];
}

export function getConfirmStepIndex(screens: PortalWizardScreen[]): number {
  return screens.length + 1;
}

/** Pasos del workflow que tienen al menos un campo (para persistencia). */
export function getStepsWithFields(steps: PortalServiceStep[]): PortalServiceStep[] {
  return sortWorkflowSteps(steps).filter((s) => (s.fields?.length ?? 0) > 0);
}

/** @deprecated Use buildPortalWizardScreens */
export function getPortalWizardSteps(steps: PortalServiceStep[] | unknown): PortalServiceStep[] {
  if (!Array.isArray(steps)) return [];
  return sortWorkflowSteps(steps).filter(
    (s) => (s.fields?.length ?? 0) > 0 || (s.documents?.length ?? 0) > 0,
  );
}

/** @deprecated Use buildPortalWizardScreens */
export function getIntakeStep(steps: PortalServiceStep[] | unknown): PortalServiceStep | null {
  if (!Array.isArray(steps)) return null;
  return steps.find((s) => s.code === 'SOLICITUD') ?? steps[0] ?? null;
}

export function pickStepFieldValues(
  step: PortalServiceStep,
  values: Record<string, string>,
): Record<string, string> {
  const data: Record<string, string> = {};
  for (const field of step.fields) {
    const value = values[field.code]?.trim();
    if (value) data[field.code] = value;
  }
  return data;
}

export function buildPortalStepDataPayload(
  workflowSteps: PortalServiceStep[],
  values: Record<string, string>,
): Array<{ serviceStepId: number; data: Record<string, string> }> {
  return getStepsWithFields(workflowSteps)
    .map((step) => ({
      serviceStepId: step.id,
      data: pickStepFieldValues(step, values),
    }))
    .filter((entry) => Object.keys(entry.data).length > 0);
}
