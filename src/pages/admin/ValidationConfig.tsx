import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { PaginatedDataView } from '@/components/PaginatedDataView';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ValidationAlert } from '@/components/ui/ValidationAlert';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import {
  createConfigValidacion,
  deleteConfigValidacion,
  fetchConfigValidacion,
  fetchCriteriosValidacion,
  fetchServiceSteps,
  fetchTiposServicio,
  PORTAL_TIPOS_SERVICIO,
  updateConfigValidacion,
  type ConfigValidacionApi,
  type CriterioValidacionApi,
  type ServiceStepApi,
  type TipoServicioApi,
} from '@/lib/configuracion-api';
import { useAuth } from '@/stores/useStore';
import { useAdminCompaniaId } from '@/pages/admin/useAdminCompaniaId';

interface RuleFormState {
  criterio_id: string;
  orden_ejecucion: string;
  es_obligatorio: boolean;
  regla_validacion: string;
}

const emptyRuleForm = (nextOrder: number): RuleFormState => ({
  criterio_id: '',
  orden_ejecucion: String(nextOrder),
  es_obligatorio: true,
  regla_validacion: '',
});

function buildDefaultRegla(criterio?: CriterioValidacionApi): string {
  if (!criterio) return '';
  if (criterio.descripcion?.trim()) return criterio.descripcion.trim();
  return `Validar que los documentos cumplan el criterio «${criterio.nombre}».`;
}

