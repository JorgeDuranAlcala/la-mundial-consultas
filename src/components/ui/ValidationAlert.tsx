import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationAlertProps {
  messages: string | string[];
  title?: string;
  className?: string;
}

export function ValidationAlert({
  messages,
  title = 'No puede continuar hasta completar lo siguiente',
  className,
}: ValidationAlertProps) {
  const items = (Array.isArray(messages) ? messages : [messages]).filter(Boolean);
  if (!items.length) return null;

  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 rounded-xl border-2 border-error/50 bg-error-container px-4 py-3 text-on-error-container shadow-sm',
        className,
      )}
    >
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-[13px] font-bold leading-snug">{title}</p>
        {items.length === 1 ? (
          <p className="text-[13px] leading-snug">{items[0]}</p>
        ) : (
          <ul className="list-inside list-disc space-y-1 text-[13px] leading-snug">
            {items.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface SuccessAlertProps {
  messages: string | string[];
  title?: string;
  className?: string;
}

export function SuccessAlert({
  messages,
  title = 'Acción registrada',
  className,
}: SuccessAlertProps) {
  const items = (Array.isArray(messages) ? messages : [messages]).filter(Boolean);
  if (!items.length) return null;

  return (
    <div
      role="status"
      className={cn(
        'flex gap-3 rounded-xl border-2 border-success/50 bg-success-container px-4 py-3 text-on-success-container shadow-sm',
        className,
      )}
    >
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-[13px] font-bold leading-snug">{title}</p>
        {items.length === 1 ? (
          <p className="text-[13px] leading-snug">{items[0]}</p>
        ) : (
          <ul className="list-inside list-disc space-y-1 text-[13px] leading-snug">
            {items.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
