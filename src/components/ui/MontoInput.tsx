import { Input } from '@/components/ui/Input';
import {
  formatMontoField,
  parseLocaleNumber,
  parseLocaleNumberInput,
} from '@/lib/locale-number';
import type { InputHTMLAttributes } from 'react';

type MontoInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  /** Valor numérico interno (ej. "10000" o "10000.50"). */
  value: string;
  onChange: (rawValue: string) => void;
};

export function MontoInput({
  value,
  onChange,
  disabled,
  readOnly,
  placeholder = '0.00',
  onBlur,
  ...props
}: MontoInputProps) {
  const displayValue = formatMontoField(value);

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={displayValue}
      disabled={disabled}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(e) => {
        if (readOnly) return;
        onChange(parseLocaleNumberInput(e.target.value));
      }}
      onBlur={(e) => {
        if (!readOnly && value !== '') {
          const n = parseLocaleNumber(e.target.value);
          if (n != null) {
            onChange(n.toFixed(2));
          } else {
            onChange(parseLocaleNumberInput(e.target.value));
          }
        }
        onBlur?.(e);
      }}
    />
  );
}
