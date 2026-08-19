import { CedulaInput } from '@/components/ui/CedulaInput';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { MontoInput } from '@/components/ui/MontoInput';
import { formatMontoField } from '@/lib/locale-number';
import { parseSelectOptions, type PortalStepField } from '@/lib/service-steps-api';

interface DynamicStepFieldsProps {
  fields: PortalStepField[];
  values: Record<string, string>;
  onChange: (code: string, value: string) => void;
  disabled?: boolean;
  /** Códigos de campo bloqueados (p. ej. cédula prellenada). */
  readOnlyCodes?: ReadonlySet<string> | string[];
  /** Tope máximo para campos de monto (suma asegurada RMS o tope de farmacia). */
  maxMonto?: number | null;
  /** Texto del tope, p. ej. "tope mensual de farmacia". */
  maxMontoLabel?: string;
}

function foldText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

/** Detecta campos de cédula por code o name (con o sin tilde). */
export function isCedulaField(field: {
  code?: string | null;
  name?: string | null;
  codigo?: string | null;
  nombre?: string | null;
}): boolean {
  const code = foldText(String(field.code ?? field.codigo ?? ''));
  const name = foldText(String(field.name ?? field.nombre ?? ''));
  const haystack = `${code} ${name}`;
  return (
    haystack.includes('cedula') ||
    haystack.includes('identidad') ||
    /\bci\b/.test(haystack)
  );
}

/** Detecta campos de monto / importe para aplicar tope de suma asegurada. */
export function isMontoField(field: {
  code?: string | null;
  name?: string | null;
}): boolean {
  const haystack = foldText(`${field.code ?? ''} ${field.name ?? ''}`);
  return (
    haystack.includes('monto') ||
    haystack.includes('importe') ||
    haystack.includes('cantidad') ||
    haystack.includes('suma_solicit')
  );
}

export function collectCedulaFieldCodes(
  steps: Array<{ fields?: Array<{ code?: string; name?: string }> }>,
): Set<string> {
  const codes = new Set<string>();
  for (const step of steps) {
    for (const field of step.fields ?? []) {
      if (!isCedulaField(field)) continue;
      if (field.code) codes.add(field.code);
    }
  }
  return codes;
}

function fieldTypeOf(field: { field_type?: string | null }): string {
  return String(field.field_type ?? 'TEXT').trim().toUpperCase();
}

/** Codigos de campos RMS que se rellenan automaticamente y no deben mostrarse al usuario. */
const HIDDEN_RMS_FIELD_CODES = new Set([
  'RMS_SERIALCONTRATO',
  'RMS_SERIALCERTIF',
  'RMS_NUMERO_POLIZA',
  'RMS_CERTIFICADO',
  'RMS_SUMA_ASEGURADA',
  'RMS_ES_COLECTIVA',
  'RMS_TIPO_CONTRATO',
  'RMS_FECHA_INICIO',
  'RMS_FECHA_FIN',
  'RMS_COBERTURA_NOMBRE',
]);

/** Indica si un campo del workflow es interno de RMS y debe ocultarse del formulario. */
export function isHiddenRmsField(field: { code?: string | null }): boolean {
  return HIDDEN_RMS_FIELD_CODES.has(String(field.code ?? ''));
}

