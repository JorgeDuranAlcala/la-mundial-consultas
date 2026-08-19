import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileImage, Loader2, Plus, Trash2 } from 'lucide-react';
import { PaginatedDataView } from '@/components/PaginatedDataView';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ValidationAlert } from '@/components/ui/ValidationAlert';
import { Input, Label, Select } from '@/components/ui/Input';
import {
  createConfigDocumento,
  deleteConfigDocumento,
  fetchConfigDocumento,
  fetchDocumentUploadMeta,
  fetchTiposDocumento,
  updateConfigDocumento,
  type ConfigDocumentoUploadApi,
  type DocumentUploadMetaApi,
  type TipoDocumentoApi,
} from '@/lib/configuracion-api';
import {
  FORMATOS_DOCUMENTO,
  formatRuleSummary,
  mapConfigApiToRule,
  type FormatoDocumento,
  type ResolucionPreset,
} from '@/lib/document-upload-rules';
import { useAuth } from '@/stores/useStore';
import { useAdminCompaniaId } from '@/pages/admin/useAdminCompaniaId';

interface RuleFormState {
  tipo_documento_cod: string;
  max_size_mb: string;
  resolucion_preset: ResolucionPreset;
  min_ancho_px: string;
  min_alto_px: string;
  calidad_imagen: string;
  formatos_permitidos: FormatoDocumento[];
}

const emptyRuleForm = (): RuleFormState => ({
  tipo_documento_cod: '',
  max_size_mb: '5',
  resolucion_preset: 'HD_720',
  min_ancho_px: '',
  min_alto_px: '',
  calidad_imagen: '85',
  formatos_permitidos: ['PDF', 'JPG', 'PNG'],
});

