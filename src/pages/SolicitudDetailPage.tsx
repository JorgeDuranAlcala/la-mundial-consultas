import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  ClipboardList,
  Download,
  Eye,
  FileText,
  History,
  Loader2,
  Workflow,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { PaginatedDataView } from '@/components/PaginatedDataView';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ValidationAlert, SuccessAlert } from '@/components/ui/ValidationAlert';
import {
  formatCedula,
  mapEstadoToStatus,
  mapTipoServicioToServiceType,
} from '@/lib/caso-mappers';
import { getCasoCompleto, type CasoCompletoApi } from '@/lib/caso-detail-api';
import { downloadCasoDocument, viewCasoDocument, canPreviewDocument } from '@/lib/document-download';
import { SERVICE_LABELS } from '@/lib/types';
import { useAuth, useAppStore } from '@/stores/useStore';
import { ProveedorCasoActions } from '@/components/caso/ProveedorCasoActions';
import { DocumentUpload } from '@/components/DocumentUpload';
import { uploadCasoDocument } from '@/lib/documents-api';
import { validarDocumentosIa } from '@/lib/casos-api';
import { MedicoCasoActions } from '@/components/caso/MedicoCasoActions';
import { RmsIntegracionCasoPanel } from '@/components/caso/RmsIntegracionCasoPanel';
import {
  DocumentValidationResultCard,
  HistorialObservacion,
} from '@/components/caso/HistorialObservacion';
import { buildDocumentLabelMap } from '@/lib/parse-document-validation-summary';
import {
  getNotaMedicoRecaudo,
  sugerirTipoDocumento,
} from '@/lib/recaudo-note';
import { RecaudoNotificacionBanner } from '@/components/caso/RecaudoNotificacionBanner';
import { formatVigenciaPoliza } from '@/lib/rms-poliza-api';

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-VE', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function formatBytes(bytes?: number | null): string {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="min-w-[140px] text-[12px] font-semibold uppercase tracking-wide text-on-surface-variant">
        {label}
      </dt>
      <dd className="text-[13px] text-on-surface">{value}</dd>
    </div>
  );
}

