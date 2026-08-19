import { apiFetch } from './api';

export interface OrdenFarmaciaPendienteApi {
  id: number;
  ordenId: number | null;
  casoId: number;
  codigoOrden: string;
  estado: string;
  estadoCaso?: string;
  fechaEmision: string;
  numeroCaso: string | null;
  beneficiario: {
    id: number;
    nombres: string;
    apellidos: string;
    cedula: string;
    tipoCedula?: string;
  } | null;
}

export function formatBeneficiarioCedula(
  beneficiario: OrdenFarmaciaPendienteApi['beneficiario'],
): string {
  if (!beneficiario) return '—';
  const tipo = beneficiario.tipoCedula?.trim();
  const cedula = beneficiario.cedula?.trim();
  if (tipo && cedula) return `${tipo}-${cedula}`;
  return cedula || '—';
}

export function ordenFarmaciaItemKey(orden: OrdenFarmaciaPendienteApi): string {
  return String(orden.casoId);
}

export function formatOrdenFarmaciaLabel(orden: OrdenFarmaciaPendienteApi): string {
  const nombre = orden.beneficiario
    ? `${orden.beneficiario.nombres} ${orden.beneficiario.apellidos}`.trim()
    : 'Sin beneficiario';
  const cedula = formatBeneficiarioCedula(orden.beneficiario);
  const ref = orden.numeroCaso ?? orden.codigoOrden;
  return `${ref} · ${nombre} · ${cedula} · ${orden.estado}`;
}

export async function fetchOrdenesFarmaciaPendientes(): Promise<OrdenFarmaciaPendienteApi[]> {
  const rows = await apiFetch<OrdenFarmaciaPendienteApi[]>(
    '/casos/ordenes-farmacia/pendientes',
  );
  return Array.isArray(rows) ? rows : [];
}
