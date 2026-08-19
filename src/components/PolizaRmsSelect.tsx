import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Label, Select } from '@/components/ui/Input';
import { ValidationAlert } from '@/components/ui/ValidationAlert';
import {
  fetchRmsPolizasByCedula,
  formatVigenciaPoliza,
  parseCedulaForRmsPoliza,
  type RmsPolizaItem,
} from '@/lib/rms-poliza-api';

interface PolizaRmsSelectProps {
  cedula: string | null | undefined;
  value: RmsPolizaItem | null;
  onChange: (poliza: RmsPolizaItem | null) => void;
  disabled?: boolean;
}

export function PolizaRmsSelect({
  cedula,
  value,
  onChange,
  disabled = false,
}: PolizaRmsSelectProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RmsPolizaItem[]>([]);

  useEffect(() => {
    const parsed = cedula ? parseCedulaForRmsPoliza(cedula) : null;
    if (!parsed) {
      setItems([]);
      setError(null);
      onChange(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const list = await fetchRmsPolizasByCedula(parsed);
        if (cancelled) return;
        setItems(list);
        if (list.length === 1) {
          onChange(list[0]);
        } else if (
          value &&
          !list.some(
            (p) =>
              p.serialcontrato === value.serialcontrato &&
              p.serialcertif === value.serialcertif,
          )
        ) {
          onChange(null);
        }
      } catch (err) {
        if (cancelled) return;
        setItems([]);
        onChange(null);
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudieron cargar las pólizas desde La Mundial (RMS)',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Solo al cambiar cédula
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cedula]);

  const selectedKey = value
    ? `${value.serialcontrato}-${value.serialcertif}`
    : '';

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="rms-poliza">Póliza (La Mundial / RMS) *</Label>
        <Select
          id="rms-poliza"
          value={selectedKey}
          disabled={disabled || loading || items.length === 0}
          onChange={(e) => {
            const next = items.find(
              (p) => `${p.serialcontrato}-${p.serialcertif}` === e.target.value,
            );
            onChange(next ?? null);
          }}
        >
          <option value="">
            {loading ? 'Cargando pólizas…' : 'Seleccione una póliza'}
          </option>
          {items.map((p) => (
            <option
              key={`${p.serialcontrato}-${p.serialcertif}`}
              value={`${p.serialcontrato}-${p.serialcertif}`}
            >
              {p.label}
            </option>
          ))}
        </Select>
        <p className="mt-1.5 text-[12px] text-on-surface-variant">
          Listado desde La Mundial (RMS). No usa pólizas del portal.
          {cedula ? ` Cédula: ${cedula}.` : ''}
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-[13px] text-on-surface-variant">
          <Loader2 className="h-4 w-4 animate-spin" />
          Consultando pólizas en La Mundial…
        </div>
      )}

      {!loading && !error && items.length === 0 && cedula && (
        <ValidationAlert messages="No hay pólizas vigentes en RMS para esta cédula." />
      )}

      {error && <ValidationAlert messages={error} />}

      {value && (
        <div className="rounded-2xl border border-success-container bg-success-container/60 p-4 text-[13px] text-on-success-container">
          <p className="font-bold">Póliza seleccionada</p>
          <p className="mt-1">
            Póliza {value.numeroPoliza} · Certificado {value.certificado}
          </p>
          <p className="mt-1 font-semibold">
            Vigencia de la póliza:{' '}
            {formatVigenciaPoliza(value.fechaInicio, value.fechaFin)}
          </p>
          <p className="mt-1">
            Suma asegurada: {value.sumaAsegurada.toLocaleString('es-VE', {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>
      )}
    </div>
  );
}