export function SolicitudDetailPage() {
  const { casoId: casoIdParam } = useParams<{ casoId: string }>();
  const casoId = Number(casoIdParam);
  const { user } = useAuth();
  const refreshCasos = useAppStore((s) => s.refreshCasos);

  const [data, setData] = useState<CasoCompletoApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);

  const [subiendoRecaudo, setSubiendoRecaudo] = useState(false);
  const [tipoRecaudo, setTipoRecaudo] = useState('');
  const [tipoTouched, setTipoTouched] = useState(false);
  const [recaudoFile, setRecaudoFile] = useState<File | null>(null);
  const [recaudoError, setRecaudoError] = useState<string | null>(null);
  const [recaudoSuccess, setRecaudoSuccess] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const backPath = user?.role === 'medico' ? '/app/cola-medica' : '/app/solicitudes';
  const backLabel = user?.role === 'medico' ? 'Cola médica' : 'Solicitudes';

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!Number.isFinite(casoId)) {
      setError('Identificador de caso inválido');
      setLoading(false);
      return;
    }
    if (!opts?.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await getCasoCompleto(casoId);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el detalle');
      if (!opts?.silent) setData(null);
    } finally {
      setLoading(false);
    }
  }, [casoId]);

  useEffect(() => {
    setActionFeedback(null);
    void load();
  }, [casoId, load]);

  const handleDownload = async (docId: number) => {
    const doc = data?.documentos.find((d) => d.id === docId);
    if (!doc) return;
    setDownloadingId(docId);
    try {
      await downloadCasoDocument(doc);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo descargar el archivo');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleView = async (docId: number) => {
    const doc = data?.documentos.find((d) => d.id === docId);
    if (!doc) return;
    setViewingId(docId);
    try {
      await viewCasoDocument(doc);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo abrir el archivo');
    } finally {
      setViewingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-on-surface-variant">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Cargando detalle del caso…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="step-enter">
        <PageHeader
          title="Detalle de solicitud"
          icon={ClipboardList}
          breadcrumbs={[
            { label: 'Inicio', to: '/app' },
            { label: backLabel, to: backPath },
            { label: 'Detalle' },
          ]}
        />
        <Card>
          <CardBody className="space-y-4 py-10 text-center">
            <p className="text-error">{error ?? 'Caso no encontrado'}</p>
            <Link to={backPath} className="btn-outline inline-flex">
              Volver al listado
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  const { caso } = data;
  const serviceType = mapTipoServicioToServiceType(caso.tipoServicioCod);
  const status = mapEstadoToStatus(caso.estadoActualCod);
  const beneficiary = caso.beneficiario;
  const monto =
    caso.extension?.montoSolicitado ??
    data.reembolso?.montoSolicitado ??
    caso.extension?.montoAprobado ??
    data.reembolso?.montoAprobado;

  const sortedSteps = [...data.stepProgreso].sort(
    (a, b) => (a.serviceStep?.display_order ?? 0) - (b.serviceStep?.display_order ?? 0),
  );
  const vigenteDocs = data.documentos.filter((d) => d.esVigente !== false);
  const iaValidaciones = (data.validaciones ?? []).filter((v) => v.etapa === 'VALIDACION_IA');
  const valorStep = (code: string) =>
    data.stepDatos.find((d) => d.serviceStepField?.code === code)?.valor ?? undefined;
  const vigenciaPoliza = formatVigenciaPoliza(
    valorStep('RMS_FECHA_INICIO') || caso.poliza?.fechaInicioVigencia,
    valorStep('RMS_FECHA_FIN') || caso.poliza?.fechaFinVigencia,
  );
  const muestraVigencia =
    Boolean(valorStep('RMS_FECHA_INICIO') || valorStep('RMS_FECHA_FIN')) ||
    Boolean(caso.poliza?.fechaInicioVigencia || caso.poliza?.fechaFinVigencia);
  const docLabels = buildDocumentLabelMap(data.documentos);
  const notaMedico = getNotaMedicoRecaudo(data.historial);
  const tipoSugerido = notaMedico ? sugerirTipoDocumento(notaMedico) : null;
  const tipoRecaudoFinal = tipoTouched ? tipoRecaudo : (tipoSugerido ?? '');
  const emisionesOrdenes = [
    ...(data.cartaAval ? [{ kind: 'carta' as const, id: `carta-${data.cartaAval.codigoCarta ?? ''}`, carta: data.cartaAval }] : []),
    ...(data.ordenesFarmacia ?? []).map((orden) => ({
      kind: 'farmacia' as const,
      id: `farmacia-${orden.id}`,
      orden,
    })),
    ...(data.ordenesAps ?? []).map((orden) => ({
      kind: 'aps' as const,
      id: `aps-${orden.id}`,
      orden,
    })),
  ];

  return (
    <div className="step-enter space-y-6">
      <PageHeader
        title={caso.numeroCaso}
        subtitle={
          caso.tipoServicio?.nombre ??
          SERVICE_LABELS[serviceType] ??
          caso.tipoServicioCod
        }
        icon={ClipboardList}
        breadcrumbs={[
          { label: 'Inicio', to: '/app' },
          { label: backLabel, to: backPath },
          { label: caso.numeroCaso },
        ]}
        actions={
          <Link to={backPath} className="btn-outline inline-flex items-center">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Volver
          </Link>
        }
      />

      {actionFeedback?.type === 'success' && (
        <SuccessAlert messages={actionFeedback.message} />
      )}
      {actionFeedback?.type === 'error' && (
        <ValidationAlert
          title="No se pudo completar la acción"
          messages={actionFeedback.message}
        />
      )}

      {user?.role === 'medico' && (
        <MedicoCasoActions
          data={data}
          usuarioId={user?.id ? Number(user.id) : undefined}
          onUpdated={(feedback?: { type: 'success' | 'error'; message: string }) => {
            if (feedback) setActionFeedback(feedback);
            void load({ silent: true });
            void refreshCasos();
          }}
        />
      )}

      {user?.role === 'clinica' && (
        <ProveedorCasoActions
          data={data}
          usuarioId={user?.id ? Number(user.id) : undefined}
          onUpdated={setData}
          onRefreshList={() => void refreshCasos()}
        />
      )}

      <RmsIntegracionCasoPanel
        casoId={caso.id}
        tipoServicioCod={caso.tipoServicioCod}
        companiaCodigo={caso.compania?.codigo}
        beneficiario={caso.beneficiario}
        ordenesAps={data.ordenesAps}
        ordenesFarmacia={data.ordenesFarmacia}
        cartaAval={data.cartaAval}
        reembolso={data.reembolso}
        sincronizacionesRms={data.sincronizacionesRms}
        onRefresh={() => load({ silent: true })}
      />

      {/* Corrección de recaudos para clínicas y asegurados (BPM V-2) */}
      {(user?.role === 'clinica' || user?.role === 'asegurado') && caso.estadoActualCod === 'RECAUDO_PENDIENTE' && (
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-warning" />
              <h2 className="section-title text-warning">Cargar Recaudos Pendientes / Corregidos</h2>
            </div>
            <p className="section-subtitle">
              Sube el documento faltante o un archivo legible y conforme para reanudar la auditoría de la IA.
            </p>
            {notaMedico && (
              <div className="mt-2 rounded-xl border border-accent/25 bg-accent-container/20 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-dark">
                  Documento solicitado por el médico
                </p>
                <HistorialObservacion
                  observacion={notaMedico}
                  docLabels={docLabels}
                  compact
                />
              </div>
            )}
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Tipo de Documento</label>
                <select
                  value={tipoRecaudoFinal}
                  onChange={(e) => {
                    setTipoRecaudo(e.target.value);
                    setTipoTouched(true);
                  }}
                  className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-xs text-on-surface"
                >
                  <option value="">Seleccione el tipo de documento…</option>
                  <option value="PRESUPUESTO">Presupuesto</option>
                  <option value="INFORME_MEDICO">Informe Médico Justificativo</option>
                  <option value="ESTUDIOS_PARACLINICOS">Estudios Paraclínicos / Imágenes</option>
                  <option value="CEDULA_BENEFICIARIO">Cédula o Partida de Nacimiento</option>
                  <option value="CARTA_NARRATIVA">Carta Narrativa (si aplica)</option>
                </select>
              </div>
              <div className="flex flex-col justify-end">
                <DocumentUpload
                  label="Seleccionar Archivo"
                  tipoDocumentoCod={tipoRecaudoFinal}
                  file={recaudoFile}
                  onFileSelect={setRecaudoFile}
                  disabled={subiendoRecaudo}
                />
              </div>
            </div>

            {recaudoError && <p className="text-xs text-error font-bold">{recaudoError}</p>}
            {recaudoSuccess && <p className="text-xs text-success font-bold">{recaudoSuccess}</p>}

            <div className="pt-2 border-t border-outline-variant/60">
              <Button
                disabled={subiendoRecaudo || !recaudoFile || !tipoRecaudoFinal}
                onClick={async () => {
                  if (!recaudoFile) return;
                  setSubiendoRecaudo(true);
                  setRecaudoError(null);
                  setRecaudoSuccess(null);
                  try {
                    await uploadCasoDocument(
                      caso.id,
                      caso.companiaId,
                      tipoRecaudoFinal,
                      recaudoFile,
                      user?.id ? Number(user.id) : undefined
                    );
                    setRecaudoSuccess('Recaudo cargado con éxito. Ejecutando auditoría de la IA...');
                    setRecaudoFile(null);
                    
                    // Trigger validation/re-evaluation
                    await validarDocumentosIa(caso.id);
                    setRecaudoSuccess('¡Exitoso! Documento cargado y caso re-auditado.');
                    await load();
                  } catch (err) {
                    setRecaudoError(err instanceof Error ? err.message : 'Error al procesar el recaudo');
                  } finally {
                    setSubiendoRecaudo(false);
                  }
                }}
              >
                {subiendoRecaudo ? 'Subiendo y re-evaluando IA...' : 'Cargar Recaudo y Re-evaluar'}
              </Button>
            </div>

            <RecaudoNotificacionBanner />
          </CardBody>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="section-title">Información general</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <StatusBadge status={status} />
              {caso.esPrioritario && (
                <span className="chip-warning text-[11px] font-semibold">Prioritario</span>
              )}
            </div>
            <dl className="space-y-3">
              <DetailRow
                label="Servicio"
                value={caso.tipoServicio?.nombre ?? SERVICE_LABELS[serviceType]}
              />
              <DetailRow
                label="Estado"
                value={caso.estadoActual?.nombre ?? caso.estadoActualCod}
              />
              <DetailRow
                label="Beneficiario"
                value={
                  beneficiary
                    ? `${beneficiary.nombres} ${beneficiary.apellidos} (${formatCedula(beneficiary)})`
                    : '—'
                }
              />
              <DetailRow
                label="Póliza"
                value={caso.poliza?.numeroPoliza ?? `#${caso.polizaId}`}
              />
              {muestraVigencia && (
                <DetailRow label="Vigencia de la póliza" value={vigenciaPoliza} />
              )}
              <DetailRow label="Compañía" value={caso.compania?.nombre ?? `#${caso.companiaId}`} />
              <DetailRow label="Solicitud" value={formatDate(caso.fechaSolicitud)} />
              <DetailRow label="Última actualización" value={formatDate(caso.actualizadoEn)} />
              {caso.fechaActivacion && (
                <DetailRow label="Activación" value={formatDate(caso.fechaActivacion)} />
              )}
              {caso.casoOrigen && (
                <DetailRow
                  label="Caso origen"
                  value={
                    <Link
                      to={`/app/solicitudes/${caso.casoOrigen.id}`}
                      className="font-semibold text-secondary hover:underline"
                    >
                      {caso.casoOrigen.numeroCaso}
                    </Link>
                  }
                />
              )}
              {monto != null && (
                <DetailRow
                  label="Monto"
                  value={`USD ${Number(monto).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`}
                />
              )}
              {caso.extension?.motivoConsulta && (
                <DetailRow label="Motivo" value={caso.extension.motivoConsulta} />
              )}
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Workflow className="h-4 w-4 text-secondary" />
              <h2 className="section-title">Workflow</h2>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {caso.pasoActual ? (
              <div className="rounded-xl border border-secondary-fixed bg-secondary-fixed/30 p-3">
                <p className="text-[11px] font-semibold uppercase text-on-surface-variant">
                  Paso actual
                </p>
                <p className="mt-1 font-bold text-primary">{caso.pasoActual.name}</p>
                <p className="text-[12px] text-on-surface-variant">{caso.pasoActual.code}</p>
              </div>
            ) : (
              <p className="text-[13px] text-on-surface-variant">Sin paso en progreso</p>
            )}
            <PaginatedDataView
              items={sortedSteps}
              emptyMessage={
                <p className="text-[13px] text-on-surface-variant">Sin progreso registrado</p>
              }
            >
              {(pageSteps) => (
                <ul className="space-y-2">
                  {pageSteps.map((step) => (
                    <li
                      key={step.id}
                      className="flex items-center justify-between rounded-lg border border-outline-variant/60 px-3 py-2 text-[12px]"
                    >
                      <span>{step.serviceStep?.name ?? `Paso ${step.id}`}</span>
                      <span
                        className={
                          step.estado === 'COMPLETADO'
                            ? 'chip-success'
                            : step.estado === 'EN_PROGRESO'
                              ? 'chip-info'
                              : 'chip-pending'
                        }
                      >
                        {step.estado.replace(/_/g, ' ')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </PaginatedDataView>
          </CardBody>
        </Card>
      </div>

      {data.stepDatos.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="section-title">Datos de la solicitud</h2>
          </CardHeader>
          <CardBody>
            <PaginatedDataView items={data.stepDatos}>
              {(pageDatos) => (
                <dl className="grid gap-3 sm:grid-cols-2">
                  {pageDatos.map((dato) => (
                    <div key={dato.id} className="rounded-xl border border-outline-variant/60 p-3">
                      <dt className="text-[11px] font-semibold uppercase text-on-surface-variant">
                        {dato.serviceStepField?.name ?? dato.serviceStepField?.code ?? 'Campo'}
                      </dt>
                      <dd className="mt-1 text-[13px] font-medium text-on-surface">
                        {dato.valor ?? '—'}
                      </dd>
                      {dato.serviceStep?.name && (
                        <p className="mt-1 text-[11px] text-on-surface-variant">
                          Etapa: {dato.serviceStep.name}
                        </p>
                      )}
                    </div>
                  ))}
                </dl>
              )}
            </PaginatedDataView>
          </CardBody>
        </Card>
      )}

      {iaValidaciones.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-secondary" />
              <h2 className="section-title">Validación IA</h2>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            <PaginatedDataView items={iaValidaciones}>
              {(pageValidaciones) =>
                pageValidaciones.map((val) => {
                  const codigo =
                    val.documento?.tipoDocumentoCod ??
                    data.documentos.find((d) => d.id === val.documentoId)?.tipoDocumentoCod ??
                    'DOCUMENTO';
                  return (
                    <DocumentValidationResultCard
                      key={val.id}
                      codigo={codigo}
                      label={docLabels[codigo] ?? codigo.replace(/_/g, ' ')}
                      nombreArchivo={val.documento?.nombreArchivo}
                      resultadoCod={val.resultadoCod}
                      esLegible={val.esLegible}
                      esConforme={val.esConforme}
                      observaciones={val.observaciones}
                    />
                  );
                })
              }
            </PaginatedDataView>
          </CardBody>
        </Card>
      )}

      {(data.observaciones?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <h2 className="section-title">Observaciones</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <PaginatedDataView items={data.observaciones ?? []}>
              {(pageObservaciones) =>
                pageObservaciones.map((obs) => (
                  <div
                    key={obs.id}
                    className="rounded-xl border border-outline-variant/60 p-3 text-[13px]"
                  >
                    <p className="font-semibold text-on-surface">{obs.etapa}</p>
                    <p className="mt-1 text-on-surface">{obs.motivo}</p>
                    <p className="mt-1 text-[12px] text-on-surface-variant">
                      {formatDate(obs.registradoEn)}
                    </p>
                  </div>
                ))
              }
            </PaginatedDataView>
          </CardBody>
        </Card>
      )}

      {emisionesOrdenes.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="section-title">Emisiones y órdenes</h2>
          </CardHeader>
          <CardBody>
            <PaginatedDataView items={emisionesOrdenes}>
              {(pageItems) => (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pageItems.map((item) => {
                    if (item.kind === 'carta') {
                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-outline-variant p-4 text-[13px]"
                        >
                          <p className="font-bold text-primary">Carta aval</p>
                          <p className="mt-1">{item.carta.codigoCarta}</p>
                          {item.carta.montoAprobado != null && (
                            <p className="text-on-surface-variant">
                              USD {Number(item.carta.montoAprobado).toFixed(2)}
                            </p>
                          )}
                        </div>
                      );
                    }
                    if (item.kind === 'farmacia') {
                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-outline-variant p-4 text-[13px]"
                        >
                          <p className="font-bold text-primary">Orden farmacia</p>
                          <p className="mt-1">{item.orden.codigoOrden}</p>
                          <p className="text-on-surface-variant">{item.orden.estado}</p>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-outline-variant p-4 text-[13px]"
                      >
                        <p className="font-bold text-primary">Orden APS</p>
                        <p className="mt-1">{item.orden.codigoOrden}</p>
                        <p className="text-on-surface-variant">{item.orden.estado}</p>
                        {item.orden.rmsIdExterno && (
                          <p className="mt-1 text-on-surface-variant">
                            Siniestro RMS: <span className="font-medium text-on-surface">{item.orden.rmsIdExterno}</span>
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </PaginatedDataView>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-secondary" />
            <h2 className="section-title">Documentos</h2>
          </div>
        </CardHeader>
        <CardBody>
          {vigenteDocs.length === 0 ? (
            <p className="text-[13px] text-on-surface-variant">No hay documentos adjuntos</p>
          ) : (
            <PaginatedDataView items={vigenteDocs}>
              {(pageDocs) => (
                <ul className="divide-y divide-outline-variant/60">
                  {pageDocs.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium text-on-surface">{doc.nombreArchivo}</p>
                        <p className="text-[12px] text-on-surface-variant">
                          {doc.tipoDocumento?.nombre ?? doc.tipoDocumentoCod} ·{' '}
                          {formatBytes(doc.tamanoBytes)} · {formatDate(doc.cargadoEn)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {canPreviewDocument(doc) && (
                          <Button
                            variant="outline"
                            className="text-[12px]"
                            disabled={viewingId === doc.id}
                            onClick={() => void handleView(doc.id)}
                          >
                            {viewingId === doc.id ? (
                              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Eye className="mr-1 h-3.5 w-3.5" />
                            )}
                            Ver
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          className="text-[12px]"
                          disabled={downloadingId === doc.id}
                          onClick={() => void handleDownload(doc.id)}
                        >
                          {downloadingId === doc.id ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="mr-1 h-3.5 w-3.5" />
                          )}
                          Descargar
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </PaginatedDataView>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-secondary" />
            <h2 className="section-title">Historial de estados</h2>
          </div>
        </CardHeader>
        <CardBody>
          {data.historial.length === 0 ? (
            <p className="text-[13px] text-on-surface-variant">Sin movimientos registrados</p>
          ) : (
            <PaginatedDataView items={data.historial}>
              {(pageHistorial) => (
                <ol className="relative space-y-4 border-l border-outline-variant pl-5">
                  {pageHistorial.map((item) => (
                    <li key={item.id} className="relative">
                      <span className="absolute -left-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full bg-secondary ring-4 ring-surface" />
                      <p className="text-[13px] font-bold text-on-surface">
                        {item.estado?.nombre ?? item.estadoCod}
                      </p>
                      <p className="text-[12px] text-on-surface-variant">{formatDate(item.registradoEn)}</p>
                      {item.observacion && (
                        <HistorialObservacion
                          observacion={item.observacion}
                          docLabels={docLabels}
                        />
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </PaginatedDataView>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
