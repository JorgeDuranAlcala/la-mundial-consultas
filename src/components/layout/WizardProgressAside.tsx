import { Bot, Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardProgressAsideProps {
  steps: string[];
  current: number;
  serviceTitle: string;
  beneficiaryName?: string;
  policyNumber?: string;
  sumaAsegurada?: number | null;
  vigenciaPoliza?: string | null;
}

export function WizardProgressAside({
  steps,
  current,
  serviceTitle,
  beneficiaryName,
  policyNumber,
  sumaAsegurada,
  vigenciaPoliza,
}: WizardProgressAsideProps) {
  const progress = Math.round(((current + 1) / steps.length) * 100);

  return (
    <aside className="space-y-4 lg:sticky lg:top-24">
      <div className="surface-card p-5">
        <p className="text-[10px] font-bold tracking-[0.18em] text-on-surface-variant uppercase">
          Progreso del trámite
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-dim">
          <div
            className="h-full rounded-full bg-gradient-to-r from-secondary via-brand-light to-accent transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-[12px] font-semibold text-on-surface">
          Paso {current + 1} de {steps.length}
        </p>

        <ol className="mt-5 space-y-0">
          {steps.map((step, i) => {
            const done = i < current;
            const active = i === current;
            const isLast = i === steps.length - 1;

            return (
              <li key={step} className="relative flex gap-3 pb-4 last:pb-0">
                {!isLast && (
                  <span
                    className={cn(
                      'absolute top-7 left-[13px] h-[calc(100%-12px)] w-px',
                      done ? 'bg-success' : 'bg-surface-dim',
                    )}
                  />
                )}
                <span
                  className={cn(
                    'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold',
                    done && 'border-success bg-success text-white',
                    active && 'border-primary bg-primary text-white shadow-elev-primary',
                    !done && !active && 'border-surface-dim bg-surface-container-lowest text-on-surface-variant',
                  )}
                >
                  {done ? <Check size={12} strokeWidth={3} /> : active ? i + 1 : <Circle size={10} />}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p
                    className={cn(
                      'text-[12px] font-bold leading-tight',
                      active ? 'text-primary' : done ? 'text-on-surface' : 'text-on-surface-variant',
                    )}
                  >
                    {step}
                  </p>
                  {active && (
                    <p className="mt-0.5 text-[11px] text-on-surface-variant">En curso</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="surface-card p-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-fixed text-primary">
            <Bot size={16} strokeWidth={2.2} />
          </div>
          <p className="text-[13px] font-bold text-on-surface">Validación con IA</p>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-on-surface-variant">
          Tras enviar, el motor IA revisará documentos, cobertura RMS y decidirá si escala a médico
          humano.
        </p>
        <dl className="mt-4 space-y-2 border-t border-outline-variant/60 pt-4 text-[12px]">
          <div className="flex justify-between gap-3">
            <dt className="text-on-surface-variant">Servicio</dt>
            <dd className="text-right font-semibold text-on-surface">{serviceTitle}</dd>
          </div>
          {beneficiaryName && (
            <div className="flex justify-between gap-3">
              <dt className="text-on-surface-variant">Beneficiario</dt>
              <dd className="text-right font-semibold text-on-surface">{beneficiaryName}</dd>
            </div>
          )}
          {policyNumber && (
            <div className="flex justify-between gap-3">
              <dt className="text-on-surface-variant">Póliza RMS</dt>
              <dd className="text-right font-semibold text-on-surface">{policyNumber}</dd>
            </div>
          )}
          {sumaAsegurada != null && (
            <div className="flex justify-between gap-3">
              <dt className="text-on-surface-variant">Suma asegurada</dt>
              <dd className="text-right font-semibold text-on-surface">
                {sumaAsegurada.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </dd>
            </div>
          )}
          {vigenciaPoliza && (
            <div className="flex justify-between gap-3">
              <dt className="text-on-surface-variant">Vigencia de la póliza</dt>
              <dd className="text-right font-semibold text-on-surface">{vigenciaPoliza}</dd>
            </div>
          )}
        </dl>
      </div>
    </aside>
  );
}

export function FormHelpAside({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: string }[];
}) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-24">
      <div className="surface-card p-5">
        <p className="text-[10px] font-bold tracking-[0.18em] text-on-surface-variant uppercase">
          Información
        </p>
        <p className="mt-2 text-[13px] font-bold text-on-surface">{title}</p>
        <dl className="mt-4 space-y-3">
          {items.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-[11px] text-on-surface-variant">{label}</dt>
              <dd className="mt-0.5 text-[12px] font-semibold text-on-surface">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </aside>
  );
}