export function DynamicStepFields({
  fields,
  values,
  onChange,
  disabled,
  readOnlyCodes,
  maxMonto,
  maxMontoLabel = 'suma asegurada RMS',
}: DynamicStepFieldsProps) {
  const sorted = [...fields]
    .filter((f) => !isHiddenRmsField(f))
    .sort((a, b) => a.display_order - b.display_order);
  const lockedSet =
    readOnlyCodes instanceof Set
      ? readOnlyCodes
      : new Set(readOnlyCodes ?? []);
  const montoCap =
    maxMonto != null && Number.isFinite(Number(maxMonto)) && Number(maxMonto) > 0
      ? Number(maxMonto)
      : null;

  return (
    <div className="grid gap-form-gap lg:grid-cols-2">
      {sorted.map((field) => {
        const type = fieldTypeOf(field);
        const value = values[field.code] ?? '';
        const colSpan = type === 'TEXTAREA' ? 'lg:col-span-2' : '';
        const lockedCedula =
          lockedSet.has(field.code) || isCedulaField(field);
        const fieldDisabled = Boolean(disabled || lockedCedula);
        const montoField = isMontoField(field);
        const asNumber = type === 'NUMBER' || montoField;
        const isTextLike =
          !['TEXTAREA', 'SELECT', 'BOOLEAN', 'DATE', 'NUMBER'].includes(type) &&
          !montoField;

        const emitMonto = (raw: string) => {
          onChange(field.code, raw);
        };

        return (
          <div key={field.id} className={colSpan}>
            <Label>
              {field.name}
              {field.required ? ' *' : ''}
            </Label>

            {lockedCedula && isTextLike ? (
              <>
                <CedulaInput
                  value={value}
                  disabled
                  readOnly
                  tabIndex={-1}
                  onChange={() => undefined}
                  className="pointer-events-none select-none"
                />
                <p className="mt-1 text-[11px] text-on-surface-variant">
                  Solo lectura: se toma del beneficiario seleccionado.
                </p>
              </>
            ) : (
              <>
                {type === 'TEXTAREA' && (
                  <Textarea
                    rows={4}
                    value={value}
                    disabled={fieldDisabled}
                    readOnly={lockedCedula}
                    placeholder={field.descripcion ?? undefined}
                    onChange={(e) => {
                      if (lockedCedula) return;
                      onChange(field.code, e.target.value);
                    }}
                  />
                )}
                {type === 'SELECT' && (
                  <Select
                    value={value}
                    disabled={fieldDisabled}
                    onChange={(e) => {
                      if (lockedCedula) return;
                      onChange(field.code, e.target.value);
                    }}
                  >
                    <option value="">Seleccione…</option>
                    {parseSelectOptions(field.descripcion).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                )}
                {type === 'BOOLEAN' && (
                  <label className="mt-2 flex items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      checked={value === 'true'}
                      disabled={fieldDisabled}
                      onChange={(e) => {
                        if (lockedCedula) return;
                        onChange(field.code, e.target.checked ? 'true' : 'false');
                      }}
                    />
                    {field.descripcion ?? 'Sí'}
                  </label>
                )}
                {type === 'DATE' && (
                  <Input
                    type="date"
                    value={value}
                    disabled={fieldDisabled}
                    readOnly={lockedCedula}
                    onChange={(e) => {
                      if (lockedCedula) return;
                      onChange(field.code, e.target.value);
                    }}
                  />
                )}
                {asNumber && (
                  <>
                    <MontoInput
                      value={value}
                      disabled={fieldDisabled}
                      readOnly={lockedCedula}
                      onChange={(raw) => {
                        if (lockedCedula) return;
                        emitMonto(raw);
                      }}
                    />
                    <p className="mt-1 text-[11px] text-on-surface-variant">
                      {field.descripcion
                        ? `${field.descripcion}`
                        : null}
                      {montoField && montoCap != null
                        ? `${field.descripcion ? ' · ' : ''}Máximo: ${maxMontoLabel} ${formatMontoField(montoCap)}`
                        : null}
                    </p>
                  </>
                )}
                {isTextLike && (
                  <Input
                    value={value}
                    disabled={fieldDisabled}
                    readOnly={lockedCedula}
                    placeholder={field.descripcion ?? undefined}
                    onChange={(e) => {
                      if (lockedCedula) return;
                      onChange(field.code, e.target.value);
                    }}
                  />
                )}
                {lockedCedula && (
                  <p className="mt-1 text-[11px] text-on-surface-variant">
                    Solo lectura: se toma del beneficiario seleccionado.
                  </p>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
