import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { PaginatedDataView } from '@/components/PaginatedDataView';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ValidationAlert } from '@/components/ui/ValidationAlert';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import {
  createServiceStep,
  createStepDocument,
  createStepField,
  deleteServiceStep,
  deleteStepDocument,
  deleteStepField,
  fetchServiceSteps,
  fetchStepDocuments,
  fetchStepFields,
  fetchTiposDocumento,
  fetchTiposServicio,
  PORTAL_TIPOS_SERVICIO,
  updateServiceStep,
  type ServiceStepApi,
  type ServiceStepDocumentApi,
  type ServiceStepFieldApi,
  type TipoDocumentoApi,
  type TipoServicioApi,
} from '@/lib/configuracion-api';
import { useAuth } from '@/stores/useStore';
import { useAdminCompaniaId } from '@/pages/admin/useAdminCompaniaId';

const FIELD_TYPES = ['TEXT', 'NUMBER', 'DATE', 'EMAIL', 'TEXTAREA', 'BOOLEAN', 'SELECT'];

interface StepFormState {
  code: string;
  name: string;
  display_order: string;
  descripcion: string;
}

const emptyStepForm = (nextOrder: number): StepFormState => ({
  code: '',
  name: '',
  display_order: String(nextOrder),
  descripcion: '',
});