export function ValidationConfig() {
  const companiaId = useAdminCompaniaId();
  const selectedCompania = useAuth((s) => s.selectedCompania);

  const [tiposServicio, setTiposServicio] = useState<TipoServicioApi[]>([]);
  const [criterios, setCriterios] = useState<CriterioValidacionApi[]>([]);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string>(PORTAL_TIPOS_SERVICIO[0]);
  const [rules, setRules] = useState<ConfigValidacionApi[]>([]);
  const [workflowSteps, setWorkflowSteps] = useState<ServiceStepApi[]>([]);

  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingRules, setLoadingRules] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [ruleForm, setRuleForm] = useState<RuleFormState>(emptyRuleForm(1));
  const [editingId, setEditingId] = useState<number | null>(null);

  const tiposPortal = useMemo(() => {
    const byCodigo = new Map(tiposServicio.map((t) => [t.codigo, t]));
    return PORTAL_TIPOS_SERVICIO.map((codigo) => byCodigo.get(codigo)).filter(
      (t): t is TipoServicioApi => Boolean(t),
    );
  }, [tiposServicio]);

  const stepsByOrder = useMemo(() => {
    return new Map(workflowSteps.map((s) => [s.display_order, s]));
  }, [workflowSteps]);

  const criteriosById = useMemo(
    () => new Map(criterios.map((c) => [Number(c.criterio_id), c])),
    [criterios],
  );

  const usedCriterioIds = useMemo(
    () => new Set(rules.map((r) => Number(r.criterio_id))),
    [rules],
  );

  const availableCriterios = useMemo(
    () =>
      criterios.filter(
        (c) => editingId != null || !usedCriterioIds.has(Number(c.criterio_id)),
      ),
    [criterios, usedCriterioIds, editingId],
  );

  const selectedCriterio = ruleForm.criterio_id
    ? criteriosById.get(Number(ruleForm.criterio_id))
    : undefined;

  const loadRules = useCallback(async () => {
    if (!companiaId) return;
    setLoadingRules(true);
    setError(null);
    try {
      const [rows, steps] = await Promise.all([
        fetchConfigValidacion(companiaId, tipoSeleccionado),
        fetchServiceSteps(companiaId, tipoSeleccionado),
      ]);
      setRules(rows);
      setWorkflowSteps(steps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las validaciones');
    } finally {
      setLoadingRules(false);
    }
  }, [companiaId, tipoSeleccionado]);

  useEffect(() => {
    let cancelled = false;
    setLoadingMeta(true);
    Promise.all([fetchTiposServicio(), fetchCriteriosValidacion()])
      .then(([servicios, criteriosRows]) => {
        if (cancelled) return;
        setTiposServicio(servicios);
        setCriterios(criteriosRows);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar el catálogo');
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
    void loadRules();
  }, [loadRules]);

  const startCreate = () => {
    const nextOrder =
      rules.reduce((max, r) => Math.max(max, Number(r.orden_ejecucion)), 0) + 1;
    setRuleForm(emptyRuleForm(nextOrder));
    setEditingId(null);
    setShowForm(true);
    setError(null);
  };

  const startEdit = (rule: ConfigValidacionApi) => {
    setRuleForm({
      criterio_id: String(rule.criterio_id),
      orden_ejecucion: String(rule.orden_ejecucion),
      es_obligatorio: rule.es_obligatorio,
      regla_validacion: rule.regla_validacion ?? '',
    });
    setEditingId(rule.config_id);
    setShowForm(true);
    setError(null);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setRuleForm(emptyRuleForm(1));
  };

  const handleCriterioChange = (criterioId: string) => {
    const criterio = criteriosById.get(Number(criterioId));
    setRuleForm((s) => ({
      ...s,
      criterio_id: criterioId,
      regla_validacion:
        s.regla_validacion.trim() || !criterio
          ? s.regla_validacion
          : buildDefaultRegla(criterio),
    }));
  };

  const handleSave = async () => {
    if (!companiaId) return;

    const validationErrors: string[] = [];
    if (!ruleForm.criterio_id) {
      validationErrors.push('Seleccione un criterio de validación');
    }
    if (!ruleForm.regla_validacion.trim()) {
      validationErrors.push('Escriba la regla que la IA debe aplicar al validar documentos');
    }
    if (validationErrors.length) {
      setError(validationErrors.join('\n'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        orden_ejecucion: Number(ruleForm.orden_ejecucion),
        es_obligatorio: ruleForm.es_obligatorio,
        regla_validacion: ruleForm.regla_validacion.trim(),
      };

      if (editingId) {
        await updateConfigValidacion(editingId, payload);
      } else {
        await createConfigValidacion({
          compania_id: companiaId,
          tipo_servicio_cod: tipoSeleccionado,
          criterio_id: Number(ruleForm.criterio_id),
          ...payload,
          activo: true,
        });
      }

      cancelForm();
      await loadRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la regla');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Desactivar esta regla de validación?')) return;
    setSaving(true);
    setError(null);
    try {
      await deleteConfigValidacion(id);
      await loadRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la regla');
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
              <h2 className="section-title">Reglas de validación</h2>
              <p className="section-subtitle">
                {selectedCompania?.nombre ?? 'Empresa actual'} · criterios IA por tipo de servicio
              </p>
            </div>
            <Button variant="accent" onClick={startCreate} disabled={saving || loadingRules}>
              <Plus size={16} />
              Nueva regla
            </Button>
          </div>
        </CardHeader>
        <CardBody className="space-y-5">
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

          {workflowSteps.length > 0 && (
            <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-[12px] text-on-surface-variant">
              <p className="font-bold text-on-surface">Referencia de pasos del workflow</p>
              <p className="mt-1">
                Use el mismo número de <strong>orden de ejecución</strong> que el{' '}
                <strong>display_order</strong> del paso donde debe aplicarse la regla:
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {[...workflowSteps]
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((step) => (
                    <li
                      key={step.id}
                      className="rounded-full border border-outline-variant bg-surface px-3 py-1"
                    >
                      {step.display_order} · {step.name}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {error && (
            <ValidationAlert
              title={
                error.includes('\n')
                  ? 'No puede guardar hasta completar lo siguiente'
                  : 'No se pudo completar la operación'
              }
              messages={error.includes('\n') ? error.split('\n') : error}
            />
          )}

          {showForm && (
            <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4">
              <h3 className="mb-4 font-bold text-primary">
                {editingId ? 'Editar regla' : 'Nueva regla de validación'}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Criterio</Label>
                  <Select
                    value={ruleForm.criterio_id}
                    disabled={Boolean(editingId)}
                    onChange={(e) => handleCriterioChange(e.target.value)}
                  >
                    <option value="">Seleccione…</option>
                    {availableCriterios.map((c) => (
                      <option key={c.criterio_id} value={c.criterio_id}>
                        {c.nombre} ({c.clave})
                      </option>
                    ))}
                  </Select>
                  {selectedCriterio?.descripcion && (
                    <p className="mt-1 text-[11px] text-on-surface-variant">
                      {selectedCriterio.descripcion}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Orden de ejecución</Label>
                  <Input
                    type="number"
                    min={0}
                    value={ruleForm.orden_ejecucion}
                    onChange={(e) =>
                      setRuleForm((s) => ({ ...s, orden_ejecucion: e.target.value }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Regla para la IA</Label>
                  <Textarea
                    rows={4}
                    placeholder="Ej: La factura debe estar legible, a nombre del titular de la póliza, con fecha dentro de vigencia y monto coincidente con el comprobante."
                    value={ruleForm.regla_validacion}
                    onChange={(e) =>
                      setRuleForm((s) => ({ ...s, regla_validacion: e.target.value }))
                    }
                  />
                  <p className="mt-1 text-[11px] text-on-surface-variant">
                    Describa en lenguaje natural qué debe verificar la IA en los documentos del caso.
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      checked={ruleForm.es_obligatorio}
                      onChange={(e) =>
                        setRuleForm((s) => ({ ...s, es_obligatorio: e.target.checked }))
                      }
                    />
                    Regla obligatoria (bloquea avance si falla)
                  </label>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => void handleSave()} disabled={saving}>
                  {saving ? 'Guardando…' : editingId ? 'Actualizar' : 'Crear regla'}
                </Button>
                <Button variant="outline" onClick={cancelForm} disabled={saving}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {loadingRules ? (
            <div className="flex items-center gap-2 py-8 text-on-surface-variant">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando reglas…
            </div>
          ) : rules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-outline-variant py-10 text-center text-[13px] text-on-surface-variant">
              No hay reglas configuradas para este servicio en {selectedCompania?.nombre}.
            </div>
          ) : (
            <PaginatedDataView items={rules}>
              {(pageRules) => (
                <div className="overflow-x-auto rounded-2xl border border-outline-variant">
                  <table className="min-w-full text-left text-[13px]">
                    <thead className="bg-surface-container-low text-on-surface-variant">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Criterio</th>
                        <th className="px-4 py-3 font-semibold">Orden</th>
                        <th className="px-4 py-3 font-semibold">Paso ref.</th>
                        <th className="px-4 py-3 font-semibold">Obligatorio</th>
                        <th className="px-4 py-3 font-semibold">Regla IA</th>
                        <th className="px-4 py-3 font-semibold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRules.map((rule) => {
                        const step = stepsByOrder.get(Number(rule.orden_ejecucion));
                        return (
                          <tr key={rule.config_id} className="border-t border-outline-variant/60">
                            <td className="px-4 py-3">
                              <p className="font-medium text-on-surface">
                                {rule.criterio?.nombre ?? rule.criterio_id}
                              </p>
                              <p className="text-[11px] text-on-surface-variant">
                                {rule.criterio?.clave}
                              </p>
                            </td>
                            <td className="px-4 py-3">{rule.orden_ejecucion}</td>
                            <td className="px-4 py-3 text-on-surface-variant">
                              {step ? step.name : '—'}
                            </td>
                            <td className="px-4 py-3">
                              {rule.es_obligatorio ? 'Sí' : 'No'}
                            </td>
                            <td className="max-w-xs px-4 py-3 text-[12px] text-on-surface-variant">
                              {rule.regla_validacion ?? '—'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  disabled={saving}
                                  onClick={() => startEdit(rule)}
                                >
                                  Editar
                                </Button>
                                <Button
                                  variant="outline"
                                  disabled={saving}
                                  onClick={() => void handleDelete(rule.config_id)}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </PaginatedDataView>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex gap-3 text-[12px] text-on-surface-variant">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
          <p>
            Cada regla combina un <strong>criterio</strong> del catálogo con una{' '}
            <strong>instrucción en texto</strong> que la IA usará al validar documentos. Las reglas
            se evalúan al avanzar pasos del workflow cuando su orden es ≤ al paso actual.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
