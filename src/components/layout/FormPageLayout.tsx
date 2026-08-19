import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormPageLayoutProps {
  header: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
  /** Contenido a ancho completo entre el header y el grid (p. ej. stepper) */
  topContent?: ReactNode;
  /** Formulario centrado en una sola columna (páginas simples) */
  centered?: boolean;
  className?: string;
}

export function FormPageLayout({
  header,
  children,
  aside,
  topContent,
  centered = false,
  className,
}: FormPageLayoutProps) {
  if (centered) {
    return (
      <div className={cn('step-enter mx-auto w-full max-w-3xl', className)}>
        {header}
        {topContent}
        {children}
      </div>
    );
  }

  return (
    <div className={cn('step-enter w-full', className)}>
      {header}
      {topContent}

      <div
        className={cn(
          'grid gap-6',
          aside ? 'lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start' : 'grid-cols-1',
        )}
      >
        <div className="min-w-0">{children}</div>
        {aside && <div className="min-w-0">{aside}</div>}
      </div>
    </div>
  );
}
