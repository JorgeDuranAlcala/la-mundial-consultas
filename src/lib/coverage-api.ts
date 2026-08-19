import { apiFetch } from './api';
import { getPolizaCompleta } from './auth-api';

export interface PolizaListItem {
  id: number;
  numeroPoliza: string;
  estado?: string;
  aseguradoTitularId?: number;
}

export interface BeneficiarioPolizaApi {
  id: number;
  nombres: string;
  apellidos: string;
  cedula: string;
  tipoCedula?: string;
  parentescoCod?: string | null;
  parentescoNombre?: string | null;
  fechaAlta?: string;
  activoEnPoliza?: boolean;
}

export interface CoverageContext {
  companiaId: number;
  polizaId: number;
  numeroPoliza: string;
  aseguradoTitularId: number;
  beneficiarios: BeneficiarioPolizaApi[];
  vinculoUsuario?: {
    parentescoCod?: string | null;
    parentescoNombre?: string | null;
    beneficiarioId?: number | null;
    /** Tomador o titular pueden consultar todos los asociados de la póliza. */
    puedeConsultarTodos?: boolean;
    tipoCedula?: string | null;
    cedula?: string | null;
  };
}


export interface AsegurabilidadItem {
  polizaId: number | null;
  numeroPoliza: string | null;
  estado: string;
  sumaAsegurada: number | null;
  beneficiarioId: number | null;
  nombreCompleto: string;
  cedula: string;
  parentesco: string;
  titularNombre: string | null;
  aseguradoTitularId: number | null;
  fuente?: "PORTAL" | "RMS";
  tienePolizaActiva?: boolean;
  mensaje?: string;
}

function mapBeneficiarios(
  raw: Record<string, unknown>[],
): BeneficiarioPolizaApi[] {
  return raw.map((b) => ({
    id: Number(b.id),
    nombres: String(b.nombres ?? ""),
    apellidos: String(b.apellidos ?? ""),
    cedula: String(b.cedula ?? ""),
    tipoCedula: String(b.tipoCedula ?? b.tipo_cedula ?? "V"),
    parentescoCod: (b.parentescoCod ?? b.parentesco_cod) as string | null,
    parentescoNombre: (b.parentescoNombre ?? b.parentesco_nombre) as
      | string
      | null,
    fechaAlta: b.fechaAlta as string | undefined,
    activoEnPoliza: Boolean(b.activoEnPoliza ?? b.activo_en_poliza ?? true),
  }));
}

function mapCompletaToCoverage(
  completa: Record<string, unknown>,
  companiaId?: number,
): CoverageContext {
  const poliza = completa.poliza as Record<string, unknown>;
  const beneficiarios = mapBeneficiarios(
    (completa.beneficiarios as Record<string, unknown>[]) ?? [],
  );
  const vinculoRaw = completa.vinculoUsuario as Record<string, unknown> | undefined;

  return {
    companiaId: Number(
      companiaId ?? poliza.companiaId ?? poliza.compania_id ?? 1,
    ),
    polizaId: Number(poliza.id),
    numeroPoliza: String(poliza.numeroPoliza ?? poliza.numero_poliza ?? ""),
    aseguradoTitularId: Number(
      poliza.aseguradoTitularId ?? poliza.asegurado_titular_id ?? 0,
    ),
    beneficiarios,
    vinculoUsuario: vinculoRaw
      ? {
          parentescoCod: (vinculoRaw.parentescoCod as string | null) ?? null,
          parentescoNombre: (vinculoRaw.parentescoNombre as string | null) ?? null,
          beneficiarioId:
            vinculoRaw.beneficiarioId != null
              ? Number(vinculoRaw.beneficiarioId)
              : null,
          puedeConsultarTodos: Boolean(
            vinculoRaw.puedeConsultarTodos ?? true,
          ),
          tipoCedula: (vinculoRaw.tipoCedula as string | null) ?? null,
          cedula: (vinculoRaw.cedula as string | null) ?? null,
        }
      : undefined,
  };
}

export async function buscarAsegurabilidad(
  cedula: string,
  q?: string,
): Promise<{ total: number; items: AsegurabilidadItem[] }> {
  const qs = new URLSearchParams({ cedula: cedula.trim() });
  if (q?.trim()) qs.set('q', q.trim());
  return apiFetch(`/polizas/buscar?${qs}`);
}

/** Titular/tomador vincula un dependiente por cédula a su póliza. */
export async function asociarDependienteAPoliza(params: {
  polizaId: number;
  cedula: string;
  parentescoCod?: string;
}): Promise<Record<string, unknown>> {
  return apiFetch('/polizas/asociar-dependiente', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}



export async function listPolizas(): Promise<PolizaListItem[]> {
  const res = await apiFetch<{ data: Record<string, unknown>[]; meta?: unknown }>(
    '/v1/poliza?limit=50',
  );
  return res.data.map((row) => ({
    id: Number(row.id),
    numeroPoliza: String(row.numero_poliza ?? row.numeroPoliza ?? ''),
    estado: String(row.estado ?? 'ACTIVA'),
    aseguradoTitularId: Number(row.asegurado_titular_id ?? row.aseguradoTitularId ?? 0),
  }));
}

export async function loadDefaultCoverage(
  companiaId?: number,
  userEmail?: string | null,
  opts?: { role?: string | null; associatedOnly?: boolean },
): Promise<CoverageContext | null> {
  const associatedOnly =
    opts?.associatedOnly ??
    (opts?.role === 'asegurado' || opts?.role === 'ASEGURADO');

  // Cobertura del asegurado: solo RMS QA vía /cobertura-usuario.
  // No usar pólizas locales ni cobertura-por-email (altas hechas contra RMS prod).
  if (associatedOnly) {
    try {
      const propia = await apiFetch<Record<string, unknown> | null>(
        '/polizas/cobertura-usuario',
      );
      if (propia?.poliza) {
        return mapCompletaToCoverage(propia, companiaId);
      }
    } catch {
      /* sin cobertura RMS */
    }
    return null;
  }

  if (userEmail?.trim()) {
    try {
      const porEmail = await apiFetch<Record<string, unknown> | null>(
        `/polizas/cobertura-por-email?email=${encodeURIComponent(userEmail.trim())}`,
      );
      if (porEmail?.poliza) {
        return mapCompletaToCoverage(porEmail, companiaId);
      }
    } catch {
      /* fallback a listado */
    }
  }

  const polizas = await listPolizas();
  const activa = polizas.find((p) => p.estado === "ACTIVA") ?? polizas[0];
  if (!activa) return null;

  const completa = await getPolizaCompleta(activa.id);
  return mapCompletaToCoverage(completa, companiaId);
}