export function DocumentUploadConfig() {
  const companiaId = useAdminCompaniaId();
  const selectedCompania = useAuth((s) => s.selectedCompania);

  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumentoApi[]>([]);
  const [meta, setMeta] = useState<DocumentUploadMetaApi | null>(null);
  const [rules, setRules] = useState<ConfigDocumentoUploadApi[]>([]);

  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingRules, setLoadingRules] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [ruleForm, setRuleForm] = useState<RuleFormState>(emptyRuleForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const tiposByCodigo = useMemo(
    () => new Map(tiposDocumento.map((t) => [t.codigo, t])),
    [tiposDocumento],
  );

  const usedTipoCodigos = useMemo(
    () => new Set(rules.map((r) => r.tipoDocumentoCod)),
    [rules],
  );

  const availableTipos = useMemo(
    () =>
      tiposDocumento.filter(
        (t) => editingId != null || !usedTipoCodigos.has(t.codigo),
      ),
    [tiposDocumento, usedTipoCodigos, editingId],
  );

  const presetOptions = useMemo(() => {
    const presets = meta?.resolucionPresets ?? {};
    return Object.entries(presets).map(([key, value]) => ({
      key: key as ResolucionPreset,
      label: value.label,
    }));
  }, [meta]);

  const sizeOptions = meta?.tamanoMbOpciones ?? [1, 2, 5, 10, 20, 50, 150];

  const loadRules = useCallback(async () => {
    if (!companiaId) return;
    setLoadingRules(true);
    setError(null);
    try {
      const rows = await fetchConfigDocumento(companiaId);
      setRules(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las reglas');
    } finally {
      setLoadingRules(false);
    }
  }, [companiaId]);

  useEffect(() => {
    let cancelled = false;
    setLoadingMeta(true);
    Promise.all([fetchTiposDocumento(), fetchDocumentUploadMeta()])
      .then(([tipos, metaRows]) => {
        if (cancelled) return;
        setTiposDocumento(tipos);
        setMeta(metaRows);
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

  const resetForm = () => {
    setRuleForm(emptyRuleForm());
    setEditingId(null);
    setShowForm(false);
  };

  const openCreate = () => {
    setRuleForm(emptyRuleForm());
    setEditingId(null);
    setShowForm(true);
    setError(null);
  };

  const openEdit = (row: ConfigDocumentoUploadApi) => {
    setEditingId(row.configId);
    setRuleForm({
      tipo_documento_cod: row.tipoDocumentoCod,
      max_size_mb: String(row.maxSizeMb),
      resolucion_preset: row.resolucionPreset as ResolucionPreset,
      min_ancho_px: row.minAnchoPx != null ? String(row.minAnchoPx) : '',
      min_alto_px: row.minAltoPx != null ? String(row.minAltoPx) : '',
      calidad_imagen: row.calidadImagen != null ? String(row.calidadImagen) : '85',
      formatos_permitidos: (row.formatosPermitidos?.length
        ? row.formatosPermitidos
        : ['PDF', 'JPG', 'PNG']) as FormatoDocumento[],
    });
    setShowForm(true);
    setError(null);
  };

  const toggleFormato = (formato: FormatoDocumento) => {
    setRuleForm((prev) => {
      const has = prev.formatos_permitidos.includes(formato);
      const next = has
        ? prev.formatos_permitidos.filter((f) => f !== formato)
        : [...prev.formatos_permitidos, formato];
      return { ...prev, formatos_permitidos: next.length ? next : [formato] };
    });
  };

  const handleSave = async () => {
    if (!companiaId) return;
    if (!editingId && !ruleForm.tipo_documento_cod) {
      setError('Seleccione un tipo de documento');
      return;
    }
    if (!ruleForm.formatos_permitidos.length) {
      setError('Seleccione al menos un formato permitido');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        max_size_mb: Number(ruleForm.max_size_mb),
        resolucion_preset: ruleForm.resolucion_preset,
        min_ancho_px:
          ruleForm.resolucion_preset === 'CUSTOM' && ruleForm.min_ancho_px
            ? Number(ruleForm.min_ancho_px)
            : undefined,
        min_alto_px:
          ruleForm.resolucion_preset === 'CUSTOM' && ruleForm.min_alto_px
            ? Number(ruleForm.min_alto_px)
            : undefined,
        calidad_imagen: Number(ruleForm.calidad_imagen) || 85,
        formatos_permitidos: ruleForm.formatos_permitidos,
      };

      if (editingId) {
        await updateConfigDocumento(editingId, payload);
      } else {
        await createConfigDocumento({
          compania_id: companiaId,
          tipo_documento_cod: ruleForm.tipo_documento_cod,
          ...payload,
        });
      }
      resetForm();
      await loadRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Desactivar esta regla de documento?')) return;
    setSaving(true);
    setError(null);
    try {
      await deleteConfigDocumento(id);
      if (editingId === id) resetForm();
      await loadRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la regla');
    } finally {
      setSaving(false);
    }
  };

  if (!companiaId) {
    return (
      <p className="text-[13px] text-on-surface-variant">
        Seleccione una compañía en el encabezado para configurar documentos.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileImage className="h-5 w-5 text-secondary" />
            <div>
              <h2 className="text-[15px] font-bold text-on-surface">
                Reglas de carga de documentos
              </h2>
              <p className="text-[12px] text-on-surface-variant">
                {selectedCompania?.nombre ?? `Compañía #${companiaId}`} · tamaño, resolución y formatos
              </p>
            </div>
          </div>
          <Button variant="accent" onClick={openCreate} disabled={loadingMeta || saving}>
            <Plus className="mr-1 h-4 w-4" />
            Nueva regla
          </Button>
        </CardHeader>
        <CardBody className="space-y-4">
          {error && (
            <ValidationAlert title="No se pudo completar la operación" messages={error} />
          )}

          {showForm && (
            <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 space-y-4">
              <h3 className="text-[14px] font-bold text-on-surface">
                {editingId ? 'Editar regla' : 'Nueva regla por tipo de documento'}
              </h3>

              {!editingId && (
                <div>
                  <Label htmlFor="tipo-doc">Tipo de documento</Label>
                  <Select
                    id="tipo-doc"
                    value={ruleForm.tipo_documento_cod}
                    onChange={(e) =>
                      setRuleForm((p) => ({ ...p, tipo_documento_cod: e.target.value }))
                    }
                  >
                    <option value="">Seleccione…</option>
                    {availableTipos.map((t) => (
                      <option key={t.codigo} value={t.codigo}>
                        {t.nombre} ({t.codigo})
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Label htmlFor="max-size">Tamaño máximo (MB)</Label>
                  <Select
                    id="max-size"
                    value={ruleForm.max_size_mb}
                    onChange={(e) =>
                      setRuleForm((p) => ({ ...p, max_size_mb: e.target.value }))
                    }
                  >
                    {sizeOptions.map((mb) => (
                      <option key={mb} value={String(mb)}>
                        {mb} MB
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label htmlFor="resolucion">Resolución mínima</Label>
                  <Select
                    id="resolucion"
                    value={ruleForm.resolucion_preset}
                    onChange={(e) =>
                      setRuleForm((p) => ({
                        ...p,
                        resolucion_preset: e.target.value as ResolucionPreset,
                      }))
                    }
                  >
                    {presetOptions.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label htmlFor="calidad">Calidad imagen JPEG (%)</Label>
                  <Input
                    id="calidad"
                    type="number"
                    min={1}
                    max={100}
                    value={ruleForm.calidad_imagen}
                    onChange={(e) =>
                      setRuleForm((p) => ({ ...p, calidad_imagen: e.target.value }))
                    }
                  />
                </div>
              </div>

              {ruleForm.resolucion_preset === 'CUSTOM' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="min-ancho">Ancho mínimo (px)</Label>
                    <Input
                      id="min-ancho"
                      type="number"
                      min={0}
                      value={ruleForm.min_ancho_px}
                      onChange={(e) =>
                        setRuleForm((p) => ({ ...p, min_ancho_px: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="min-alto">Alto mínimo (px)</Label>
                    <Input
                      id="min-alto"
                      type="number"
                      min={0}
                      value={ruleForm.min_alto_px}
                      onChange={(e) =>
                        setRuleForm((p) => ({ ...p, min_alto_px: e.target.value }))
                      }
                    />
                  </div>
                </div>
              )}

              <div>
                <Label>Formatos permitidos</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {FORMATOS_DOCUMENTO.map((f) => {
                    const active = ruleForm.formatos_permitidos.includes(f);
                    return (
                      <Button
                        key={f}
                        type="button"
                        className="px-3 py-1 text-[12px]"
                        variant={active ? 'accent' : 'outline'}
                        onClick={() => toggleFormato(f)}
                      >
                        {f}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="accent" onClick={() => void handleSave()} disabled={saving}>
                  {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                  Guardar
                </Button>
                <Button variant="outline" onClick={resetForm} disabled={saving}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {loadingMeta || loadingRules ? (
            <div className="flex items-center gap-2 text-[13px] text-on-surface-variant">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando reglas…
            </div>
          ) : rules.length === 0 ? (
            <p className="text-[13px] text-on-surface-variant">
              No hay reglas configuradas. Cree una para cada tipo de documento del portal.
            </p>
          ) : (
            <PaginatedDataView items={rules} className="space-y-2">
              {(pageRules) =>
                pageRules.map((row) => {
                  const label =
                    row.tipoDocumento?.nombre ??
                    tiposByCodigo.get(row.tipoDocumentoCod)?.nombre ??
                    row.tipoDocumentoCod;
                  const summary = formatRuleSummary(mapConfigApiToRule(row));
                  return (
                    <div
                      key={row.configId}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface px-4 py-3"
                    >
                      <div>
                        <p className="text-[14px] font-semibold text-on-surface">{label}</p>
                        <p className="text-[12px] text-on-surface-variant">{summary}</p>
                        <p className="text-[11px] text-on-surface-variant/80">
                          Código: {row.tipoDocumentoCod}
                          {row.calidadImagen != null ? ` · Calidad ${row.calidadImagen}%` : ''}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="px-3 py-1 text-[12px]"
                          onClick={() => openEdit(row)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          className="px-3 py-1 text-[12px]"
                          onClick={() => void handleDelete(row.configId)}
                          disabled={saving}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
