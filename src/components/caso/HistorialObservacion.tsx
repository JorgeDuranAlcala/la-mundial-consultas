import { AlertTriangle, CheckCircle2, FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseDocumentValidationSummary } from '@/lib/parse-document-validation-summary';

interface HistorialObservacionProps {
  observacion: string;
  docLabels?: Record<string, string>;
  compact?: boolean;
}

export function HistorialObservacion({
  observacion,
  docLabels = {},
  compact = false,
}: HistorialObservacionProps) {
  const parsed = parseDocumentValidationSummary(observacion);

  if (!parsed.isDocumentValidation) {
    const isSuccess = observacion.toLowerCase().includes('validados') &&
      observacion.toLowerCase().includes('conformes');

    return (
      <p
        className={cn(
          'mt-1 text-[12px] leading-snug',
          isSuccess ? 'font-medium text-success' : 'text-on-surface',
        )}
      >
        {observacion}
      </p>
    );
  }

  return (
    <div className={cn('mt-2 space-y-2', compact && 'mt-1.5')}>
      <p className="text-[12px] font-medium text-on-surface-variant">{parsed.intro}</p>
      <ul className="space-y-2">
        {parsed.items.map((item) => {
          const label = docLabels[item.codigo] ?? item.codigo.replace(/_/g, ' ');
          return (
            <li
              key={item.codigo}
              className="rounded-xl border border-accent/25 bg-accent-container/20 p-3"
            >
              <div className="flex items-start gap-2">
                <FileWarning
                  className="mt-0.5 h-4 w-4 shrink-0 text-accent-dark"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-on-surface">{label}</p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-wide text-on-surface-variant/80">
                    {item.codigo}
                  </p>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-on-surface">
                    {item.mensaje}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface DocumentValidationResultCardProps {
  codigo: string;
  label: string;
  nombreArchivo?: string;
  resultadoCod: string;
  esLegible?: boolean | null;
  esConforme?: boolean | null;
  observaciones?: string | null;
}

export function DocumentValidationResultCard({
  codigo,
  label,
  nombreArchivo,
  resultadoCod,
  esLegible,
  esConforme,
  observaciones,
}: DocumentValidationResultCardProps) {
  const ok =
    resultadoCod === 'CORRECTO' &&
    esConforme === true &&
    esLegible !== false;
  const Icon = ok ? CheckCircle2 : AlertTriangle;

  return (
    <div
      className={cn(
        'rounded-xl border p-4 text-[13px]',
        ok
          ? 'border-success/30 bg-success-container/20'
          : 'border-accent/30 bg-accent-container/15',
      )}
    >
      <div className="flex items-start gap-3">
        <Icon
          className={cn('mt-0.5 h-5 w-5 shrink-0', ok ? 'text-success' : 'text-accent-dark')}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-on-surface">{label}</p>
            <span className={ok ? 'chip-success' : 'chip-warning'}>
              {ok ? 'Conforme' : 'Revisar'}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] uppercase tracking-wide text-on-surface-variant">
            {codigo}
          </p>
          {nombreArchivo && (
            <p className="mt-1 truncate text-[12px] text-primary">{nombreArchivo}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-3 text-[12px] text-on-surface-variant">
            <span>Legible: {esLegible ? 'Sí' : 'No'}</span>
            <span>Conforme: {esConforme ? 'Sí' : 'No'}</span>
          </div>
          {observaciones && (
            <p className="mt-2 rounded-lg bg-surface/60 px-3 py-2 text-[12px] leading-relaxed text-on-surface">
              {observaciones}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
