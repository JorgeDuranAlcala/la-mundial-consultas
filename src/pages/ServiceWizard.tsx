import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DynamicStepFields,
  collectCedulaFieldCodes,
  isCedulaField,
  isHiddenRmsField,
  isMontoField,
} from '@/components/DynamicStepFields';
import {
  BeneficiaryRmsSearch,
} from '@/components/BeneficiaryRmsSearch';
import { PolizaRmsSelect } from '@/components/PolizaRmsSelect';
import { FormPageLayout } from '@/components/layout/FormPageLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { WizardProgressAside } from '@/components/layout/WizardProgressAside';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DocumentUpload } from '@/components/DocumentUpload';
import { AiAuditorResultPanel } from '@/components/caso/AiAuditorResultPanel';
import { ValidationAlert } from '@/components/ui/ValidationAlert';
import { getRmsLookupTargetForRole } from '@/lib/rms-lookup-api';
import { formatVigenciaPoliza, type RmsPolizaItem } from '@/lib/rms-poliza-api';
import {
  FARMACIA_TOPE_MENSUAL_USD,
  farmaciaMontoExcedeTope,
  mensajeTopeFarmacia,
  resolveMontoCap,
} from '@/lib/farmacia-limites';
import { parseLocaleNumber, formatMontoField } from '@/lib/locale-number';
import { fetchTiposDocumento, fetchConfigDocumento } from '@/lib/configuracion-api';
import { uploadCasoDocument, type DocumentAiPrevalidateResult } from '@/lib/documents-api';
import {
  DEFAULT_UPLOAD_RULE,
  mapConfigApiToRule,
  type DocumentUploadRule,
} from '@/lib/document-upload-rules';
import { validarDocumentosIa, type AiValidationResult } from '@/lib/casos-api';
import {
  collectRequiredDocumentErrors,
  collectRequiredFieldErrors,
} from '@/lib/form-validation';
import {
  buildPortalStepDataPayload,
  buildPortalWizardScreens,
  fetchPortalServiceSteps,
  getStepsWithFields,
  type PortalServiceStep,
  type PortalWizardScreen,
  wizardScreenLabel,
} from '@/lib/service-steps-api';
import type { Beneficiary, ServiceType } from '@/lib/types';
import { mapServiceTypeToTipo } from '@/lib/caso-mappers';
import { useAppStore, useAuth } from '@/stores/useStore';

interface ServiceWizardProps {
  title: string;
  serviceType: ServiceType;
}

function prefillCedulaFields(
  steps: PortalServiceStep[],
  values: Record<string, string>,
  cedula: string | null,
): Record<string, string> {
  const next = { ...values };
  for (const step of steps) {
    for (const field of step.fields ?? []) {
      if (!isCedulaField(field)) continue;
      if (cedula) next[field.code] = cedula;
      else delete next[field.code];
    }
  }
  return next;
}

