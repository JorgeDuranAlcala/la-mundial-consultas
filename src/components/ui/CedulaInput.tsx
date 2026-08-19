import { cn } from '@/lib/utils';
import type { InputHTMLAttributes } from 'react';

const TIPOS_CEDULA = ['V', 'E'] as const;
export type TipoCedula = (typeof TIPOS_CEDULA)[number];

export interface CedulaInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** Valor completo (ej. V-12345678) o solo dígitos. */
  value: string;
  onChange: (value: string) => void;
  /** Tipos permitidos. Por defecto V y E. */
  tipos?: readonly TipoCedula[];
}

/** Extrae solo los dígitos del número de documento. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

/** Parsea un valor de cédula en tipo + número. */
export function splitCedulaValue(value: string): { tipo: TipoCedula; numero: string } {
  const trimmed = value.trim().toUpperCase();
  const match = trimmed.match(/^([VE])[-.\s|]?([\d.]*)$/);
  if (match) {
    return { tipo: match[1] as TipoCedula, numero: digitsOnly(match[2]) };
  }
  return { tipo: 'V', numero: digitsOnly(trimmed) };
}

/** Formato canónico V-12345678 para enviar a parseDocumentForRms. */
export function formatCedulaValue(tipo: TipoCedula | string, numero: string): string {
  const digits = digitsOnly(numero);
  if (!digits) return '';
  return `${String(tipo).toUpperCase().slice(0, 1)}-${digits}`;
}

/**
 * Máscara de cédula: el usuario solo escribe el número.
 * Prefijo fijo V/E (sin correlativo; siempre 0 en backend).
 */
export function CedulaInput({
  value,
  onChange,
  tipos = TIPOS_CEDULA,
  className,
  id,
  disabled,
  readOnly,
  required,
  placeholder = '12.345.678',
  ...rest
}: CedulaInputProps) {
  const { tipo, numero } = splitCedulaValue(value);
  const safeTipo = (tipos.includes(tipo as TipoCedula) ? tipo : tipos[0]) as TipoCedula;
  const locked = Boolean(disabled || readOnly);

  const emit = (nextTipo: TipoCedula, nextNumero: string) => {
    if (locked) return;
    onChange(formatCedulaValue(nextTipo, nextNumero));
  };

  return (
    <div
      className={cn(
        'input-base flex items-stretch gap-0 overflow-hidden p-0 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20',
        locked && 'pointer-events-none opacity-60',
        className,
      )}
      aria-disabled={locked || undefined}
    >
      <select
        aria-label="Tipo de documento"
        className="shrink-0 border-0 bg-surface-container-low px-3 text-[14px] font-semibold text-primary outline-none"
        value={safeTipo}
        disabled={locked}
        onChange={(e) => emit(e.target.value as TipoCedula, numero)}
      >
        {tipos.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className="flex items-center border-x border-outline-variant/50 bg-surface-container-low px-2 text-[14px] font-semibold text-on-surface-variant"
      >
        -
      </span>
      <input
        {...rest}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={locked}
        readOnly={locked}
        required={required}
        placeholder={placeholder}
        className="min-w-0 flex-1 border-0 bg-transparent px-3 py-0 text-[14px] outline-none"
        value={numero}
        onChange={(e) => emit(safeTipo, digitsOnly(e.target.value))}
      />
    </div>
  );
}
