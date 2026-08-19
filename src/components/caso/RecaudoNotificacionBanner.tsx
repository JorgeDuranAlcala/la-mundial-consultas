import { BellRing, CheckCircle2 } from 'lucide-react';

interface RecaudoNotificacionBannerProps {
  estado?: 'info' | 'confirmado';
}

export function RecaudoNotificacionBanner({
  estado = 'info',
}: RecaudoNotificacionBannerProps) {
  if (estado === 'confirmado') {
    return (
      <div
        role="status"
        className="flex items-start gap-2 rounded-xl border border-success/40 bg-success-container/40 px-3 py-2 text-[12px] text-on-surface"
      >
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        <p className="leading-snug">
          Se notificó al asegurado por correo electrónico.
        </p>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 py-2 text-[12px] text-on-surface-variant"
    >
      <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
      <p className="leading-snug">
        El asegurado será notificado por correo electrónico automáticamente.
      </p>
    </div>
  );
}
