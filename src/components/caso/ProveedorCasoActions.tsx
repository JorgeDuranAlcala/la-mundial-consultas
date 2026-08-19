import { useState } from 'react';
import { CheckCircle2, Loader2, PlayCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ValidationAlert } from '@/components/ui/ValidationAlert';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import type { CasoCompletoApi } from '@/lib/caso-detail-api';
import {
  activarCasoPorProveedor,
  completarServicioPorProveedor,
  puedeActivarPorProveedor,
  puedeCompletarPorProveedor,
} from '@/lib/caso-proveedor-api';
import { DocumentUpload } from '@/components/DocumentUpload';
import { uploadCasoDocument } from '@/lib/documents-api';

interface ProveedorCasoActionsProps {
  data: CasoCompletoApi;
  usuarioId?: number;
  onUpdated: (data: CasoCompletoApi) => void;
  onRefreshList?: () => void;
}

export function ProveedorCasoActions({
  data,
  usuarioId,
  onUpdated,
  onRefreshList,
}: ProveedorCasoActionsProps) {
  const [activating, setActivating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [observacion, setObservacion] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Egreso document files
  const [facturaFile, setFacturaFile] = useState<File | null>(null);
  const [informeFile, setInformeFile] = useState<File | null>(null);
  const [detalleFile, setDetalleFile] = useState<File | null>(null);

  const canActivate = puedeActivarPorProveedor(data);
  const canComplete = puedeCompletarPorProveedor(data);

  if (!canActivate && !canComplete) return null;

  const handleActivate = async () => {
    if (!window.confirm('¿Confirma que desea activar este servicio?')) return;
    setActivating(true);
    setError(null);
    try {
      const updated = await activarCasoPorProveedor(data.caso.id);
      onUpdated(updated);
      onRefreshList?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo activar el servicio');
    } finally {
      setActivating(false);
    }
  };

  const handleComplete = async (completado: boolean) => {
    if (completado) {
      if (!facturaFile || !informeFile || !detalleFile) {
        setError('Debe cargar todos los documentos obligatorios de egreso (Factura, Informe de Egreso y Detalle de Cargos).');
        return;
      }
    }

    const mensaje = completado
      ? '¿Confirma que el servicio fue completado? Se registrará la solicitud de egreso y los recaudos cargados.'
      : '¿Indica que el servicio aún no ha sido completado?';
    if (!window.confirm(mensaje)) return;

    setCompleting(true);
    setError(null);
    try {
      if (completado) {
        // Upload the documents first
        await uploadCasoDocument(data.caso.id, data.caso.companiaId, 'FACTURA_EGRESO', facturaFile!, usuarioId);
        await uploadCasoDocument(data.caso.id, data.caso.companiaId, 'INFORME_EGRESO', informeFile!, usuarioId);
        await uploadCasoDocument(data.caso.id, data.caso.companiaId, 'DETALLE_CARGOS', detalleFile!, usuarioId);
      }

      const updated = await completarServicioPorProveedor(data.caso.id, {
        completado,
        observacion: observacion.trim() || undefined,
        usuarioId,
      });
      onUpdated(updated);
      onRefreshList?.();
      if (!completado) {
        setObservacion('');
      } else {
        setFacturaFile(null);
        setInformeFile(null);
        setDetalleFile(null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo registrar el estado del servicio',
      );
    } finally {
      setCompleting(false);
    }
  };

  return (
    <Card className="border-secondary/40">
      <CardHeader>
        <h2 className="section-title">Acciones del proveedor</h2>
      </CardHeader>
      <CardBody className="space-y-4">
        {canActivate && (
          <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-4">
            <p className="text-[13px] text-on-surface">
              Este servicio está listo para activación. Al activarlo quedará disponible para su
              ejecución.
            </p>
            <Button
              className="mt-3"
              disabled={activating || completing}
              onClick={() => void handleActivate()}
            >
              {activating ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="mr-1.5 h-4 w-4" />
              )}
              Activar servicio
            </Button>
          </div>
        )}

        {canComplete && (
          <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-4 space-y-4">
            <p className="text-[13px] text-on-surface">
              El servicio ya fue activado. Indique si la atención fue completada para finalizar la
              solicitud.
            </p>

            {/* Documentos de Egreso */}
            <div className="space-y-2 border-t border-outline-variant/40 pt-3">
              <p className="text-xs font-bold text-primary uppercase">Cargar Documentos de Egreso (Obligatorios)</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <DocumentUpload
                  label="Factura de Egreso"
                  tipoDocumentoCod="FACTURA_EGRESO"
                  file={facturaFile}
                  onFileSelect={setFacturaFile}
                  disabled={completing || activating}
                />
                <DocumentUpload
                  label="Informe de Egreso / Epicrisis"
                  tipoDocumentoCod="INFORME_EGRESO"
                  file={informeFile}
                  onFileSelect={setInformeFile}
                  disabled={completing || activating}
                />
                <DocumentUpload
                  label="Detalle de Cargos"
                  tipoDocumentoCod="DETALLE_CARGOS"
                  file={detalleFile}
                  onFileSelect={setDetalleFile}
                  disabled={completing || activating}
                />
              </div>
            </div>

            <label className="block text-[12px] font-semibold text-on-surface-variant pt-2 border-t border-outline-variant/40">
              Observación (opcional)
              <textarea
                className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[13px] text-on-surface"
                rows={2}
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                placeholder="Comentario sobre la ejecución del servicio"
                disabled={completing || activating}
              />
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                disabled={completing || activating}
                onClick={() => void handleComplete(true)}
              >
                {completing ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                )}
                Servicio completado
              </Button>
              <Button
                variant="outline"
                disabled={completing || activating}
                onClick={() => void handleComplete(false)}
              >
                <XCircle className="mr-1.5 h-4 w-4" />
                Aún no completado
              </Button>
            </div>
          </div>
        )}

        {error && <ValidationAlert messages={error} />}
      </CardBody>
    </Card>
  );
}
