import { useCallback, useEffect, useState } from 'react';
import { Activity, Loader2, Pill, Search, ShieldCheck, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormPageLayout } from '@/components/layout/FormPageLayout';
import { FormHelpAside } from '@/components/layout/WizardProgressAside';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DocumentUpload } from '@/components/DocumentUpload';
import { ValidationAlert } from '@/components/ui/ValidationAlert';
import { Input, Label, Select } from '@/components/ui/Input';
import { resolveBeneficiaryFromDocument, matchBeneficiaryInList } from '@/lib/beneficiario-api';
import { parseDocumentForRms } from '@/lib/cedula.util';
import {
  fetchOrdenesFarmaciaPendientes,
  formatBeneficiarioCedula,
  formatOrdenFarmaciaLabel,
  ordenFarmaciaItemKey,
  type OrdenFarmaciaPendienteApi,
} from '@/lib/ordenes-farmacia-api';
import { buscarPersonaRmsPorCedula } from '@/lib/rms-persona-api';
import type { PersonaRmsResponse } from '@/lib/rms-persona-api';
import type { Beneficiary, ServiceType } from '@/lib/types';
import { ApiError, apiFetch } from '@/lib/api';
import { useAppStore, useAuth } from '@/stores/useStore';
import { useNavigate, Navigate } from 'react-router-dom';
import { uploadCasoDocument } from '@/lib/documents-api';
import { getCaso, validarDocumentosIa, type AiValidationResult } from '@/lib/casos-api';
import { AiAuditorResultPanel } from '@/components/caso/AiAuditorResultPanel';
import {
  fetchOrdenesApsPendientes,
  formatBeneficiarioCedula as formatBeneficiarioCedulaAps,
  ordenApsItemKey,
  formatOrdenApsLabel,
  type OrdenApsPendienteApi,
} from '@/lib/ordenes-aps-api';
import {
  consultarDependenciaRms,
  type RmsDependenciaResult,
} from '@/lib/rms-siniestro-api';

interface AsegurabilidadResult {
  persona: PersonaRmsResponse;
  beneficiary: Beneficiary | null;
  mundial: RmsDependenciaResult | null;
}

