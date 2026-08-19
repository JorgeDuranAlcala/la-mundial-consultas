export interface CedulaParsed {
  tipoCedula: string;
  cedula: string;
  display: string;
}

export interface RmsDocumentQuery {
  nacionalidad: string;
  cedrif: number;
  correlativo: number;
  display: string;
}

const JURIDICAL_NATIONALITIES = new Set(['J', 'G', 'P', 'C']);

function buildRmsCedrif(
  nacionalidad: string,
  bodyDigits: string,
  suffixDigits: string,
): number {
  const cedrifDigits = JURIDICAL_NATIONALITIES.has(nacionalidad)
    ? `${bodyDigits}${suffixDigits}`
    : bodyDigits;
  const cedrif = Number.parseInt(cedrifDigits, 10);
  return Number.isFinite(cedrif) ? cedrif : NaN;
}

/** Normaliza entradas como V-12.345.678, J-12345678-0 o 12345678 */
export function parseCedulaInput(input: string): CedulaParsed | null {
  const trimmed = input.trim().toUpperCase();
  if (!trimmed) return null;

  const withType = trimmed.match(/^([VEJPGC])[-.\s]?([\d.]+)$/);
  if (withType) {
    const cedula = withType[2].replace(/\D/g, '');
    if (!cedula) return null;
    const tipoCedula = withType[1].toUpperCase();
    return { tipoCedula, cedula, display: `${tipoCedula}-${cedula}` };
  }

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  return { tipoCedula: 'V', cedula: digits, display: `V-${digits}` };
}

/** Parsea cédula o RIF para consulta RMS (nacionalidad, cedrif, correlativo). */
export function parseDocumentForRms(
  input: string,
  correlativoOverride?: number,
): RmsDocumentQuery | null {
  const trimmed = input.trim().toUpperCase();
  if (!trimmed) return null;

  // Correlativo solo con separador explícito (V-12345678-0 / J-031225887-0).
  // Sin esto, V-10672390 se interpreta como cédula 1067239 + correlativo 0.
  const withCorrelativo = trimmed.match(
    /^([VEJPGC])[-.\s]?([\d.]+)[-.\s](\d+)$/,
  );
  if (withCorrelativo) {
    const body = withCorrelativo[2].replace(/\D/g, '');
    if (!body) return null;
    const nacionalidad = withCorrelativo[1];
    const suffix = withCorrelativo[3];
    const correlativo =
      correlativoOverride ?? Number.parseInt(suffix, 10);
    if (!Number.isFinite(correlativo)) return null;
    const cedrif = buildRmsCedrif(nacionalidad, body, suffix);
    if (!Number.isFinite(cedrif)) return null;

    const rmsCorrelativo = JURIDICAL_NATIONALITIES.has(nacionalidad) ? 0 : correlativo;

    return {
      nacionalidad,
      cedrif,
      correlativo: rmsCorrelativo,
      display: `${nacionalidad}-${body}-${suffix}`,
    };
  }

  const parsed = parseCedulaInput(trimmed);
  if (!parsed) return null;

  const cedrif = Number.parseInt(parsed.cedula, 10);
  if (!Number.isFinite(cedrif)) return null;

  const correlativo = correlativoOverride ?? 0;
  return {
    nacionalidad: parsed.tipoCedula,
    cedrif,
    correlativo,
    display:
      correlativo > 0
        ? `${parsed.tipoCedula}-${parsed.cedula}-${correlativo}`
        : parsed.display,
  };
}

export function cedulasMatch(
  tipoA: string,
  cedulaA: string | number,
  tipoB: string,
  cedulaB: string | number,
): boolean {
  const normalize = (tipo: string, cedula: string | number) =>
    `${String(tipo).trim().toUpperCase()}:${String(cedula).replace(/\D/g, '')}`;
  return normalize(tipoA, cedulaA) === normalize(tipoB, cedulaB);
}