export function ServiceWizard({ title, serviceType }: ServiceWizardProps) {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const selectedCompania = useAuth((s) => s.selectedCompania);
  const beneficiaries = useAppStore((s) => s.beneficiaries);
  const defaultPolizaId = useAppStore((s) => s.defaultPolizaId);
  const puedeConsultarTodos = useAppStore((s) => s.puedeConsultarTodos);
  const vinculoParentesco = useAppStore((s) => s.vinculoParentesco);
  const vinculoBeneficiarioId = useAppStore((s) => s.vinculoBeneficiarioId);
  const vinculoCedula = useAppStore((s) => s.vinculoCedula);
  const isLoadingCoverage = useAppStore((s) => s.isLoadingCoverage);
  const submitCaso = useAppStore((s) => s.submitCaso);
  const refreshCasos = useAppStore((s) => s.refreshCasos);

  const companiaId = Number(user?.companiaId ?? selectedCompania?.id ?? 0) || null;
  const rmsLookupTarget = getRmsLookupTargetForRole(user?.role);

  const [step, setStep] = useState(0);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(
    null,
  );
  const [selectedRmsPoliza, setSelectedRmsPoliza] = useState<RmsPolizaItem | null>(
    null,
  );
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validatingAi, setValidatingAi] = useState(false);
  const [aiResult, setAiResult] = useState<AiValidationResult | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [docLabels, setDocLabels] = useState<Record<string, string>>({});
  const [documentFiles, setDocumentFiles] = useState<Record<string, File>>({});
  const [docAiValidations, setDocAiValidations] = useState<
    Record<string, DocumentAiPrevalidateResult | null>
  >({});
  const [workflowSteps, setWorkflowSteps] = useState<PortalServiceStep[]>([]);
  const [wizardScreens, setWizardScreens] = useState<PortalWizardScreen[]>([]);
  const [documentUploadRules, setDocumentUploadRules] = useState<
    Record<string, DocumentUploadRule>
  >({});

  useEffect(() => {
    if (!companiaId) {
      setLoadingConfig(false);
      return;
    }

    let cancelled = false;
    setLoadingConfig(true);
    Promise.all([
      fetchPortalServiceSteps(companiaId, serviceType),
      fetchTiposDocumento(),
      fetchConfigDocumento(companiaId),
    ])
      .then(([steps, tiposDoc, docRules]) => {
        if (cancelled) return;
        setWorkflowSteps(steps);
        setWizardScreens(buildPortalWizardScreens(steps));
        setDocLabels(Object.fromEntries(tiposDoc.map((d) => [d.codigo, d.nombre])));
        setDocumentUploadRules(
          Object.fromEntries(docRules.map((r) => [r.tipoDocumentoCod, mapConfigApiToRule(r)])),
        );

        setFieldValues((prev) => {
          const next = { ...prev };
          for (const portalStep of getStepsWithFields(steps)) {
            for (const field of portalStep.fields) {
              if (field.field_type === 'DATE' && !next[field.code]) {
                next[field.code] = new Date().toISOString().slice(0, 10);
              }
              if (field.field_type === 'SELECT' && !next[field.code]) {
                const first = field.descripcion?.split('|')[0]?.split(':')[0]?.trim();
                if (first) next[field.code] = first;
              }
            }
          }
          return next;
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar la configuración del trámite');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingConfig(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companiaId, serviceType]);

  const wizardLabels = useMemo(() => {
    if (!wizardScreens.length) {
      return ['Beneficiario', 'Póliza', 'Confirmar'];
    }
    return [
      'Beneficiario',
      'Póliza',
      ...wizardScreens.map(wizardScreenLabel),
      'Confirmar',
    ];
  }, [wizardScreens]);
  const confirmStepIndex = wizardScreens.length + 2;
  const currentScreen =
    step >= 2 && step <= wizardScreens.length + 1
      ? wizardScreens[step - 2]
      : null;

  const beneficiary = selectedBeneficiary;
  const policyNumber =
    selectedRmsPoliza?.numeroPoliza ??
    beneficiary?.policyNumber ??
    '—';
  const sumaAseguradaMax = selectedRmsPoliza?.sumaAsegurada ?? null;
  const isFarmacia = serviceType === 'farmacia';
  const esPolizaColectiva = Boolean(selectedRmsPoliza?.esColectiva);
  const montoCap = resolveMontoCap({
    serviceType,
    sumaAsegurada: sumaAseguradaMax,
    esColectiva: esPolizaColectiva,
  });
  const montoCapLabel =
    isFarmacia && esPolizaColectiva
      ? 'tope mensual de farmacia (póliza colectiva)'
      : 'suma asegurada RMS';
  const aplicaTopeFarmacia = isFarmacia && esPolizaColectiva;
  const readOnlyCedulaCodes = useMemo(
    () => collectCedulaFieldCodes(workflowSteps),
    [workflowSteps],
  );

  const handleFieldChange = (code: string, value: string) => {
    if (readOnlyCedulaCodes.has(code)) return;
    const field = workflowSteps
      .flatMap((s) => s.fields ?? [])
      .find((f) => f.code === code);
    if (field && isCedulaField(field)) return;
    let nextValue = value;
    let capped = false;
    const cap = aplicaTopeFarmacia
      ? Math.min(montoCap ?? FARMACIA_TOPE_MENSUAL_USD, FARMACIA_TOPE_MENSUAL_USD)
      : montoCap;
    const looksMonto =
      (field != null && isMontoField(field)) || /monto/i.test(code);
    if (looksMonto && cap != null && value !== '') {
      const n = parseLocaleNumber(value);
      if (n != null && n > cap) {
        nextValue = String(cap);
        capped = true;
      }
    }
    if (capped && aplicaTopeFarmacia) {
      setValidationErrors([mensajeTopeFarmacia(FARMACIA_TOPE_MENSUAL_USD)]);
    } else {
      setValidationErrors([]);
    }
    setFieldValues((prev) => ({ ...prev, [code]: nextValue }));
  };

  const handleDocumentSelect = (tipoCod: string, file: File | null) => {
    setDocumentFiles((prev) => {
      const next = { ...prev };
      if (file) next[tipoCod] = file;
      else delete next[tipoCod];
      return next;
    });
    if (!file) {
      setDocAiValidations((prev) => {
        const next = { ...prev };
        delete next[tipoCod];
        return next;
      });
    }
    setValidationErrors([]);
    setError(null);
  };

  const handleDocumentAiValidation = (
    tipoCod: string,
    result: DocumentAiPrevalidateResult | null,
  ) => {
    setDocAiValidations((prev) => ({ ...prev, [tipoCod]: result }));
  };

  const getUploadRule = (tipoCod: string): DocumentUploadRule =>
    documentUploadRules[tipoCod] ?? { ...DEFAULT_UPLOAD_RULE, tipoDocumentoCod: tipoCod };

  const goNext = () => {
    setError(null);
    const errors: string[] = [];

    if (step === 0 && !selectedBeneficiary) {
      errors.push(
        'Seleccione el beneficiario por cédula antes de continuar.',
      );
    }

    if (step === 1 && !selectedRmsPoliza) {
      errors.push('Seleccione una póliza de La Mundial (RMS) antes de continuar.');
    }

    if (currentScreen?.kind === 'fields') {
      errors.push(...collectRequiredFieldErrors(currentScreen.step.fields, fieldValues));
      if (montoCap != null) {
        for (const field of currentScreen.step.fields) {
          if (!isMontoField(field)) continue;
          const raw = fieldValues[field.code];
          if (raw == null || raw === '') continue;
          const n = parseLocaleNumber(raw);
          if (n != null && n > montoCap) {
            errors.push(
              aplicaTopeFarmacia
                ? mensajeTopeFarmacia(FARMACIA_TOPE_MENSUAL_USD)
                : `${field.name}: no puede superar la suma asegurada RMS (${formatMontoField(montoCap)}).`,
            );
          }
        }
      }
    }

    if (currentScreen?.kind === 'documents') {
      errors.push(
        ...collectRequiredDocumentErrors(
          currentScreen.step.documents,
          documentFiles,
          docLabels,
        ),
      );

      for (const doc of currentScreen.step.documents) {
        const file = documentFiles[doc.tipo_documento_cod];
        if (!file) continue;

        const validation = docAiValidations[doc.tipo_documento_cod];
        if (!validation) {
          errors.push(
            `Espere la validación IA de "${docLabels[doc.tipo_documento_cod] ?? doc.tipo_documento_cod}"`,
          );
          continue;
        }

        if (
          !validation.esConforme ||
          validation.tipoDocumentoCoincide === false ||
          !validation.esLegible
        ) {
          const label = docLabels[doc.tipo_documento_cod] ?? doc.tipo_documento_cod;
          errors.push(`${label}: ${validation.observaciones}`);
        }
      }
    }

    if (errors.length) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    if (!beneficiary?.beneficiarioId) return;
    const montoRaw = fieldValues.MONTO_SOLICITADO ?? fieldValues.MONTO_ESTIMADO;
    if (isFarmacia && aplicaTopeFarmacia && montoRaw != null && montoRaw !== '') {
      const n = parseLocaleNumber(montoRaw);
      if (n != null && farmaciaMontoExcedeTope(n)) {
        setValidationErrors([mensajeTopeFarmacia()]);
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    setValidationErrors([]);
    try {
      const rmsMeta: Record<string, string> = selectedRmsPoliza
        ? {
            RMS_SERIALCONTRATO: String(selectedRmsPoliza.serialcontrato),
            RMS_SERIALCERTIF: String(selectedRmsPoliza.serialcertif),
            RMS_NUMERO_POLIZA: selectedRmsPoliza.numeroPoliza,
            RMS_CERTIFICADO: selectedRmsPoliza.certificado,
            RMS_SUMA_ASEGURADA: String(selectedRmsPoliza.sumaAsegurada),
            RMS_ES_COLECTIVA: selectedRmsPoliza.esColectiva ? '1' : '0',
            ...(selectedRmsPoliza.tipocontratoSeguro
              ? { RMS_TIPO_CONTRATO: selectedRmsPoliza.tipocontratoSeguro }
              : {}),
            ...(selectedRmsPoliza.fechaInicio
              ? { RMS_FECHA_INICIO: selectedRmsPoliza.fechaInicio }
              : {}),
            ...(selectedRmsPoliza.fechaFin
              ? { RMS_FECHA_FIN: selectedRmsPoliza.fechaFin }
              : {}),
            ...(selectedRmsPoliza.coberturaNombre
              ? { RMS_COBERTURA_NOMBRE: selectedRmsPoliza.coberturaNombre }
              : {}),
          }
        : {};

      const portalStepData: Array<{
        serviceStepId: number;
        data: Record<string, string>;
      }> = buildPortalStepDataPayload(workflowSteps, fieldValues).map(
        (entry, index) =>
          index === 0
            ? { ...entry, data: { ...entry.data, ...rmsMeta } }
            : entry,
      );

      const { requestId, casoId } = await submitCaso({
        serviceType,
        beneficiarioId: beneficiary.beneficiarioId,
        polizaId: beneficiary.polizaId || defaultPolizaId || undefined,
        companiaId: companiaId ?? undefined,
        usuarioCreadorId: user ? Number(user.id) : undefined,
        portalStepData: portalStepData.length ? portalStepData : undefined,
        intakeStepData:
          portalStepData.length === 0
            ? { ...fieldValues, ...rmsMeta }
            : undefined,
        montoSolicitado: (() => {
          const raw =
            fieldValues.MONTO_SOLICITADO ?? fieldValues.MONTO_ESTIMADO;
          if (raw == null || raw === '') return undefined;
          const n = parseLocaleNumber(raw);
          if (n == null) return undefined;
          if (!isFarmacia && sumaAseguradaMax != null) {
            return Math.min(n, sumaAseguradaMax);
          }
          return n;
        })(),
      });

      if (!companiaId) {
        throw new Error('No se pudo determinar la compañía del usuario');
      }

      for (const [tipoCod, file] of Object.entries(documentFiles)) {
        await uploadCasoDocument(
          casoId,
          companiaId,
          tipoCod,
          file,
          user ? Number(user.id) : undefined,
          getUploadRule(tipoCod),
        );
      }

      if (Object.keys(documentFiles).length > 0) {
        setValidatingAi(true);
        const validation = await validarDocumentosIa(casoId);
        setAiResult(validation);
        await refreshCasos();
      }

      setRequestId(requestId);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la solicitud');
    } finally {
      setSubmitting(false);
      setValidatingAi(false);
    }
  };

  if (submitted) {
    return (
      <div className="step-enter mx-auto w-full max-w-3xl">
        <Card>
          <CardBody className="space-y-4 py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-container text-success">
              <CheckCircle2 className="h-7 w-7" strokeWidth={2.2} />
            </div>
            <h2 className="text-xl font-bold text-primary">Solicitud registrada</h2>
            <p className="text-on-surface-variant">
              Número de caso: <strong className="text-on-surface">{requestId}</strong>
            </p>

            {aiResult && (
              <AiAuditorResultPanel aiResult={aiResult} className="mt-6 border-t border-outline-variant/60 pt-6" />
            )}

            {!aiResult && (
              <p className="text-[13px] text-on-surface-variant">
                La IA validará documentos y cobertura (RMS). Recibirá notificaciones del estatus.
              </p>
            )}

            {aiResult?.modoDemo && (
              <p className="text-[12px] text-on-surface-variant text-accent bg-accent/5 p-2 rounded-xl border border-accent/20">
                Modo demo activo (Heurísticas Offline): Configure GEMINI_API_KEY en el backend para auditorías de visión clínica real con modelos generativos.
              </p>
            )}

            <div className="flex flex-wrap justify-center gap-3 pt-6 border-t border-outline-variant/60">
              <Button variant="outline" onClick={() => navigate('/app/solicitudes')}>
                Ver mis solicitudes
              </Button>
              <Button onClick={() => navigate('/app')}>Ir al inicio</Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <FormPageLayout
      header={
        <PageHeader
          title={title}
          subtitle="Flujo guiado: formularios y documentos en pasos separados"
          icon={FileText}
          breadcrumbs={[{ label: 'Inicio', to: '/app' }, { label: title }]}
        />
      }
      aside={
        <WizardProgressAside
          steps={wizardLabels}
          current={step}
          serviceTitle={title}
          beneficiaryName={beneficiary?.name}
          policyNumber={
            selectedRmsPoliza
              ? `${selectedRmsPoliza.numeroPoliza} · Cert. ${selectedRmsPoliza.certificado}`
              : undefined
          }
          sumaAsegurada={sumaAseguradaMax}
          vigenciaPoliza={
            selectedRmsPoliza
              ? formatVigenciaPoliza(
                  selectedRmsPoliza.fechaInicio,
                  selectedRmsPoliza.fechaFin,
                )
              : undefined
          }
        />
      }
    >
      <Card>
        <CardHeader>
          <div>
            <h2 className="section-title">{wizardLabels[step]}</h2>
            <p className="section-subtitle">
              Paso {step + 1} de {wizardLabels.length}
              {currentScreen ? ` · ${currentScreen.step.code}` : ''}
            </p>
          </div>
        </CardHeader>
        <CardBody className="space-y-5">
          {(loadingConfig || isLoadingCoverage) && step <= 1 && (
            <div className="flex items-center gap-2 text-[13px] text-on-surface-variant">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando configuración del trámite…
            </div>
          )}

          {step === 0 && (
            <BeneficiaryRmsSearch
              rmsLookup={rmsLookupTarget}
              beneficiaries={beneficiaries}
              policyNumber={policyNumber}
              polizaId={defaultPolizaId}
              associatedOnly={user?.role === 'asegurado'}
              puedeConsultarTodos={puedeConsultarTodos}
              vinculoParentesco={vinculoParentesco}
              vinculoBeneficiarioId={vinculoBeneficiarioId}
              vinculoCedula={vinculoCedula}
              onCoverageChanged={async () => {
                await useAppStore.getState().loadCoverage(companiaId ?? undefined);
              }}
              onResolved={(result) => {
                if (!result) {
                  setSelectedBeneficiary(null);
                  setSelectedRmsPoliza(null);
                  setFieldValues((prev) =>
                    prefillCedulaFields(workflowSteps, prev, null),
                  );
                  return;
                }
                setSelectedBeneficiary({
                  ...result.beneficiary,
                  name:
                    result.persona.nombreCompleto?.trim() ||
                    result.beneficiary.name,
                });
                setSelectedRmsPoliza(null);
                const cedula = result.beneficiary.cedula?.trim();
                if (cedula) {
                  setFieldValues((prev) =>
                    prefillCedulaFields(workflowSteps, prev, cedula),
                  );
                }
              }}
              disabled={isLoadingCoverage}
            />
          )}

          {step === 1 && (
            <PolizaRmsSelect
              cedula={selectedBeneficiary?.cedula}
              value={selectedRmsPoliza}
              onChange={(poliza) => {
                setSelectedRmsPoliza(poliza);
                if (poliza && selectedBeneficiary) {
                  setSelectedBeneficiary({
                    ...selectedBeneficiary,
                    policyNumber: poliza.numeroPoliza,
                  });
                }
                setFieldValues((prev) => {
                  const next = { ...prev };
                  if (poliza) {
                    const rmsHiddenValues: Record<string, string> = {
                      RMS_SERIALCONTRATO: String(poliza.serialcontrato),
                      RMS_SERIALCERTIF: String(poliza.serialcertif),
                      RMS_NUMERO_POLIZA: poliza.numeroPoliza,
                      RMS_CERTIFICADO: poliza.certificado,
                      RMS_SUMA_ASEGURADA: String(poliza.sumaAsegurada),
                      RMS_ES_COLECTIVA: poliza.esColectiva ? '1' : '0',
                      ...(poliza.tipocontratoSeguro
                        ? { RMS_TIPO_CONTRATO: poliza.tipocontratoSeguro }
                        : {}),
                      ...(poliza.fechaInicio
                        ? { RMS_FECHA_INICIO: poliza.fechaInicio }
                        : {}),
                      ...(poliza.fechaFin
                        ? { RMS_FECHA_FIN: poliza.fechaFin }
                        : {}),
                      ...(poliza.coberturaNombre
                        ? { RMS_COBERTURA_NOMBRE: poliza.coberturaNombre }
                        : {}),
                    };
                    Object.assign(next, rmsHiddenValues);
                  } else {
                    for (const code of Object.keys(next)) {
                      if (/^RMS_/.test(code)) delete next[code];
                    }
                  }
                  if (!isFarmacia && poliza?.sumaAsegurada != null) {
                    const cap = Number(poliza.sumaAsegurada);
                    for (const wfStep of workflowSteps) {
                      for (const field of wfStep.fields ?? []) {
                        if (isHiddenRmsField(field)) continue;
                        if (!isMontoField(field)) continue;
                        const raw = next[field.code];
                        if (raw == null || raw === '') continue;
                        const n = parseLocaleNumber(raw);
                        if (n != null && n > cap) {
                          next[field.code] = String(cap);
                        }
                      }
                    }
                  }
                  return next;
                });
              }}
              disabled={!selectedBeneficiary}
            />
          )}

          {currentScreen?.kind === 'fields' && !loadingConfig && (
            <DynamicStepFields
              fields={currentScreen.step.fields}
              values={fieldValues}
              onChange={handleFieldChange}
              readOnlyCodes={readOnlyCedulaCodes}
              maxMonto={montoCap}
              maxMontoLabel={montoCapLabel}
            />
          )}

          {currentScreen?.kind === 'documents' && !loadingConfig && (
            <>
              <p className="text-[13px] text-on-surface-variant">
                Suba los documentos requeridos para la etapa{' '}
                <strong className="text-on-surface">{currentScreen.step.name}</strong>.
              </p>
              <div className="grid gap-form-gap sm:grid-cols-2">
                {[...currentScreen.step.documents]
                  .sort((a, b) => a.orden - b.orden)
                  .map((doc) => (
                    <DocumentUpload
                      key={doc.id}
                      label={docLabels[doc.tipo_documento_cod] ?? doc.tipo_documento_cod}
                      required={doc.obligatorio}
                      tipoDocumentoCod={doc.tipo_documento_cod}
                      uploadRule={getUploadRule(doc.tipo_documento_cod)}
                      file={documentFiles[doc.tipo_documento_cod] ?? null}
                      onFileSelect={(file) => handleDocumentSelect(doc.tipo_documento_cod, file)}
                      onAiValidation={(result) =>
                        handleDocumentAiValidation(doc.tipo_documento_cod, result)
                      }
                      disabled={submitting}
                      expectedNombre={beneficiary?.name}
                      expectedCedula={beneficiary?.cedula}
                      expectedDiagnostico={fieldValues.MOTIVO_CONSULTA || null}
                      expectedTipoServicioCod={mapServiceTypeToTipo(serviceType)}
                    />
                  ))}
              </div>
            </>
          )}

          {step === confirmStepIndex && (
            <div className="grid gap-form-gap lg:grid-cols-2">
              <div className="space-y-3 rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-[13px] lg:col-span-2">
                <p>
                  <strong>Beneficiario:</strong> {beneficiary?.name}
                </p>
                {selectedRmsPoliza && (
                  <>
                    <p>
                      <strong>Póliza RMS:</strong> {selectedRmsPoliza.numeroPoliza}{' '}
                      · Cert. {selectedRmsPoliza.certificado}
                    </p>
                    <p>
                      <strong>Suma asegurada:</strong>{' '}
                      {selectedRmsPoliza.sumaAsegurada.toLocaleString('es-VE', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <p>
                      <strong>Vigencia de la póliza:</strong>{' '}
                      {formatVigenciaPoliza(
                        selectedRmsPoliza.fechaInicio,
                        selectedRmsPoliza.fechaFin,
                      )}
                    </p>
                  </>
                )}
                <p>
                  <strong>Servicio:</strong> {title}
                </p>
                {getStepsWithFields(workflowSteps).map((portalStep) => {
                  const stepFields = portalStep.fields.filter(
                    (f) => fieldValues[f.code] && !isHiddenRmsField(f),
                  );
                  if (!stepFields.length) return null;
                  return (
                    <div key={portalStep.id} className="pt-2">
                      <p className="font-bold">{portalStep.name}</p>
                      {stepFields.map((field) => (
                        <p key={field.id}>
                          <strong>{field.name}:</strong> {fieldValues[field.code]}
                        </p>
                      ))}
                    </div>
                  );
                })}
                {wizardScreens
                  .filter((s): s is Extract<PortalWizardScreen, { kind: 'documents' }> => s.kind === 'documents')
                  .map((screen) => {
                    const docs = screen.step.documents.filter(
                      (d) => documentFiles[d.tipo_documento_cod],
                    );
                    if (!docs.length) return null;
                    return (
                      <div key={`docs-${screen.step.id}`} className="pt-2">
                        <p className="font-bold">Documentos · {screen.step.name}</p>
                        <ul className="mt-1 list-inside list-disc text-on-surface-variant">
                          {docs.map((doc) => {
                            const label =
                              docLabels[doc.tipo_documento_cod] ?? doc.tipo_documento_cod;
                            const file = documentFiles[doc.tipo_documento_cod];
                            return (
                              <li key={doc.id}>
                                {label}: {file?.name ?? '—'}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
              </div>
              <div className="rounded-2xl border border-secondary-fixed bg-secondary-fixed/40 p-4 text-[13px] text-on-surface lg:col-span-2">
                <p className="font-bold text-primary">Confirmación</p>
                <p className="mt-2 text-on-surface-variant">
                  Al enviar, el caso iniciará en el workflow configurado. Cada documento quedará
                  asociado al paso del flujo donde fue configurado.
                </p>
              </div>
            </div>
          )}

          {validationErrors.length > 0 && <ValidationAlert messages={validationErrors} />}

          {error && (
            <ValidationAlert
              title="No se pudo completar la solicitud"
              messages={error}
            />
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-outline-variant/60 pt-5 sm:flex-row sm:justify-between">
            <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              Anterior
            </Button>
            {step < confirmStepIndex ? (
              <Button
                className="sm:min-w-[140px]"
                disabled={
                  (step === 0 && !selectedBeneficiary) ||
                  (step === 1 && !selectedRmsPoliza) ||
                  (Boolean(currentScreen) && loadingConfig)
                }
                onClick={goNext}
              >
                Siguiente
              </Button>
            ) : (
              <Button
                variant="accent"
                className="sm:min-w-[160px]"
                disabled={submitting || validatingAi || !beneficiary?.beneficiarioId || loadingConfig}
                onClick={() => void handleSubmit()}
              >
                {validatingAi
                  ? 'Validando con IA…'
                  : submitting
                    ? 'Enviando…'
                    : 'Enviar solicitud'}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    </FormPageLayout>
  );
}
