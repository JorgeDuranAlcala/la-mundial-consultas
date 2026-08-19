import { apiFetch } from './api';
import type { Beneficiary } from './types';
import { cedulasMatch } from './cedula.util';
import { consultarAsegurabilidad } from './asegurabilidad-api';
import { buscarAsegurabilidad } from './coverage-api';

interface BeneficiarioRow {
  id: number;
  cedula: string;
  tipo_cedula?: string;
  tipoCedula?: string;
  nombres: string;
  apellidos: string;
}

export async function findBeneficiarioByCedula(
  tipoCedula: string,
  cedula: string,
): Promise<BeneficiarioRow | null> {
  // Backend CRUD espera filter[campo]=valor o filter[campo__eq]=valor
  // (no filter[campo][eq], que se ignora y devolvía el primer registro).
  const params = new URLSearchParams({
    'filter[tipo_cedula]': tipoCedula.trim().toUpperCase(),
    'filter[cedula]': String(cedula).replace(/\D/g, ''),
    limit: '5',
  });
  const res = await apiFetch<{ data: BeneficiarioRow[] }>(`/v1/beneficiario?${params}`);
  const rows = res.data ?? [];
  const exact = rows.find((row) =>
    cedulasMatch(
      row.tipoCedula ?? row.tipo_cedula ?? 'V',
      row.cedula,
      tipoCedula,
      String(cedula),
    ),
  );
  return exact ?? null;
}

export function matchBeneficiaryInList(
  beneficiaries: Beneficiary[],
  tipoCedula: string,
  cedula: string,
): Beneficiary | null {
  return (
    beneficiaries.find((b) => {
      const [tipo, num] = b.cedula.includes('-')
        ? b.cedula.split('-', 2)
        : ['V', b.cedula];
      return cedulasMatch(tipo, num, tipoCedula, cedula);
    }) ?? null
  );
}

/**
 * Resuelve paciente para trámites:
 * 1) lista local de beneficiarios
 * 2) asegurabilidad (beneficiarios + asegurados/dependientes portal y RMS)
 * 3) CRUD beneficiario
 */
export async function resolveBeneficiaryFromDocument(
  beneficiaries: Beneficiary[],
  tipoCedula: string,
  cedula: string,
  policyNumber: string,
  polizaId: number,
): Promise<Beneficiary | null> {
  const fromList = matchBeneficiaryInList(beneficiaries, tipoCedula, cedula);
  if (fromList) return fromList;

  const doc = `${tipoCedula}-${String(cedula).replace(/\D/g, '')}`;

  try {
    const asegurabilidad = await consultarAsegurabilidad(doc);
    if (asegurabilidad.asegurado && asegurabilidad.beneficiario?.id) {
      return {
        id: String(asegurabilidad.beneficiario.id),
        beneficiarioId: Number(asegurabilidad.beneficiario.id),
        polizaId: asegurabilidad.poliza?.id ?? polizaId ?? 0,
        name: asegurabilidad.beneficiario.nombreCompleto,
        cedula: `${asegurabilidad.beneficiario.tipoCedula}-${asegurabilidad.beneficiario.cedula}`,
        relationship:
          asegurabilidad.beneficiario.parentescoNombre ??
          asegurabilidad.beneficiario.parentescoCod ??
          'Asegurado',
        policyNumber: asegurabilidad.poliza?.numeroPoliza ?? policyNumber,
      };
    }
  } catch {
    // Continúa con /polizas/buscar
  }

  try {
    const buscar = await buscarAsegurabilidad(doc);
    const item =
      buscar.items?.find((i) => i.tienePolizaActiva && i.beneficiarioId) ??
      buscar.items?.find((i) => i.tienePolizaActiva) ??
      null;
    if (item?.beneficiarioId) {
      return {
        id: String(item.beneficiarioId),
        beneficiarioId: Number(item.beneficiarioId),
        polizaId: item.polizaId ?? polizaId ?? 0,
        name: item.nombreCompleto,
        cedula: item.cedula,
        relationship: item.parentesco || 'Asegurado',
        policyNumber: item.numeroPoliza ?? policyNumber,
      };
    }
  } catch {
    // Continúa con lookup CRUD
  }

  const row = await findBeneficiarioByCedula(tipoCedula, String(cedula));
  if (!row) return null;

  return {
    id: String(row.id),
    beneficiarioId: Number(row.id),
    polizaId: polizaId || 0,
    name: `${row.nombres} ${row.apellidos}`.trim(),
    cedula: `${row.tipoCedula ?? row.tipo_cedula ?? tipoCedula}-${row.cedula}`,
    relationship: 'Beneficiario',
    policyNumber: policyNumber !== '—' ? policyNumber : '—',
  };
}