export function ServiceStepsConfig() {
  const companiaId = useAdminCompaniaId();
  const selectedCompania = useAuth((s) => s.selectedCompania);

  const [tiposServicio, setTiposServicio] = useState<TipoServicioApi[]>([]);
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumentoApi[]>([]);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string>(PORTAL_TIPOS_SERVICIO[0]);
  const [steps, setSteps] = useState<ServiceStepApi[]>([]);
  const [expandedStepId, setExpandedStepId] = useState<number | null>(null);
  const [fieldsByStep, setFieldsByStep] = useState<Record<number, ServiceStepFieldApi[]>>({});
  const [docsByStep, setDocsByStep] = useState<Record<number, ServiceStepDocumentApi[]>>({});

  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showStepForm, setShowStepForm] = useState(false);
  const [stepForm, setStepForm] = useState<StepFormState>(emptyStepForm(1));
  const [editingStepId, setEditingStepId] = useState<number | null>(null);

  const [fieldForm, setFieldForm] = useState({
    code: '',
    name: '',
    field_type: 'TEXT',
    required: true,
    display_order: '1',
  });
  const [docForm, setDocForm] = useState({
    tipo_documento_cod: '',
    orden: '1',
    obligatorio: true,
  });

  const tiposPortal = useMemo(() => {
    const byCodigo = new Map(tiposServicio.map((t) => [t.codigo, t]));
    return PORTAL_TIPOS_SERVICIO.map((codigo) => byCodigo.get(codigo)).filter(
      (t): t is TipoServicioApi => Boolean(t),
    );
  }, [tiposServicio]);

  const loadSteps = useCallback(async () => {
    if (!companiaId) return;
    setLoadingSteps(true);
    setError(null);
    try {
      const rows = await fetchServiceSteps(companiaId, tipoSeleccionado);
      setSteps(rows);
      setExpandedStepId(null);
      setFieldsByStep({});
      setDocsByStep({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los pasos');
    } finally {
      setLoadingSteps(false);
    }
  }, [companiaId, tipoSeleccionado]);

  useEffect(() => {
    let cancelled = false;
    setLoadingMeta(true);
    Promise.all([fetchTiposServicio(), fetchTiposDocumento()])
      .then(([servicios, documentos]) => {
        if (cancelled) return;
        setTiposServicio(servicios);
        setTiposDocumento(documentos);
        if (documentos[0]) {
          setDocForm((prev) => ({ ...prev, tipo_documento_cod: documentos[0].codigo }));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar catálogos');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMeta(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void loadSteps();
  }, [loadSteps]);

  const loadStepDetails = async (stepId: number) => {
    const [fields, documents] = await Promise.all([
      fetchStepFields(stepId),
      fetchStepDocuments(stepId),
    ]);
    setFieldsByStep((prev) => ({ ...prev, [stepId]: fields }));
    setDocsByStep((prev) => ({ ...prev, [stepId]: documents }));
    setFieldForm((prev) => ({
      ...prev,
      display_order: String(fields.length + 1),
    }));
    setDocForm((prev) => ({
      ...prev,
      orden: String(documents.length + 1),
    }));
  };

  const toggleStep = async (stepId: number) => {
    if (expandedStepId === stepId) {
      setExpandedStepId(null);
      return;
    }
    setExpandedStepId(stepId);
    if (!fieldsByStep[stepId] || !docsByStep[stepId]) {
      try {
        await loadStepDetails(stepId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el detalle del paso');
      }
    }
  };

  const startCreateStep = () => {
    setEditingStepId(null);
    setStepForm(emptyStepForm(steps.length + 1));
    setShowStepForm(true);
  };

  const startEditStep = (step: ServiceStepApi) => {
    setEditingStepId(step.id);
    setStepForm({
      code: step.code,
      name: step.name,
      display_order: String(step.display_order),
      descripcion: step.descripcion ?? '',
    });
    setShowStepForm(true);
  };

  const submitStepForm = async () => {
    if (!companiaId || !stepForm.code.trim() || !stepForm.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        code: stepForm.code.trim().toUpperCase(),
        name: stepForm.name.trim(),
        display_order: Number(stepForm.display_order) || 1,
        descripcion: stepForm.descripcion.trim() || undefined,
      };

      if (editingStepId) {
        await updateServiceStep(editingStepId, payload);
      } else {
        await createServiceStep({
          compania_id: companiaId,
          id_tipo_servicio: tipoSeleccionado,
          ...payload,
        });
      }

      setShowStepForm(false);
      setEditingStepId(null);
      await loadSteps();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el paso');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStep = async (step: ServiceStepApi) => {
    if (!window.confirm(`¿Eliminar el paso "${step.name}"?`)) return;
    setSaving(true);
    setError(null);
    try {
      await deleteServiceStep(step.id);
      await loadSteps();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el paso');
    } finally {
      setSaving(false);
    }
  };

  const moveStep = async (step: ServiceStepApi, direction: -1 | 1) => {
    const index = steps.findIndex((s) => s.id === step.id);
    const swapWith = steps[index + direction];
    if (!swapWith) return;
    setSaving(true);
    setError(null);
    try {
      await Promise.all([
        updateServiceStep(step.id, { display_order: swapWith.display_order }),
        updateServiceStep(swapWith.id, { display_order: step.display_order }),
      ]);
      await loadSteps();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reordenar');
    } finally {
      setSaving(false);
    }
  };

  const submitField = async (stepId: number) => {
    if (!fieldForm.code.trim() || !fieldForm.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createStepField(stepId, {
        code: fieldForm.code.trim().toUpperCase(),
        name: fieldForm.name.trim(),
        field_type: fieldForm.field_type,
        required: fieldForm.required,
        display_order: Number(fieldForm.display_order) || 1,
      });
      setFieldForm({
        code: '',
        name: '',
        field_type: 'TEXT',
        required: true,
        display_order: String((fieldsByStep[stepId]?.length ?? 0) + 2),
      });
      await loadStepDetails(stepId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el campo');
    } finally {
      setSaving(false);
    }
  };

  const submitDocument = async (stepId: number) => {
    if (!docForm.tipo_documento_cod) return;
    setSaving(true);
    setError(null);
    try {
      await createStepDocument(stepId, {
        tipo_documento_cod: docForm.tipo_documento_cod,
        orden: Number(docForm.orden) || 1,
        obligatorio: docForm.obligatorio,
        activo: true,
      });
      setDocForm((prev) => ({
        ...prev,
        orden: String((docsByStep[stepId]?.length ?? 0) + 2),
      }));
      await loadStepDetails(stepId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar el documento');
    } finally {
      setSaving(false);
    }
  };

  if (!companiaId) {
    return (
      <Card>
        <CardBody className="py-10 text-center text-on-surface-variant">
          No se encontró la compañía del administrador. Vuelva a iniciar sesión.
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="section-title">Pasos del workflow</h2>
              <p className="section-subtitle">
                {selectedCompania?.nombre ?? 'Empresa actual'} · configure el flujo por tipo de servicio
              </p>
            </div>
            <Button variant="accent" onClick={startCreateStep} disabled={saving || loadingSteps}>
              <Plus size={16} />
              Nuevo paso
            </Button>
          </div>
        </CardHeader>
        <CardBody className="space-y-5">
          <div className="rounded-2xl border border-secondary-fixed/50 bg-secondary-fixed/20 p-4 text-[12px] text-on-surface-variant">
            <p className="font-bold text-on-surface">Cómo se usa en el portal</p>
            <p className="mt-1">
              Los <strong>campos</strong> y los <strong>documentos</strong> de un mismo paso del workflow
              se muestran en <strong>pantallas separadas</strong> al crear un caso: primero el formulario,
              luego la subida de documentos (etiqueta «Documentos · …»).
            </p>
            <p className="mt-2">
              Configure los documentos en el paso del flujo donde corresponda (ej. facturas en{' '}
              <em>VALIDACION_DOCUMENTOS</em>, recetas en <em>SOLICITUD</em>). Los pasos sin campos ni
              documentos son internos (IA, emisión, etc.).
            </p>
          </div>

          <div className="max-w-md">
            <Label>Tipo de servicio</Label>
            <Select
              value={tipoSeleccionado}
              onChange={(e) => setTipoSeleccionado(e.target.value)}
              disabled={loadingMeta}
            >
              {tiposPortal.map((tipo) => (
                <option key={tipo.codigo} value={tipo.codigo}>
                  {tipo.nombre}
                </option>
              ))}
            </Select>
          </div>

          {error && (
            <ValidationAlert
              title={
                error.includes('\n')
                  ? 'No puede continuar hasta completar lo siguiente'
                  : 'No se pudo completar la operación'
              }
              messages={error.includes('\n') ? error.split('\n') : error}
            />
          )}

          {showStepForm && (
            <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4">
              <h3 className="mb-4 font-bold text-primary">
                {editingStepId ? 'Editar paso' : 'Nuevo paso'}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Código</Label>
                  <Input
                    value={stepForm.code}
                    onChange={(e) => setStepForm((s) => ({ ...s, code: e.target.value }))}
                    placeholder="VALIDACION_POLIZA"
                  />
                </div>
                <div>
                  <Label>Orden</Label>
                  <Input
                    type="number"
                    min={1}
                    value={stepForm.display_order}
                    onChange={(e) => setStepForm((s) => ({ ...s, display_order: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Nombre visible</Label>
                  <Input
                    value={stepForm.name}
                    onChange={(e) => setStepForm((s) => ({ ...s, name: e.target.value }))}
                    placeholder="Validar póliza vigente"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Descripción</Label>
                  <Textarea
                    rows={2}
                    value={stepForm.descripcion}
                    onChange={(e) => setStepForm((s) => ({ ...s, descripcion: e.target.value }))}
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => void submitStepForm()} disabled={saving}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                  Guardar paso
                </Button>
                <Button variant="outline" onClick={() => setShowStepForm(false)} disabled={saving}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {loadingSteps ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : steps.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-on-surface-variant">
              No hay pasos configurados para este servicio. Agregue el primero con &quot;Nuevo paso&quot;.
            </p>
          ) : (
            <PaginatedDataView items={steps} className="space-y-3">
              {(pageSteps) =>
                pageSteps.map((step) => {
                const expanded = expandedStepId === step.id;
                const fields = fieldsByStep[step.id] ?? [];
                const documents = docsByStep[step.id] ?? [];
                const stepIndex = steps.findIndex((s) => s.id === step.id);

                return (
                  <div key={step.id} className="rounded-2xl border border-outline-variant/70 bg-surface-container-lowest">
                    <div className="flex flex-wrap items-center gap-3 p-4">
                      <GripVertical size={16} className="text-on-surface-variant/50" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-primary-fixed px-2 py-0.5 text-[11px] font-bold text-primary">
                            {step.display_order}
                          </span>
                          <span className="font-bold text-on-surface">{step.name}</span>
                          <span className="font-mono text-[11px] text-on-surface-variant">{step.code}</span>
                        </div>
                        {step.descripcion && (
                          <p className="mt-1 text-[12px] text-on-surface-variant">{step.descripcion}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          variant="outline"
                          disabled={saving || stepIndex <= 0}
                          onClick={() => void moveStep(step, -1)}
                          title="Subir"
                        >
                          <ChevronUp size={16} />
                        </Button>
                        <Button
                          variant="outline"
                          disabled={saving || stepIndex >= steps.length - 1}
                          onClick={() => void moveStep(step, 1)}
                          title="Bajar"
                        >
                          <ChevronDown size={16} />
                        </Button>
                        <Button variant="outline" onClick={() => startEditStep(step)} disabled={saving}>
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => void toggleStep(step.id)}
                          disabled={saving}
                        >
                          {expanded ? 'Ocultar' : 'Detalle'}
                        </Button>
                        <Button variant="danger" onClick={() => void handleDeleteStep(step)} disabled={saving}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="border-t border-outline-variant/60 p-4">
                        <div className="grid gap-6 lg:grid-cols-2">
                          <div>
                            <h4 className="mb-1 flex items-center gap-2 text-sm font-bold text-primary">
                              <FileText size={15} />
                              Campos del paso
                            </h4>
                            <p className="mb-3 text-[11px] text-on-surface-variant">
                              Pantalla de formulario al crear el caso (independiente de documentos).
                            </p>
                            {fields.length === 0 ? (
                              <p className="mb-3 text-[12px] text-on-surface-variant">Sin campos configurados</p>
                            ) : (
                              <PaginatedDataView items={fields} pageSize={5} className="mb-4">
                                {(pageFields) => (
                                  <ul className="space-y-2">
                                    {pageFields.map((field) => (
                                      <li
                                        key={field.id}
                                        className="flex items-start justify-between gap-2 rounded-xl border border-outline-variant/50 px-3 py-2 text-[12px]"
                                      >
                                        <div>
                                          <p className="font-semibold text-on-surface">{field.name}</p>
                                          <p className="text-on-surface-variant">
                                            {field.code} · {field.field_type}
                                            {field.required ? ' · obligatorio' : ''}
                                          </p>
                                        </div>
                                        <Button
                                          variant="danger"
                                          disabled={saving}
                                          onClick={() =>
                                            void (async () => {
                                              if (!window.confirm(`Eliminar campo "${field.name}"?`)) return;
                                              setSaving(true);
                                              try {
                                                await deleteStepField(step.id, field.id);
                                                await loadStepDetails(step.id);
                                              } catch (err) {
                                                setError(
                                                  err instanceof Error
                                                    ? err.message
                                                    : 'No se pudo eliminar el campo',
                                                );
                                              } finally {
                                                setSaving(false);
                                              }
                                            })()
                                          }
                                        >
                                          <Trash2 size={14} />
                                        </Button>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </PaginatedDataView>
                            )}
                            <div className="grid gap-3 rounded-xl border border-dashed border-outline-variant p-3">
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <Label>Código campo</Label>
                                  <Input
                                    value={fieldForm.code}
                                    onChange={(e) => setFieldForm((f) => ({ ...f, code: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <Label>Tipo</Label>
                                  <Select
                                    value={fieldForm.field_type}
                                    onChange={(e) =>
                                      setFieldForm((f) => ({ ...f, field_type: e.target.value }))
                                    }
                                  >
                                    {FIELD_TYPES.map((type) => (
                                      <option key={type} value={type}>
                                        {type}
                                      </option>
                                    ))}
                                  </Select>
                                </div>
                              </div>
                              <div>
                                <Label>Etiqueta</Label>
                                <Input
                                  value={fieldForm.name}
                                  onChange={(e) => setFieldForm((f) => ({ ...f, name: e.target.value }))}
                                />
                              </div>
                              <label className="flex items-center gap-2 text-[13px]">
                                <input
                                  type="checkbox"
                                  checked={fieldForm.required}
                                  onChange={(e) =>
                                    setFieldForm((f) => ({ ...f, required: e.target.checked }))
                                  }
                                />
                                Campo obligatorio
                              </label>
                              <Button
                                variant="secondary"
                                disabled={saving}
                                onClick={() => void submitField(step.id)}
                              >
                                <Plus size={14} />
                                Agregar campo
                              </Button>
                            </div>
                          </div>

                          <div>
                            <h4 className="mb-1 flex items-center gap-2 text-sm font-bold text-primary">
                              <FileText size={15} />
                              Documentos requeridos
                            </h4>
                            <p className="mb-3 text-[11px] text-on-surface-variant">
                              Pantalla propia de subida («Documentos · …»), separada del formulario.
                            </p>
                            {documents.length === 0 ? (
                              <p className="mb-3 text-[12px] text-on-surface-variant">
                                Sin documentos configurados
                              </p>
                            ) : (
                              <PaginatedDataView items={documents} pageSize={5} className="mb-4">
                                {(pageDocuments) => (
                                  <ul className="space-y-2">
                                    {pageDocuments.map((doc) => (
                                      <li
                                        key={doc.id}
                                        className="flex items-start justify-between gap-2 rounded-xl border border-outline-variant/50 px-3 py-2 text-[12px]"
                                      >
                                        <div>
                                          <p className="font-semibold text-on-surface">
                                            {doc.tipoDocumento?.nombre ?? doc.tipo_documento_cod}
                                          </p>
                                          <p className="text-on-surface-variant">
                                            Orden {doc.orden}
                                            {doc.obligatorio ? ' · obligatorio' : ''}
                                          </p>
                                        </div>
                                        <Button
                                          variant="danger"
                                          disabled={saving}
                                          onClick={() =>
                                            void (async () => {
                                              if (!window.confirm('¿Eliminar este documento del paso?')) return;
                                              setSaving(true);
                                              try {
                                                await deleteStepDocument(step.id, doc.id);
                                                await loadStepDetails(step.id);
                                              } catch (err) {
                                                setError(
                                                  err instanceof Error
                                                    ? err.message
                                                    : 'No se pudo eliminar el documento',
                                                );
                                              } finally {
                                                setSaving(false);
                                              }
                                            })()
                                          }
                                        >
                                          <Trash2 size={14} />
                                        </Button>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </PaginatedDataView>
                            )}
                            <div className="grid gap-3 rounded-xl border border-dashed border-outline-variant p-3">
                              <div>
                                <Label>Tipo de documento</Label>
                                <Select
                                  value={docForm.tipo_documento_cod}
                                  onChange={(e) =>
                                    setDocForm((d) => ({ ...d, tipo_documento_cod: e.target.value }))
                                  }
                                >
                                  {tiposDocumento.map((tipo) => (
                                    <option key={tipo.codigo} value={tipo.codigo}>
                                      {tipo.nombre}
                                    </option>
                                  ))}
                                </Select>
                              </div>
                              <div>
                                <Label>Orden</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={docForm.orden}
                                  onChange={(e) => setDocForm((d) => ({ ...d, orden: e.target.value }))}
                                />
                              </div>
                              <label className="flex items-center gap-2 text-[13px]">
                                <input
                                  type="checkbox"
                                  checked={docForm.obligatorio}
                                  onChange={(e) =>
                                    setDocForm((d) => ({ ...d, obligatorio: e.target.checked }))
                                  }
                                />
                                Documento obligatorio
                              </label>
                              <Button
                                variant="secondary"
                                disabled={saving}
                                onClick={() => void submitDocument(step.id)}
                              >
                                <Plus size={14} />
                                Agregar documento
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
              }
            </PaginatedDataView>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
