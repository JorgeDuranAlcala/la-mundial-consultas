import { cn } from '@/lib/utils';
import { STATUS_LABELS, type RequestStatus } from '@/lib/types';

const styles: Record<RequestStatus, string> = {
  pendiente: 'chip-pending',
  analisis: 'chip-info',
  'recaudo-pendiente': 'chip-warning',
  'analisis-medico': 'chip-active',
  aprobado: 'chip-success',
  rechazado: 'chip-error',
  liquidada: 'chip-success',
  activa: 'chip-info',
  finalizada: 'chip-pending',
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <span className={cn(styles[status])}>{STATUS_LABELS[status]}</span>;
}
