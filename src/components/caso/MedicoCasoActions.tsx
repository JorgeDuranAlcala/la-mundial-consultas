import { useState } from 'react';
import { CheckCircle2, Loader2, Stethoscope, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ValidationAlert } from '@/components/ui/ValidationAlert';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Label, Textarea } from '@/components/ui/Input';
import type { CasoCompletoApi } from '@/lib/caso-detail-api';
import { mapEstadoToStatus } from '@/lib/caso-mappers';
import { useAppStore } from '@/stores/useStore';

export type MedicoActionFeedback = {
  type: 'success' | 'error';
  message: string;
};

interface MedicoCasoActionsProps {
  data: CasoCompletoApi;
  usuarioId?: number;
  onUpdated: (feedback?: MedicoActionFeedback) => void;
}

const MEDICO_ACTION_STATUSES = new Set([
  'analisis-medico',
  'analisis',
  'pendiente',
  'recaudo-pendiente',
]);

export function MedicoCasoActions({ data, usuarioId, onUpdated }: MedicoCasoActionsProps) {
  const updateCasoStatus = useAppStore((s) => s.updateCasoStatus);
  const [loading, setLoading] = useState<'recaudo' | 'rechazado' | 'aprobado' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');

  const status = mapEstadoToStatus(data.caso.estadoActualCod);
  if (!MEDICO_ACTION_STATUSES.has(status)) return null;

  const handleStatus = async (
    action: 'recaudo' | 'rechazado' | 'aprobado',
    statusTarget: 'recaudo-pendiente' | 'rechazado' | 'aprobado',
    defaultNotes: string,
  ) => {
    const notes = motivo.trim() || defaultNotes;
    if (action === 'rechazado' && !motivo.trim()) {
      setError('Indique el motivo del rechazo antes de continuar.');
      return;
    }
    if (action === 'recaudo' && !motivo.trim()) {
      setError('Indique qué recaudos adicionales solicita.');
      return;
    }

    const confirmLabel =
      action === 'aprobado'
        ? '¿Confirma aprobar esta solicitud?'
        : action === 'rechazado'
          ? '¿Confirma rechazar esta solicitud?'
          : '¿Confirma solicitar recaudos adicionales?';
    if (!window.confirm(confirmLabel)) return;

    setLoading(action);
    setError(null);
    setSuccess(null);
    try {
      await updateCasoStatus(data.caso.id, statusTarget, notes, usuarioId);
      const messages = {
        aprobado: 'Solicitud aprobada correctamente.',
        rechazado: 'Solicitud rechazada correctamente.',
        recaudo: 'Solicitud de recaudos registrada. El caso permanece en esta pantalla.',
      } as const;
      const message = messages[action];
      setSuccess(message);
      setMotivo('');
      onUpdated({ type: 'success', message });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo actualizar el caso';
      setError(message);
      onUpdated({ type: 'error', message });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="border-accent/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-accent" />
          <h2 className="section-title">Evaluación médica</h2>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-[13px] text-on-surface-variant">
          Revise los documentos y el detalle del caso antes de tomar una decisión.
        </p>

        <div>
          <Label htmlFor="motivo-medico">Observación / recaudos solicitados</Label>
          <Textarea
            id="motivo-medico"
            rows={3}
            placeholder="Ej.: Falta informe médico legible y factura con RIF visible…"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            disabled={loading !== null}
          />
        </div>

        {error && (
          <ValidationAlert title="No se pudo completar la acción" messages={error} />
        )}
        {success && (
          <div
            role="status"
            className="rounded-xl border border-success/40 bg-success-container/40 px-4 py-3 text-[13px] font-medium text-on-surface"
          >
            {success}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={loading !== null}
            onClick={() =>
              void handleStatus(
                'recaudo',
                'recaudo-pendiente',
                'Médico solicita recaudos adicionales',
              )
            }
          >
            {loading === 'recaudo' ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : null}
            Solicitar recaudos
          </Button>
          <Button
            variant="danger"
            disabled={loading !== null}
            onClick={() => void handleStatus('rechazado', 'rechazado', 'Rechazo médico auditor')}
          >
            {loading === 'rechazado' ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-1 h-4 w-4" />
            )}
            Rechazar
          </Button>
          <Button
            disabled={loading !== null}
            onClick={() =>
              void handleStatus('aprobado', 'aprobado', 'Aprobado por médico auditor')
            }
          >
            {loading === 'aprobado' ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-1 h-4 w-4" />
            )}
            Aprobar
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
