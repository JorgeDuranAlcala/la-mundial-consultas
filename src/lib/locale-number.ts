/** Formato montos portal: miles con "," y decimales con "." (ej. 10,000.00). */
const THOUSAND_SEP = ',';
const DECIMAL_SEP = '.';

/** Normaliza entrada del usuario a string numérico interno (punto decimal). */
export function parseLocaleNumberInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  const normalized = trimmed.replace(/\s/g, '');
  const dotIdx = normalized.lastIndexOf('.');

  let intRaw = normalized;
  let decRaw = '';

  if (dotIdx >= 0) {
    intRaw = normalized.slice(0, dotIdx);
    decRaw = normalized.slice(dotIdx + 1);
  } else {
    const commaIdx = normalized.lastIndexOf(',');
    if (commaIdx >= 0) {
      const afterComma = normalized.slice(commaIdx + 1);
      if (/^\d{1,2}$/.test(afterComma)) {
        intRaw = normalized.slice(0, commaIdx);
        decRaw = afterComma;
      }
    }
  }

  const intDigits = intRaw.replace(/[^\d]/g, '');
  const decDigits = decRaw.replace(/[^\d]/g, '').slice(0, 2);

  if (!intDigits && !decDigits) return '';
  return decDigits ? `${intDigits || '0'}.${decDigits}` : intDigits;
}

/** Convierte valor interno o numérico a texto con miles (,) y decimales (.). */
export function formatLocaleNumber(
  value: string | number | null | undefined,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number },
): string {
  if (value == null || value === '') return '';

  const raw =
    typeof value === 'number'
      ? Number.isFinite(value)
        ? String(value)
        : ''
      : parseLocaleNumberInput(String(value));

  if (!raw) return '';

  const maxFrac = options?.maximumFractionDigits ?? 2;
  const minFrac = options?.minimumFractionDigits ?? 0;
  const [intPart, decPart = ''] = raw.split('.');
  const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSAND_SEP);

  if (!decPart && minFrac === 0) return groupedInt;

  const visibleDec = decPart.slice(0, maxFrac);
  if (!visibleDec && minFrac === 0) return groupedInt;

  return `${groupedInt}${DECIMAL_SEP}${visibleDec.padEnd(minFrac, '0')}`;
}

/** Formato estándar de montos en campos del wizard (siempre 2 decimales). */
export function formatMontoField(
  value: string | number | null | undefined,
): string {
  return formatLocaleNumber(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Parsea valor interno o localizado a número finito. */
export function parseLocaleNumber(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw = parseLocaleNumberInput(value);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