export function AsegurabilidadPage() {
  const beneficiaries = useAppStore((s) => s.beneficiaries);
  const defaultPolizaId = useAppStore((s) => s.defaultPolizaId);
  const policyNumber = beneficiaries[0]?.policyNumber ?? '—';
  const user = useAuth((s) => s.user);
  const selectedCompania = useAuth((s) => s.selectedCompania);

  const [documentInput, setDocumentInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AsegurabilidadResult | null>(null);

  if (user?.role !== 'asegurado' || selectedCompania?.codigo !== 'LA_MUNDIAL') {
    return <Navigate to="/app" replace />;
  }

  const handleConsultar = async () => {
    setError(null);
    setResult(null);

    const parsed = parseDocumentForRms(documentInput, 0);
    if (!parsed) {
      setError('Ingrese una cédula válida (ej. V-12345678).');
      return;
    }

    setSearching(true);
    try {
      const persona = await buscarPersonaRmsPorCedula({
        nacionalidad: parsed.nacionalidad,
        cedrif: parsed.cedrif,
        correlativo: 0,
      });

      const beneficiary = await resolveBeneficiaryFromDocument(
        beneficiaries,
        persona.nacionalidad,
        persona.cedrif,
        policyNumber,
        defaultPolizaId ?? 0,
      );

      let mundial: RmsDependenciaResult | null = null;
      try {
        mundial = await consultarDependenciaRms({
          nacionalidad: parsed.nacionalidad,
          cedula: String(parsed.cedrif),
        });
      } catch {
        mundial = null;
      }

      setResult({ persona, beneficiary, mundial });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError(
          `No se encontró paciente con documento ${parsed.display} en RMS (proveedores).`,
        );
      } else {
        setError(
          err instanceof Error ? err.message : 'No se pudo consultar en RMS (proveedores).',
        );
      }
    } finally {
      setSearching(false);
    }
  };

  return (
    <FormPageLayout
      header={
        <PageHeader
          title="Verificación de asegurabilidad"
          subtitle="Consulta solo lectura · proveedores de servicios (RMS)"
          icon={ShieldCheck}
          breadcrumbs={[{ label: 'Inicio', to: '/app' }, { label: 'Asegurabilidad' }]}
        />
      }
      aside={
        <FormHelpAside
          title="Consulta RMS / La Mundial"
          items={[
            { label: 'Modo', value: 'Solo lectura' },
            { label: 'Rol requerido', value: 'Proveedor de servicios' },
            { label: 'Fuente', value: 'RMS + API dependencia' },
            { label: 'Siniestro APS', value: 'Solo si está en La Mundial' },
          ]}
        />
      }
    >
      <Card>
        <CardBody className="space-y-5">
          <div className="grid gap-form-gap lg:grid-cols-2">
            <div className="lg:col-span-2">
              <Label>Cédula del beneficiario / paciente</Label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <Input
                  className="flex-1"
                  placeholder="V-12.345.678"
                  value={documentInput}
                  onChange={(e) => {
                    setDocumentInput(e.target.value);
                    setError(null);
                    setResult(null);
                  }}
                  disabled={searching}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleConsultar();
                    }
                  }}
                />
                <Button
                  className="sm:min-w-[180px]"
                  disabled={searching || !documentInput.trim()}
                  onClick={() => void handleConsultar()}
                >
                  {searching ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Consultando…
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Consultar asegurabilidad
                    </>
                  )}
                </Button>
              </div>
              <p className="mt-1.5 text-[12px] text-on-surface-variant">
                Ingrese solo la cédula.
              </p>
            </div>
          </div>

          {error && <ValidationAlert messages={error} />}

          {result && (
            <div className="grid gap-form-gap lg:grid-cols-2">
              <div className="rounded-2xl border border-success-container bg-success-container/60 p-4 text-[13px] text-on-success-container lg:col-span-2">
                <p className="font-bold">Paciente encontrado en La Mundial (RMS)</p>
                <p className="mt-1">{result.persona.nombreCompleto}</p>
                <p className="mt-1">
                  Documento: {result.persona.nacionalidad}-{result.persona.cedrif}
                </p>
                {result.persona.email && <p>Email: {result.persona.email}</p>}
                {result.persona.celular && <p>Celular: {result.persona.celular}</p>}
                {result.beneficiary ? (
                  <>
                    <p className="mt-2">Parentesco: {result.beneficiary.relationship}</p>
                    <p>Póliza: {result.beneficiary.policyNumber}</p>
                    <p className="mt-2 font-semibold">
                      Beneficiario verificado en póliza local — solo lectura
                    </p>
                  </>
                ) : (
                  <p className="mt-2 font-semibold text-on-success-container/90">
                    Registro RMS verificado. No hay beneficiario asociado en la póliza local del
                    portal.
                  </p>
                )}
              </div>

              {result.mundial && (
                <div
                  className={cn(
                    'rounded-2xl border p-4 text-[13px] lg:col-span-2',
                    result.mundial.enMundial
                      ? 'border-primary/30 bg-primary/5 text-on-surface'
                      : 'border-outline-variant bg-surface-container-low text-on-surface-variant',
                  )}
                >
                  <p className="font-bold text-primary">Base de datos La Mundial (API dependencia)</p>
                  {result.mundial.enMundial ? (
                    <>
                      <p className="mt-1">
                        Asegurado encontrado. Al emitir una orden APS se podrá crear el siniestro en RMS.
                      </p>
                      <p className="mt-1 text-on-surface-variant">
                        Pólizas/certificados vigentes: {result.mundial.polizas.length}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1">
                      Asegurado no encontrado en La Mundial. No se creará siniestro en RMS al emitir APS.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </FormPageLayout>
  );
}

/*
function ActivationPage({
  title,
  serviceLabel,
  icon: Icon,
  onActivate,
}: {
  title: string;
  serviceLabel: string;
  icon: typeof Stethoscope;
  onActivate: () => void | Promise<void>;
}) {
  const [cedula, setCedula] = useState('');
  const [found, setFound] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleActivate = async () => {
    setActivating(true);
    setError(null);
    setSuccess(null);
    try {
      await onActivate();
      setSuccess('Orden activada correctamente en el portal.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo activar la orden');
    } finally {
      setActivating(false);
    }
  };

  return (
    <FormPageLayout
      header={
        <PageHeader
          title={title}
          subtitle="Proveedor de servicios · actualiza RMS"
          icon={Icon}
          breadcrumbs={[{ label: 'Inicio', to: '/app' }, { label: title }]}
        />
      }
      aside={
        <FormHelpAside
          title="Activación en portal"
          items={[
            { label: 'Servicio', value: serviceLabel },
            { label: 'Integración', value: 'RMS' },
            { label: 'Documentos', value: 'Orden impresa + cédula' },
          ]}
        />
      }
    >
      <Card>
        <CardHeader>
          <div>
            <h2 className="section-title">Buscar orden por identificación</h2>
            <p className="section-subtitle">Ingrese la cédula del asegurado para localizar la orden emitida</p>
          </div>
        </CardHeader>
        <CardBody className="space-y-5">
          <div className="grid gap-form-gap lg:grid-cols-2">
            <div>
              <Label>Cédula del asegurado</Label>
              <Input placeholder="V-12.345.678" value={cedula} onChange={(e) => setCedula(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setFound(!!cedula)}>
                Buscar {serviceLabel}
              </Button>
            </div>
          </div>

          {found && (
            <div className="grid gap-form-gap border-t border-outline-variant/60 pt-5">
              <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-[13px] lg:col-span-2">
                <p className="font-bold text-on-surface">Orden encontrada — {serviceLabel}</p>
                <p className="mt-1 text-on-surface-variant">
                  Beneficiario: {selectedOrden?.beneficiario
                    ? `${selectedOrden.beneficiario.nombres} ${selectedOrden.beneficiario.apellidos}`
                    : '—'}{' '}
                  · Estatus: Emitida
                </p>
              </div>
              <DocumentUpload label="Orden impresa" required />
              <DocumentUpload label="Cédula del paciente" required />
              {error && (
                <ValidationAlert className="lg:col-span-2" messages={error} />
              )}
              {success && <p className="text-[13px] text-success lg:col-span-2">{success}</p>}
              <div className="lg:col-span-2">
                <Button
                  className="w-full sm:w-auto"
                  variant="accent"
                  disabled={activating}
                  onClick={() => void handleActivate()}
                >
                  {activating ? 'Activando…' : 'Activar orden en portal'}
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </FormPageLayout>
  );
}
*/

function useActivationSubmit(
  serviceType: ServiceType,
  originTipoCod: string,
  casoOrigenId?: number,
  beneficiarioId?: number,
) {
  const submitCaso = useAppStore((s) => s.submitCaso);
  const requests = useAppStore((s) => s.requests);
  const beneficiaries = useAppStore((s) => s.beneficiaries);
  const user = useAuth((s) => s.user);

  return async () => {
    const originFromList =
      casoOrigenId ??
      requests.find((r) => r.tipoServicioCod === originTipoCod && r.casoId)?.casoId;

    const benId =
      beneficiarioId ??
      beneficiaries.find((b) => b.beneficiarioId)?.beneficiarioId ??
      beneficiaries[0]?.beneficiarioId;
    if (!benId) {
      throw new Error('Cobertura no cargada. Espere a que se carguen los beneficiarios.');
    }
    return submitCaso({
      serviceType,
      beneficiarioId: benId,
      usuarioCreadorId: user ? Number(user.id) : undefined,
      casoOrigenId: originFromList,
    });
  };
}

export function ActivarFarmaciaPage() {
  const user = useAuth((s) => s.user);
  const selectedCompania = useAuth((s) => s.selectedCompania);
  const companiaId = Number(user?.companiaId ?? selectedCompania?.id ?? 0) || null;

  const [ordenes, setOrdenes] = useState<OrdenFarmaciaPendienteApi[]>([]);
  const [selectedOrdenId, setSelectedOrdenId] = useState('');
  const [search, setSearch] = useState('');
  const [loadingOrdenes, setLoadingOrdenes] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [documentFiles, setDocumentFiles] = useState<Record<string, File>>({});

  // Medicines state
  const [medicamentos, setMedicamentos] = useState<any[]>([]);
  const [loadingMeds, setLoadingMeds] = useState(false);

  const filteredOrdenes = ordenes.filter((o) => {
    if (!search.trim()) return true;
    const needle = search.trim().toLowerCase();
    const label = formatOrdenFarmaciaLabel(o).toLowerCase();
    const cedula = formatBeneficiarioCedula(o.beneficiario).toLowerCase();
    const nombre = o.beneficiario
      ? `${o.beneficiario.nombres} ${o.beneficiario.apellidos}`.toLowerCase()
      : '';
    return label.includes(needle) || cedula.includes(needle) || nombre.includes(needle);
  });

  const selectedOrden = ordenes.find(
    (o) => ordenFarmaciaItemKey(o) === selectedOrdenId,
  );
  const casoOrigenId = selectedOrden?.casoId;
  const beneficiarioId = selectedOrden?.beneficiario?.id;
  const onActivate = useActivationSubmit(
    'activacion-farmacia',
    'FARMACIA',
    casoOrigenId,
    beneficiarioId,
  );

  const loadOrdenes = useCallback(async () => {
    setLoadingOrdenes(true);
    setLoadError(null);
    try {
      const rows = await fetchOrdenesFarmaciaPendientes();
      setOrdenes(rows);
      setSelectedOrdenId((prev) => {
        if (prev && rows.some((r) => ordenFarmaciaItemKey(r) === prev)) return prev;
        return rows[0] ? ordenFarmaciaItemKey(rows[0]) : '';
      });
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'No se pudieron cargar las órdenes pendientes',
      );
      setOrdenes([]);
      setSelectedOrdenId('');
    } finally {
      setLoadingOrdenes(false);
    }
  }, []);

  useEffect(() => {
    void loadOrdenes();
  }, [loadOrdenes]);

  // Load medicines whenever selection changes
  useEffect(() => {
    if (!selectedOrden?.ordenId) {
      setMedicamentos([]);
      return;
    }
    setLoadingMeds(true);
    apiFetch<any>('/v1/orden-farmacia-medicamento?filter[orden_farmacia_id]=' + selectedOrden.ordenId)
      .then((res) => {
        const list = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
        setMedicamentos(list.map((med: any) => ({
          id: med.id,
          nombreMedicamento: med.nombre_medicamento,
          cantidadSolicitada: Number(med.cantidad_solicitada),
          cantidadDespachada: Number(med.cantidad_solicitada), // default to requested
          despachado: true, // checked by default
        })));
      })
      .catch((err) => {
        console.error("Error cargando medicamentos:", err);
      })
      .finally(() => {
        setLoadingMeds(false);
      });
  }, [selectedOrden?.ordenId]);

  const handleMedCheckChange = (id: number, checked: boolean) => {
    setMedicamentos((prev) =>
      prev.map((med) => (med.id === id ? { ...med, despachado: checked } : med))
    );
  };

  const handleMedQtyChange = (id: number, qty: number) => {
    setMedicamentos((prev) =>
      prev.map((med) => (med.id === id ? { ...med, cantidadDespachada: qty } : med))
    );
  };

  const handleFileChange = (tipoCod: string, file: File | null) => {
    setDocumentFiles((prev) => {
      const copy = { ...prev };
      if (file) {
        copy[tipoCod] = file;
      } else {
        delete copy[tipoCod];
      }
      return copy;
    });
  };

  const handleActivate = async () => {
    if (!selectedOrden) {
      setError('Seleccione una orden de farmacia pendiente');
      return;
    }
    const requiredDocs = ['ORDEN_FARMACIA_IMPRESA', 'CEDULA_BENEFICIARIO'];
    const missing = requiredDocs.filter((cod) => !documentFiles[cod]);
    if (missing.length) {
      setError('Debe cargar la orden impresa y la cédula del paciente.');
      return;
    }
    if (!companiaId) {
      setError('Compañía de seguros no resuelta para el usuario actual.');
      return;
    }
    setActivating(true);
    setError(null);
    setSuccess(null);
    try {
      // 1. Save all changed medicines to database via PATCH
      for (const med of medicamentos) {
        await apiFetch(`/v1/orden-farmacia-medicamento/${med.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            cantidad_despachada: med.despachado ? med.cantidadDespachada : 0,
            despachado: med.despachado,
          }),
        });
      }

      // 2. Perform case activation
      const { casoId } = await onActivate();

      for (const [tipoCod, file] of Object.entries(documentFiles)) {
        await uploadCasoDocument(
          casoId,
          companiaId,
          tipoCod,
          file,
          user ? Number(user.id) : undefined,
        );
      }

      setSuccess(
        `Caso ${selectedOrden.numeroCaso ?? selectedOrden.codigoOrden} activado correctamente. Se despacharon ${medicamentos.filter(m => m.despachado).length} medicamentos.`,
      );
      setDocumentFiles({});
      await loadOrdenes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo activar la orden');
    } finally {
      setActivating(false);
    }
  };

  return (
    <FormPageLayout
      header={
        <PageHeader
          title="Activar orden de farmacia"
          subtitle="Proveedor de servicios · actualiza RMS"
          icon={Pill}
          breadcrumbs={[{ label: 'Inicio', to: '/app' }, { label: 'Activar orden de farmacia' }]}
        />
      }
      aside={
        <FormHelpAside
          title="Activación en portal"
          items={[
            { label: 'Servicio', value: 'Farmacia' },
            { label: 'Órdenes listadas', value: 'Emitidas, pendientes o casos en trámite' },
            { label: 'Despacho', value: 'Seleccione y modifique las cantidades entregadas.' },
          ]}
        />
      }
    >
      <Card>
        <CardHeader>
          <div>
            <h2 className="section-title">Seleccionar orden pendiente</h2>
            <p className="section-subtitle">
              Elija la solicitud o orden emitida que el paciente presenta en la farmacia
            </p>
          </div>
        </CardHeader>
        <CardBody className="space-y-5">
          {loadingOrdenes && (
            <div className="flex items-center gap-2 text-[13px] text-on-surface-variant">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando órdenes pendientes…
            </div>
          )}

          {loadError && (
            <p className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-accent">
              {loadError}
            </p>
          )}

          {!loadingOrdenes && !loadError && ordenes.length === 0 && (
            <div className="rounded-2xl border border-dashed border-outline-variant py-10 text-center text-[13px] text-on-surface-variant">
              No hay órdenes ni solicitudes de farmacia pendientes de activación.
            </div>
          )}

          {!loadingOrdenes && ordenes.length > 0 && (
            <>
              <div className="grid gap-form-gap sm:grid-cols-2">
                <div>
                  <Label>Buscador</Label>
                  <Input
                    placeholder="Cédula, nombre o número de orden…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Orden de farmacia pendiente</Label>
                  <Select
                    value={selectedOrdenId}
                    onChange={(e) => {
                      setSelectedOrdenId(e.target.value);
                      setError(null);
                      setSuccess(null);
                      setDocumentFiles({});
                    }}
                  >
                    {filteredOrdenes.map((orden) => (
                      <option key={ordenFarmaciaItemKey(orden)} value={ordenFarmaciaItemKey(orden)}>
                        {formatOrdenFarmaciaLabel(orden)}
                      </option>
                    ))}
                  </Select>
                  {filteredOrdenes.length === 0 && (
                    <p className="mt-1 text-[12px] text-accent-dark">
                      Ninguna orden coincide con el buscador
                    </p>
                  )}
                </div>
              </div>

              {selectedOrden && (
                <div className="grid gap-form-gap border-t border-outline-variant/60 pt-5 lg:grid-cols-2">
                  <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-[13px] lg:col-span-2">
                    <p className="font-bold text-on-surface">
                      {selectedOrden.numeroCaso ?? selectedOrden.codigoOrden}
                      {selectedOrden.ordenId ? ` · Orden ${selectedOrden.codigoOrden}` : ''}
                    </p>
                    <p className="mt-1 text-on-surface-variant">
                      Beneficiario:{' '}
                      {selectedOrden.beneficiario
                        ? `${selectedOrden.beneficiario.nombres} ${selectedOrden.beneficiario.apellidos}`
                        : '—'}
                    </p>
                    <p className="text-on-surface-variant">
                      Cédula: {formatBeneficiarioCedula(selectedOrden.beneficiario)}
                    </p>
                    <p className="text-on-surface-variant">Estatus: {selectedOrden.estado}</p>
                  </div>

                  <DocumentUpload
                    label="Orden impresa"
                    required
                    tipoDocumentoCod="ORDEN_FARMACIA_IMPRESA"
                    file={documentFiles.ORDEN_FARMACIA_IMPRESA ?? null}
                    onFileSelect={(f) => handleFileChange('ORDEN_FARMACIA_IMPRESA', f)}
                    disabled={activating}
                    expectedNombre={
                      selectedOrden.beneficiario
                        ? `${selectedOrden.beneficiario.nombres} ${selectedOrden.beneficiario.apellidos}`.trim()
                        : undefined
                    }
                    expectedCedula={formatBeneficiarioCedula(selectedOrden.beneficiario)}
                  />
                  <DocumentUpload
                    label="Cédula del paciente"
                    required
                    tipoDocumentoCod="CEDULA_BENEFICIARIO"
                    file={documentFiles.CEDULA_BENEFICIARIO ?? null}
                    onFileSelect={(f) => handleFileChange('CEDULA_BENEFICIARIO', f)}
                    disabled={activating}
                    expectedNombre={
                      selectedOrden.beneficiario
                        ? `${selectedOrden.beneficiario.nombres} ${selectedOrden.beneficiario.apellidos}`.trim()
                        : undefined
                    }
                    expectedCedula={formatBeneficiarioCedula(selectedOrden.beneficiario)}
                  />

                  {/* Medicine Checklist Section */}
                  <div className="lg:col-span-2 border-t border-outline-variant/60 pt-5 space-y-3">
                    <h3 className="font-bold text-sm text-primary">Detalle de Medicamentos de la Orden</h3>
                    {loadingMeds ? (
                      <div className="flex items-center gap-2 text-[12px] text-on-surface-variant">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando detalle de medicamentos…
                      </div>
                    ) : medicamentos.length === 0 ? (
                      <p className="text-xs text-on-surface-variant italic">No hay medicamentos registrados en esta orden.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-outline-variant">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant">
                              <th className="p-3 font-bold w-12 text-center">Desp.</th>
                              <th className="p-3 font-bold">Medicamento</th>
                              <th className="p-3 font-bold text-center w-24">Cantidad Solicitada</th>
                              <th className="p-3 font-bold text-center w-36">Cantidad Despachada</th>
                            </tr>
                          </thead>
                          <tbody>
                            {medicamentos.map((med) => (
                              <tr key={med.id} className="border-b border-outline-variant/60 hover:bg-surface-container-lowest/30">
                                <td className="p-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={med.despachado}
                                    onChange={(e) => handleMedCheckChange(med.id, e.target.checked)}
                                    className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4"
                                  />
                                </td>
                                <td className={cn("p-3 font-medium", !med.despachado && "line-through text-on-surface-variant/55")}>
                                  {med.nombreMedicamento}
                                </td>
                                <td className="p-3 text-center font-bold text-on-surface-variant">
                                  {med.cantidadSolicitada}
                                </td>
                                <td className="p-3 text-center">
                                  <Input
                                    type="number"
                                    min="0"
                                    max={med.cantidadSolicitada}
                                    value={med.cantidadDespachada}
                                    onChange={(e) => handleMedQtyChange(med.id, Number(e.target.value))}
                                    disabled={!med.despachado}
                                    className="w-20 text-center mx-auto"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {error && (
                    <ValidationAlert className="lg:col-span-2" messages={error} />
                  )}
                  {success && <p className="text-[13px] text-success lg:col-span-2">{success}</p>}
                  <div className="lg:col-span-2">
                    <Button
                      className="w-full sm:w-auto"
                      variant="accent"
                      disabled={activating}
                      onClick={() => void handleActivate()}
                    >
                      {activating ? 'Activando y registrando despacho…' : 'Activar orden en portal'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </FormPageLayout>
  );
}

export function ActivarApsPage() {
  const user = useAuth((s) => s.user);
  const selectedCompania = useAuth((s) => s.selectedCompania);
  const companiaId = Number(user?.companiaId ?? selectedCompania?.id ?? 0) || null;

  const [ordenes, setOrdenes] = useState<OrdenApsPendienteApi[]>([]);
  const [selectedOrdenId, setSelectedOrdenId] = useState('');
  const [search, setSearch] = useState('');
  const [loadingOrdenes, setLoadingOrdenes] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [documentFiles, setDocumentFiles] = useState<Record<string, File>>({});

  // Cargos/Servicios state
  const [cargos, setCargos] = useState<any[]>([]);
  const [loadingCargos, setLoadingCargos] = useState(false);

  const filteredOrdenes = ordenes.filter((o) => {
    if (!search.trim()) return true;
    const needle = search.trim().toLowerCase();
    const label = formatOrdenApsLabel(o).toLowerCase();
    const cedula = o.beneficiario
      ? `${o.beneficiario.tipoCedula ?? 'V'}${o.beneficiario.cedula}`.toLowerCase()
      : '';
    const nombre = o.beneficiario
      ? `${o.beneficiario.nombres} ${o.beneficiario.apellidos}`.toLowerCase()
      : '';
    return label.includes(needle) || cedula.includes(needle) || nombre.includes(needle);
  });

  const selectedOrden = ordenes.find(
    (o) => ordenApsItemKey(o) === selectedOrdenId,
  );
  const casoOrigenId = selectedOrden?.casoId;
  const beneficiarioId = selectedOrden?.beneficiario?.id;
  const onActivate = useActivationSubmit(
    'activacion-aps',
    'APS',
    casoOrigenId,
    beneficiarioId,
  );

  const loadOrdenes = useCallback(async () => {
    setLoadingOrdenes(true);
    setLoadError(null);
    try {
      const rows = await fetchOrdenesApsPendientes();
      setOrdenes(rows);
      setSelectedOrdenId((prev) => {
        if (prev && rows.some((r) => ordenApsItemKey(r) === prev)) return prev;
        return rows[0] ? ordenApsItemKey(rows[0]) : '';
      });
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'No se pudieron cargar las órdenes pendientes',
      );
      setOrdenes([]);
      setSelectedOrdenId('');
    } finally {
      setLoadingOrdenes(false);
    }
  }, []);

  useEffect(() => {
    void loadOrdenes();
  }, [loadOrdenes]);

  // Load charges whenever selection changes
  useEffect(() => {
    if (!selectedOrden?.ordenId) {
      setCargos([]);
      return;
    }
    setLoadingCargos(true);
    apiFetch<any>('/v1/orden-servicio-aps-cargo?filter[orden_aps_id]=' + selectedOrden.ordenId)
      .then((res) => {
        const list = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
        setCargos(list);
      })
      .catch((err) => {
        console.error("Error cargando cargos:", err);
      })
      .finally(() => {
        setLoadingCargos(false);
      });
  }, [selectedOrden?.ordenId]);

  const handleFileChange = (tipoCod: string, file: File | null) => {
    setDocumentFiles((prev) => {
      const copy = { ...prev };
      if (file) {
        copy[tipoCod] = file;
      } else {
        delete copy[tipoCod];
      }
      return copy;
    });
  };

  const handleActivate = async () => {
    if (!selectedOrden) {
      setError('Seleccione una orden de servicio pendiente');
      return;
    }
    const requiredDocs = ['ORDEN_SERVICIO_IMPRESA', 'CEDULA_BENEFICIARIO'];
    const missing = requiredDocs.filter((cod) => !documentFiles[cod]);
    if (missing.length) {
      setError('Debe cargar la orden impresa y la cédula del paciente.');
      return;
    }
    if (!companiaId) {
      setError('Compañía de seguros no resuelta para el usuario actual.');
      return;
    }
    setActivating(true);
    setError(null);
    setSuccess(null);
    try {
      const { casoId } = await onActivate();

      for (const [tipoCod, file] of Object.entries(documentFiles)) {
        await uploadCasoDocument(
          casoId,
          companiaId,
          tipoCod,
          file,
          user ? Number(user.id) : undefined,
        );
      }

      setSuccess(
        `Orden de servicio ${selectedOrden.numeroCaso ?? selectedOrden.codigoOrden} activada correctamente.`,
      );
      setDocumentFiles({});
      await loadOrdenes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo activar la orden');
    } finally {
      setActivating(false);
    }
  };

  return (
    <FormPageLayout
      header={
        <PageHeader
          title="Activar orden de servicio (APS)"
          subtitle="Proveedor de servicios · actualiza RMS"
          icon={Stethoscope}
          breadcrumbs={[{ label: 'Inicio', to: '/app' }, { label: 'Activar orden de servicio (APS)' }]}
        />
      }
      aside={
        <FormHelpAside
          title="Activación en portal"
          items={[
            { label: 'Servicio', value: 'APS (Atención Primaria)' },
            { label: 'Órdenes listadas', value: 'Órdenes de servicio o consultas emitidas' },
            { label: 'Confirmación', value: 'Revisión de servicios autorizados antes de prestar atención.' },
          ]}
        />
      }
    >
      <Card>
        <CardHeader>
          <div>
            <h2 className="section-title">Seleccionar orden pendiente</h2>
            <p className="section-subtitle">
              Elija la solicitud o orden emitida que el paciente presenta en el centro clínico
            </p>
          </div>
        </CardHeader>
        <CardBody className="space-y-5">
          {loadingOrdenes && (
            <div className="flex items-center gap-2 text-[13px] text-on-surface-variant">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando órdenes pendientes…
            </div>
          )}

          {loadError && (
            <p className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-accent">
              {loadError}
            </p>
          )}

          {!loadingOrdenes && !loadError && ordenes.length === 0 && (
            <div className="rounded-2xl border border-dashed border-outline-variant py-10 text-center text-[13px] text-on-surface-variant">
              No hay órdenes de servicio APS pendientes de activación.
            </div>
          )}

          {!loadingOrdenes && ordenes.length > 0 && (
            <>
              <div className="grid gap-form-gap sm:grid-cols-2">
                <div>
                  <Label>Buscador</Label>
                  <Input
                    placeholder="Cédula, nombre o número de orden…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Orden de servicio pendiente</Label>
                  <Select
                    value={selectedOrdenId}
                    onChange={(e) => {
                      setSelectedOrdenId(e.target.value);
                      setError(null);
                      setSuccess(null);
                      setDocumentFiles({});
                    }}
                  >
                    {filteredOrdenes.map((orden) => (
                      <option key={ordenApsItemKey(orden)} value={ordenApsItemKey(orden)}>
                        {formatOrdenApsLabel(orden)}
                      </option>
                    ))}
                  </Select>
                  {filteredOrdenes.length === 0 && (
                    <p className="mt-1 text-[12px] text-accent-dark">
                      Ninguna orden coincide con el buscador
                    </p>
                  )}
                </div>
              </div>

              {selectedOrden && (
                <div className="grid gap-form-gap border-t border-outline-variant/60 pt-5 lg:grid-cols-2">
                  <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-[13px] lg:col-span-2">
                    <p className="font-bold text-on-surface">
                      {selectedOrden.numeroCaso ?? selectedOrden.codigoOrden}
                      {selectedOrden.ordenId ? ` · Orden ${selectedOrden.codigoOrden}` : ''}
                    </p>
                    <p className="mt-1 text-on-surface-variant">
                      Beneficiario:{' '}
                      {selectedOrden.beneficiario
                        ? `${selectedOrden.beneficiario.nombres} ${selectedOrden.beneficiario.apellidos}`
                        : '—'}
                    </p>
                    <p className="text-on-surface-variant">
                      Cédula: {formatBeneficiarioCedulaAps(selectedOrden.beneficiario)}
                    </p>
                    <p className="text-on-surface-variant">Estatus: {selectedOrden.estado}</p>
                  </div>

                  <DocumentUpload
                    label="Orden de Servicio Impresa"
                    required
                    tipoDocumentoCod="ORDEN_SERVICIO_IMPRESA"
                    file={documentFiles.ORDEN_SERVICIO_IMPRESA ?? null}
                    onFileSelect={(f) => handleFileChange('ORDEN_SERVICIO_IMPRESA', f)}
                    disabled={activating}
                    expectedNombre={
                      selectedOrden.beneficiario
                        ? `${selectedOrden.beneficiario.nombres} ${selectedOrden.beneficiario.apellidos}`.trim()
                        : undefined
                    }
                    expectedCedula={formatBeneficiarioCedulaAps(selectedOrden.beneficiario)}
                  />
                  <DocumentUpload
                    label="Cédula del paciente"
                    required
                    tipoDocumentoCod="CEDULA_BENEFICIARIO"
                    file={documentFiles.CEDULA_BENEFICIARIO ?? null}
                    onFileSelect={(f) => handleFileChange('CEDULA_BENEFICIARIO', f)}
                    disabled={activating}
                    expectedNombre={
                      selectedOrden.beneficiario
                        ? `${selectedOrden.beneficiario.nombres} ${selectedOrden.beneficiario.apellidos}`.trim()
                        : undefined
                    }
                    expectedCedula={formatBeneficiarioCedulaAps(selectedOrden.beneficiario)}
                  />

                  {/* Authorized Charges Section */}
                  <div className="lg:col-span-2 border-t border-outline-variant/60 pt-5 space-y-3">
                    <h3 className="font-bold text-sm text-primary">Servicios y Conceptos Autorizados (APS)</h3>
                    {loadingCargos ? (
                      <div className="flex items-center gap-2 text-[12px] text-on-surface-variant">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando cargos autorizados…
                      </div>
                    ) : cargos.length === 0 ? (
                      <p className="text-xs text-on-surface-variant italic">No hay cargos específicos asociados a esta orden.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-outline-variant">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant">
                              <th className="p-3 font-bold w-16 text-center">N° Línea</th>
                              <th className="p-3 font-bold">Concepto / Servicio Autorizado</th>
                              <th className="p-3 font-bold text-right w-36">Monto Autorizado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cargos.map((cargo) => (
                              <tr key={cargo.id} className="border-b border-outline-variant/60 hover:bg-surface-container-lowest/30">
                                <td className="p-3 text-center font-bold text-on-surface-variant">
                                  {cargo.orden_linea ?? cargo.ordenLinea ?? 1}
                                </td>
                                <td className="p-3 font-medium">
                                  {cargo.descripcion_cargo ?? cargo.descripcionCargo}
                                </td>
                                <td className="p-3 text-right font-bold text-primary">
                                  {(Number(cargo.monto) || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })} USD
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {error && (
                    <ValidationAlert className="lg:col-span-2" messages={error} />
                  )}
                  {success && <p className="text-[13px] text-success lg:col-span-2">{success}</p>}
                  <div className="lg:col-span-2">
                    <Button
                      className="w-full sm:w-auto"
                      variant="accent"
                      disabled={activating}
                      onClick={() => void handleActivate()}
                    >
                      {activating ? 'Activando orden de servicio…' : 'Activar orden de servicio (APS)'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </FormPageLayout>
  );
}

export function ActivarCartaAvalPage() {
  const navigate = useNavigate();
  const submitCaso = useAppStore((s) => s.submitCaso);
  const requests = useAppStore((s) => s.requests);
  const beneficiaries = useAppStore((s) => s.beneficiaries);
  const refreshCasos = useAppStore((s) => s.refreshCasos);
  const user = useAuth((s) => s.user);
  const selectedCompania = useAuth((s) => s.selectedCompania);

  const companiaId = Number(user?.companiaId ?? selectedCompania?.id ?? 0) || null;

  const [cedula, setCedula] = useState('');
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [foundRequest, setFoundRequest] = useState<any>(null);
  
  const [actionType, setActionType] = useState<'INGRESAR' | 'EXTENSION'>('INGRESAR');
  const [documentFiles, setDocumentFiles] = useState<Record<string, File>>({});
  
  const [activating, setActivating] = useState(false);
  const [validatingAi, setValidatingAi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [aiResult, setAiResult] = useState<AiValidationResult | null>(null);
  const [createdCaseId, setCreatedCaseId] = useState<number | null>(null);

  const handleSearch = () => {
    setError(null);
    setSuccess(null);
    setSearchAttempted(true);
    const cleanInput = cedula.replace(/\D/g, '');
    
    // Find active or pending Carta Aval request for this patient CI
    const req = requests.find((r) => {
      const cleanReqCed = r.cedula.replace(/\D/g, '');
      return cleanReqCed === cleanInput && (r.tipoServicioCod === 'CARTA_AVAL' || r.type === 'carta-aval');
    });

    if (req) {
      setFoundRequest(req);
    } else {
      setFoundRequest(null);
      setError(
        'No se encontró una carta aval aprobada para esa cédula. Verifique el documento o cree la solicitud primero.',
      );
    }
  };

  const handleFileChange = (tipoCod: string, file: File | null) => {
    setDocumentFiles((prev) => {
      const copy = { ...prev };
      if (file) {
        copy[tipoCod] = file;
      } else {
        delete copy[tipoCod];
      }
      return copy;
    });
  };

  const handleActivateSubmit = async () => {
    if (!foundRequest) return;
    setActivating(true);
    setError(null);
    setSuccess(null);
    setAiResult(null);

    try {
      if (!companiaId) {
        throw new Error('Compañía de seguros no resuelta para el usuario actual.');
      }

      const requiredDocs =
        actionType === 'INGRESAR'
          ? ['CARTA_AVAL', 'CEDULA_BENEFICIARIO']
          : [
              'CARTA_AVAL',
              'PRESUPUESTO',
              'INFORME_MEDICO',
              'ESTUDIOS_PARACLINICOS',
              'CEDULA_BENEFICIARIO',
            ];
      const missing = requiredDocs.filter((cod) => !documentFiles[cod]);
      if (missing.length) {
        throw new Error(
          `Debe cargar los documentos obligatorios: ${missing.join(', ')}.`,
        );
      }

      // 1. Beneficiario/póliza del caso origen (clínica no tiene al paciente en su cobertura local)
      let benId =
        Number(foundRequest.beneficiarioId) > 0
          ? Number(foundRequest.beneficiarioId)
          : undefined;
      let polizaId =
        Number(foundRequest.polizaId) > 0
          ? Number(foundRequest.polizaId)
          : undefined;

      if ((!benId || !polizaId) && foundRequest.casoId) {
        const origen = await getCaso(Number(foundRequest.casoId));
        if (!benId && origen.beneficiarioId) benId = Number(origen.beneficiarioId);
        if (!polizaId && origen.polizaId) polizaId = Number(origen.polizaId);
      }

      if (!benId) {
        const tipoCed =
          foundRequest.cedula?.includes('-')
            ? foundRequest.cedula.split('-')[0]
            : 'V';
        const numCed = String(foundRequest.cedula ?? '').replace(/\D/g, '');
        const matched =
          matchBeneficiaryInList(beneficiaries, tipoCed, numCed) ??
          (await resolveBeneficiaryFromDocument(
            beneficiaries,
            tipoCed,
            numCed,
            '—',
            polizaId || 0,
          ));
        benId = matched?.beneficiarioId;
        if (!polizaId && matched?.polizaId) polizaId = matched.polizaId;
      }

      if (!benId) {
        throw new Error(
          'No se pudo resolver el beneficiario de la carta aval. Verifique la cédula en el sistema.',
        );
      }
      if (!polizaId) {
        throw new Error(
          'No se pudo resolver la póliza de la carta aval origen. Abra de nuevo la solicitud emitida.',
        );
      }

      const { casoId } = await submitCaso({
        serviceType: 'activacion-carta-aval',
        beneficiarioId: benId,
        polizaId,
        usuarioCreadorId: user ? Number(user.id) : undefined,
        casoOrigenId: foundRequest.casoId,
      });

      setCreatedCaseId(casoId);

      // 2. Upload files
      for (const [tipoCod, file] of Object.entries(documentFiles)) {
        await uploadCasoDocument(
          casoId,
          companiaId,
          tipoCod,
          file,
          user ? Number(user.id) : undefined
        );
      }

      // 3. Siempre validar con IA (ingreso y extensión): cédula vs beneficiario + tipo de documento
      setValidatingAi(true);
      const validation = await validarDocumentosIa(casoId);
      setAiResult(validation);
      setValidatingAi(false);

      if (validation.allPassed) {
        setSuccess(
          actionType === 'INGRESAR'
            ? `Carta Aval ${foundRequest.id} activada correctamente en el portal para el ingreso del paciente.`
            : `Extensión de Carta Aval ${foundRequest.id} aprobada por IA.`,
        );
      } else {
        setSuccess(null);
      }

      setSubmitted(true);
      await refreshCasos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar la solicitud.');
      setValidatingAi(false);
    } finally {
      setActivating(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto w-full max-w-3xl step-enter">
        <Card>
          <CardBody className="space-y-4 py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-container text-success">
              <ShieldCheck className="h-7 w-7" strokeWidth={2.2} />
            </div>
            <h2 className="text-xl font-bold text-primary">Solicitud Procesada</h2>
            <p className="text-on-surface-variant">
              Caso de Activación / Extensión: <strong className="text-on-surface">AC-{(createdCaseId ?? 0).toString().padStart(4, '0')}</strong>
            </p>

            {aiResult ? (
              <AiAuditorResultPanel aiResult={aiResult} className="mt-6 border-t border-outline-variant/60 pt-6" />
            ) : (
              <p className="text-[13px] text-on-surface-variant mt-2">
                {success || 'Carta Aval activada con éxito para el egreso/atención del paciente.'}
              </p>
            )}

            <div className="flex flex-wrap justify-center gap-3 pt-6 border-t border-outline-variant/60">
              <Button variant="outline" onClick={() => navigate('/app')}>
                Ir al inicio
              </Button>
              <Button onClick={() => {
                setSubmitted(false);
                setSearchAttempted(false);
                setFoundRequest(null);
                setDocumentFiles({});
                setCedula('');
              }}>
                Procesar otra carta aval
              </Button>
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
          title="Activación y Extensión de Carta Aval"
          subtitle="Proveedor de servicios · Activación rápida o ampliación de cobertura vía IA clínica"
          icon={Activity}
          breadcrumbs={[{ label: 'Inicio', to: '/app' }, { label: 'Activación de carta aval' }]}
        />
      }
      aside={
        <FormHelpAside
          title="Guía de Activaciones"
          items={[
            { label: 'Ingreso Rápido', value: 'Valida identidad (cédula) y autenticidad de la orden de carta aval con IA antes de activar.' },
            { label: 'Extensión Cobertura', value: 'Sube informes, presupuesto y paraclínicos si la cobertura se agotó.' },
            { label: 'Auditoría IA', value: 'Rechaza cédula distinta al beneficiario y documentos genéricos de internet.' },
          ]}
        />
      }
    >
      <Card>
        <CardHeader>
          <div>
            <h2 className="section-title">Buscar Carta Aval emitida</h2>
            <p className="section-subtitle">Ingrese la cédula del asegurado beneficiario para localizar sus coberturas</p>
          </div>
        </CardHeader>
        <CardBody className="space-y-5">
          <div className="grid gap-form-gap lg:grid-cols-2">
            <div>
              <Label>Cédula del asegurado</Label>
              <div className="relative">
                <Input 
                  placeholder="V-12.345.678" 
                  value={cedula} 
                  onChange={(e) => setCedula(e.target.value)} 
                  disabled={activating}
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button 
                variant="secondary" 
                className="w-full sm:w-auto" 
                onClick={handleSearch}
                disabled={activating}
              >
                <Search className="h-4 w-4 mr-2" />
                Buscar Carta Aval
              </Button>
            </div>
          </div>

          {searchAttempted && foundRequest && (
            <div className="grid gap-form-gap border-t border-outline-variant/60 pt-5">
              <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-[13px] lg:col-span-2">
                <p className="font-bold text-on-surface">Carta Aval Localizada: {foundRequest.id}</p>
                <p className="mt-1 text-on-surface-variant">Beneficiario: {foundRequest.beneficiaryName} · Cédula: {foundRequest.cedula}</p>
                <p className="text-on-surface-variant">Estatus en RMS: Emitida / Pendiente de Ingreso</p>
              </div>

              {/* Action Selector */}
              <div className="lg:col-span-2 space-y-2">
                <Label>Tipo de Trámite a Realizar</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={cn(
                    "flex flex-col p-4 rounded-2xl border cursor-pointer hover:bg-surface-container-low transition-all",
                    actionType === 'INGRESAR' ? "border-primary bg-primary/5" : "border-outline-variant"
                  )}>
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="actionType" 
                        value="INGRESAR" 
                        checked={actionType === 'INGRESAR'} 
                        onChange={() => setActionType('INGRESAR')}
                        className="text-primary"
                      />
                      <span className="font-bold text-xs">Activar Ingreso Regular</span>
                    </div>
                    <span className="text-[11px] text-on-surface-variant mt-1.5">
                      Activa el pase de ingreso en la clínica. Solo requiere orden y cédula de identidad.
                    </span>
                  </label>

                  <label className={cn(
                    "flex flex-col p-4 rounded-2xl border cursor-pointer hover:bg-surface-container-low transition-all",
                    actionType === 'EXTENSION' ? "border-primary bg-primary/5" : "border-outline-variant"
                  )}>
                    <div className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="actionType" 
                        value="EXTENSION" 
                        checked={actionType === 'EXTENSION'} 
                        onChange={() => setActionType('EXTENSION')}
                        className="text-primary"
                      />
                      <span className="font-bold text-xs">Solicitar Extensión de Cobertura (Ampliación IA)</span>
                    </div>
                    <span className="text-[11px] text-on-surface-variant mt-1.5">
                      Solicita ampliación de presupuesto por complicaciones o cirugías adicionales. Requiere auditoría IA.
                    </span>
                  </label>
                </div>
              </div>

              {/* Document upload block based on selected action */}
              <div className="lg:col-span-2 grid gap-form-gap sm:grid-cols-2 pt-3">
                {actionType === 'INGRESAR' ? (
                  <>
                    <DocumentUpload 
                      label="Orden de Carta Aval Impresa" 
                      required 
                      tipoDocumentoCod="CARTA_AVAL"
                      file={documentFiles['CARTA_AVAL'] || null}
                      onFileSelect={(f) => handleFileChange('CARTA_AVAL', f)}
                      disabled={activating}
                      expectedNombre={foundRequest.beneficiaryName}
                      expectedCedula={foundRequest.cedula}
                    />
                    <DocumentUpload 
                      label="Cédula del Paciente / Beneficiario" 
                      required 
                      tipoDocumentoCod="CEDULA_BENEFICIARIO"
                      file={documentFiles['CEDULA_BENEFICIARIO'] || null}
                      onFileSelect={(f) => handleFileChange('CEDULA_BENEFICIARIO', f)}
                      disabled={activating}
                      expectedNombre={foundRequest.beneficiaryName}
                      expectedCedula={foundRequest.cedula}
                    />
                  </>
                ) : (
                  <>
                    <DocumentUpload 
                      label="Carta Aval Original" 
                      required 
                      tipoDocumentoCod="CARTA_AVAL"
                      file={documentFiles['CARTA_AVAL'] || null}
                      onFileSelect={(f) => handleFileChange('CARTA_AVAL', f)}
                      disabled={activating}
                      expectedNombre={foundRequest.beneficiaryName}
                      expectedCedula={foundRequest.cedula}
                    />
                    <DocumentUpload 
                      label="Presupuesto Estimado de Extensión" 
                      required 
                      tipoDocumentoCod="PRESUPUESTO"
                      file={documentFiles['PRESUPUESTO'] || null}
                      onFileSelect={(f) => handleFileChange('PRESUPUESTO', f)}
                      disabled={activating}
                      expectedNombre={foundRequest.beneficiaryName}
                      expectedCedula={foundRequest.cedula}
                    />
                    <DocumentUpload 
                      label="Informe Médico Justificativo" 
                      required 
                      tipoDocumentoCod="INFORME_MEDICO"
                      file={documentFiles['INFORME_MEDICO'] || null}
                      onFileSelect={(f) => handleFileChange('INFORME_MEDICO', f)}
                      disabled={activating}
                      expectedNombre={foundRequest.beneficiaryName}
                      expectedCedula={foundRequest.cedula}
                    />
                    <DocumentUpload 
                      label="Estudios Paraclínicos / Imágenes" 
                      required 
                      tipoDocumentoCod="ESTUDIOS_PARACLINICOS"
                      file={documentFiles['ESTUDIOS_PARACLINICOS'] || null}
                      onFileSelect={(f) => handleFileChange('ESTUDIOS_PARACLINICOS', f)}
                      disabled={activating}
                    />
                    <DocumentUpload 
                      label="Cédula o Partida de Nacimiento (Menor)" 
                      required 
                      tipoDocumentoCod="CEDULA_BENEFICIARIO"
                      file={documentFiles['CEDULA_BENEFICIARIO'] || null}
                      onFileSelect={(f) => handleFileChange('CEDULA_BENEFICIARIO', f)}
                      disabled={activating}
                      expectedNombre={foundRequest.beneficiaryName}
                      expectedCedula={foundRequest.cedula}
                    />
                    <DocumentUpload 
                      label="Carta Narrativa (si aplica por accidentes)" 
                      tipoDocumentoCod="CARTA_NARRATIVA"
                      file={documentFiles['CARTA_NARRATIVA'] || null}
                      onFileSelect={(f) => handleFileChange('CARTA_NARRATIVA', f)}
                      disabled={activating}
                    />
                  </>
                )}
              </div>

              {error && (
                <ValidationAlert className="lg:col-span-2" messages={error} />
              )}

              <div className="lg:col-span-2 pt-4">
                <Button
                  className="w-full sm:w-auto sm:min-w-[200px]"
                  variant="accent"
                  disabled={activating || validatingAi}
                  onClick={() => void handleActivateSubmit()}
                >
                  {activating ? 'Guardando caso en workflow...' : validatingAi ? 'Auditoría IA (Fase 1 + Fase 2)...' : actionType === 'INGRESAR' ? 'Activar ingreso en portal' : 'Enviar Solicitud de Extensión (IA)'}
                </Button>
              </div>
            </div>
          )}

          {searchAttempted && !foundRequest && (
            <div className="rounded-2xl border border-dashed border-outline-variant py-8 text-center text-[13px] text-on-surface-variant">
              No se localizó ninguna Carta Aval emitida para el documento ingresado.
            </div>
          )}
        </CardBody>
      </Card>
    </FormPageLayout>
  );
}
