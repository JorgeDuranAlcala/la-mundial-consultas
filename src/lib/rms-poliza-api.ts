import { apiFetch } from './api';

export interface RmsPolizaItem {
  serialcontrato: number;
  serialcertif: number;
  numeroPoliza: string;
  certificado: string;
  correlativo: number;
  estatus: string | null;
  sumaAsegurada: number;
  fechaInicio: string | null;
  fechaFin: string | null;
  tipocontratoSeguro?: string | null;
  esColectiva?: boolean;
  coberturaNombre?: string | null;
  label: string;
}

export function toIsoDateOnly(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const iso = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const y = parsed.getUTCFullYear();
  const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const d = String(parsed.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Fecha calendario en español (dd/mm/aaaa). */
export function formatFechaEs(value?: string | null): string {
  const iso = toIsoDateOnly(value);
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function formatVigenciaPoliza(
  desde?: string | null,
  hasta?: string | null,
): string {
  return `Desde ${formatFechaEs(desde)} – Hasta ${formatFechaEs(hasta)}`;
}

/** Pólizas vigentes en schema RMS (e_aseg_seg), no del portal. */
export async function fetchRmsPolizasByCedula(params: {
  nacionalidad: string;
  cedrif: number | string;
  correlativo?: number | null;
}): Promise<RmsPolizaItem[]> {
  const qs = new URLSearchParams({
    nacionalidad: String(params.nacionalidad).trim().toUpperCase().slice(0, 1),
    cedrif: String(params.cedrif).replace(/\D/g, ''),
  });
  if (
    params.correlativo != null &&
    Number.isFinite(Number(params.correlativo)) &&
    Number(params.correlativo) >= 0
  ) {
    qs.set('correlativo', String(Number(params.correlativo)));
  }
  return apiFetch<RmsPolizaItem[]>(`/rms/polizas?${qs}`);
}

/** Parsea V-12345678 o V-12345678-1 → nac, cedrif, correlativo. */
export function parseCedulaForRmsPoliza(raw: string): {
  nacionalidad: string;
  cedrif: number;
  correlativo: number | null;
} | null {
  const cleaned = raw.trim().toUpperCase().replace(/\./g, '').replace(/\s+/g, '');
  const withCorr = cleaned.match(/^([VEJPG])-?(\d+)-(\d+)$/);
  if (withCorr) {
    return {
      nacionalidad: withCorr[1],
      cedrif: Number(withCorr[2]),
      correlativo: Number(withCorr[3]),
    };
  }
  const plain = cleaned.match(/^([VEJPG])-?(\d+)$/);
  if (plain) {
    return {
      nacionalidad: plain[1],
      cedrif: Number(plain[2]),
      correlativo: null,
    };
  }
  const digits = cleaned.replace(/\D/g, '');
  if (!digits) return null;
  return { nacionalidad: 'V', cedrif: Number(digits), correlativo: null };
}
