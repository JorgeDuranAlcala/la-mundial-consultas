import { useCallback, useEffect, useState } from 'react';
import {
  Loader2,
  FolderOpen,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Archive,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { FormPageLayout } from '@/components/layout/FormPageLayout';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/api';

interface Remesa {
  id: number;
  codigoRemesa: string;
  proveedorId: number;
  periodoDesde: string;
  periodohasta: string;
  montoTotal: number;
  estado: 'ABIERTA' | 'CERRADA' | 'LIQUIDADA' | 'CON_INCIDENCIAS';
  cerradaEn: string | null;
  creadoEn: string;
  notas?: string | null;
}

interface RemesaDetalle {
  remesaId: number;
  prestacionId: number;
  monto: number;
  prestacion?: {
    id: number;
    casoId: number;
    fechaHoraPrestacion: string;
    caso?: {
      numeroCaso: string;
      tipoServicio?: { nombre: string };
      beneficiario?: {
        nombres: string;
        apellidos: string;
        cedula: string;
      };
    };
  };
}

export function RemesasPage() {
  const [remesas, setRemesas] = useState<Remesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected remesa details
  const [selectedRemesa, setSelectedRemesa] = useState<Remesa | null>(null);
  const [detalles, setDetalles] = useState<RemesaDetalle[]>([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // Actions states
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadRemesas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<any>('/v1/remesa');
      const list = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
      // Sort: Open ones first, then newest
      list.sort((a: Remesa, b: Remesa) => {
        if (a.estado === b.estado) {
          return new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime();
        }
        return a.estado === 'ABIERTA' ? -1 : 1;
      });
      setRemesas(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el listado de remesas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRemesas();
  }, [loadRemesas]);

  const loadDetalle = useCallback(async (remesa: Remesa) => {
    setLoadingDetalle(true);
    try {
      // 1. Fetch details
      const detailRes = await apiFetch<any>(`/v1/remesa-detalle?filter[remesa_id]=${remesa.id}`);
      const list: RemesaDetalle[] = Array.isArray(detailRes)
        ? detailRes
        : (detailRes && Array.isArray(detailRes.data) ? detailRes.data : []);

      // 2. Fetch linked prestacion details and cases
      const populated = await Promise.all(
        list.map(async (item) => {
          try {
            const prestacion = await apiFetch<any>(`/v1/prestacion-servicio?filter[id]=${item.prestacionId}`);
            const prestObj = Array.isArray(prestacion) ? prestacion[0] : (prestacion?.data?.[0] || prestacion);
            
            if (prestObj?.casoId) {
              const caso = await apiFetch<any>(`/v1/caso-base?filter[id]=${prestObj.casoId}`);
              prestObj.caso = Array.isArray(caso) ? caso[0] : (caso?.data?.[0] || caso);
              
              if (prestObj.caso?.beneficiarioId) {
                const benef = await apiFetch<any>(`/v1/beneficiario?filter[id]=${prestObj.caso.beneficiarioId}`);
                prestObj.caso.beneficiario = Array.isArray(benef) ? benef[0] : (benef?.data?.[0] || benef);
              }
              if (prestObj.caso?.tipoServicioCod) {
                const ts = await apiFetch<any>(`/v1/cat-tipo-servicio-carta?filter[codigo]=${prestObj.caso.tipoServicioCod}`);
                prestObj.caso.tipoServicio = Array.isArray(ts) ? ts[0] : (ts?.data?.[0] || ts);
              }
            }
            return { ...item, prestacion: prestObj };
          } catch {
            return item;
          }
        })
      );
      setDetalles(populated);
    } catch (err) {
      console.error('Error al cargar detalle de remesa:', err);
    } finally {
      setLoadingDetalle(false);
    }
  }, []);

  const handleSelectRemesa = (remesa: Remesa) => {
    setSelectedRemesa(remesa);
    void loadDetalle(remesa);
  };

  const handleExclude = async (prestacionId: number) => {
    if (!selectedRemesa) return;
    if (!window.confirm('¿Confirma que desea excluir esta prestación de la remesa actual?')) return;

    setSubmittingAction(true);
    try {
      await apiFetch('/casos/remesa/excluir', {
        method: 'POST',
        body: JSON.stringify({
          remesaId: selectedRemesa.id,
          prestacionId,
        }),
      });
      // Reload details and remesas
      await loadDetalle(selectedRemesa);
      await loadRemesas();
      // Update selected remesa values in local state
      setSelectedRemesa((prev) => {
        if (!prev) return null;
        const updated = remesas.find((r) => r.id === prev.id);
        return updated || prev;
      });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Error al excluir la prestación');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCloseRemesa = async () => {
    if (!selectedRemesa) return;
    if (!window.confirm('¿Confirma que desea cerrar esta remesa? Una vez cerrada, se enviará para liquidación y no podrá agregar o quitar casos.')) return;

    setSubmittingAction(true);
    try {
      await apiFetch('/casos/remesa/cerrar', {
        method: 'POST',
        body: JSON.stringify({
          remesaId: selectedRemesa.id,
        }),
      });
      setSelectedRemesa(null);
      setDetalles([]);
      await loadRemesas();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Error al cerrar la remesa');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <FormPageLayout
      header={
        <PageHeader
          title="Facturación y Remesas"
          subtitle="Consulte, depure y cierre sus remesas de facturación de servicios completados"
          icon={Archive}
          breadcrumbs={[{ label: 'Inicio', to: '/app' }, { label: 'Remesas de facturación' }]}
        />
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Remesas List Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <h2 className="section-title">Remesas Generadas</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {loading && (
              <div className="flex items-center gap-2 text-[13px] text-on-surface-variant py-4">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Cargando remesas…
              </div>
            )}

            {error && (
              <p className="text-center text-xs text-rose-500 italic py-4">
                {error}
              </p>
            )}

            {!loading && remesas.length === 0 && (
              <p className="text-center text-xs text-on-surface-variant italic py-6">
                No hay remesas registradas para este proveedor.
              </p>
            )}

            {!loading &&
              remesas.map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleSelectRemesa(r)}
                  className={`cursor-pointer rounded-xl border p-3.5 transition-all text-xs flex flex-col gap-1.5 ${
                    selectedRemesa?.id === r.id
                      ? 'border-primary bg-primary-fixed/30 ring-1 ring-primary'
                      : 'border-outline-variant/60 hover:bg-surface-container-low'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-on-surface">{r.codigoRemesa}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        r.estado === 'ABIERTA'
                          ? 'bg-amber-100 text-amber-800'
                          : r.estado === 'LIQUIDADA'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.estado === 'CON_INCIDENCIAS'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {r.estado.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-on-surface-variant">
                    <Calendar size={13} className="shrink-0" />
                    <span>
                      {r.periodoDesde} al {r.periodohasta}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-outline-variant/30 text-on-surface">
                    <span className="font-semibold text-on-surface-variant">Total:</span>
                    <span className="font-extrabold text-primary">
                      USD {(r.montoTotal || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
          </CardBody>
        </Card>

        {/* Remesa Detail Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="section-title">
              {selectedRemesa ? `Detalle: ${selectedRemesa.codigoRemesa}` : 'Detalle de Remesa'}
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            {!selectedRemesa && (
              <div className="flex flex-col items-center justify-center py-20 text-center text-on-surface-variant">
                <FolderOpen size={40} className="text-outline mb-2" />
                <p className="text-[13px] italic">Seleccione una remesa para revisar o auditar sus prestaciones.</p>
              </div>
            )}

            {selectedRemesa && (
              <>
                {/* Remesa Header Overview */}
                <div className="grid gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-4 sm:grid-cols-3 text-xs">
                  <div className="space-y-1">
                    <p className="text-on-surface-variant uppercase font-semibold">Estado de la remesa</p>
                    <p className="font-bold text-on-surface flex items-center gap-1">
                      {selectedRemesa.estado === 'ABIERTA' ? (
                        <>
                          <AlertCircle size={14} className="text-amber-500" />
                          Abierta (Editable)
                        </>
                      ) : selectedRemesa.estado === 'LIQUIDADA' ? (
                        <>
                          <CheckCircle size={14} className="text-emerald-500" />
                          Liquidada
                        </>
                      ) : selectedRemesa.estado === 'CON_INCIDENCIAS' ? (
                        <>
                          <XCircle size={14} className="text-rose-500" />
                          Con Incidencias
                        </>
                      ) : (
                        <>
                          <CheckCircle size={14} className="text-blue-500" />
                          Cerrada (Presentada)
                        </>
                      )}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-on-surface-variant uppercase font-semibold">Periodo de facturación</p>
                    <p className="font-bold text-on-surface">
                      {selectedRemesa.periodoDesde} / {selectedRemesa.periodohasta}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-on-surface-variant uppercase font-semibold font-bold">Monto Total Estimado</p>
                    <p className="font-extrabold text-sm text-primary">
                      USD {(selectedRemesa.montoTotal || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {selectedRemesa.estado !== 'ABIERTA' && selectedRemesa.notas && (
                  <div className={`p-4 rounded-xl border text-xs leading-relaxed space-y-1.5 ${
                    selectedRemesa.estado === 'LIQUIDADA'
                      ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800'
                      : 'border-rose-200 bg-rose-50/70 text-rose-800'
                  }`}>
                    <div className="flex items-center gap-1.5 font-bold">
                      {selectedRemesa.estado === 'LIQUIDADA' ? (
                        <CheckCircle size={15} />
                      ) : (
                        <AlertCircle size={15} />
                      )}
                      Resultado de la Auditoría IA de Siniestros
                    </div>
                    <pre className="whitespace-pre-wrap font-sans mt-1">
                      {selectedRemesa.notas}
                    </pre>
                  </div>
                )}

                {/* Prestaciones list */}
                <div className="space-y-3">
                  <h3 className="font-bold text-xs text-on-surface uppercase tracking-wide">Prestaciones de Servicio Incluidas</h3>
                  
                  {loadingDetalle && (
                    <div className="flex items-center gap-2 text-[12px] text-on-surface-variant py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Cargando detalles de prestaciones…
                    </div>
                  )}

                  {!loadingDetalle && detalles.length === 0 && (
                    <p className="text-center text-xs text-on-surface-variant italic py-6">
                      No hay casos vinculados a esta remesa.
                    </p>
                  )}

                  {!loadingDetalle && detalles.length > 0 && (
                    <div className="overflow-x-auto rounded-2xl border border-outline-variant">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant font-semibold">
                            <th className="p-3">Caso / Siniestro</th>
                            <th className="p-3">Servicio</th>
                            <th className="p-3">Paciente / Beneficiario</th>
                            <th className="p-3 text-right">Monto</th>
                            {selectedRemesa.estado === 'ABIERTA' && <th className="p-3 text-center w-24">Acción</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {detalles.map((d) => (
                            <tr
                              key={d.prestacionId}
                              className="border-b border-outline-variant/60 hover:bg-surface-container-lowest/30"
                            >
                              <td className="p-3 font-bold text-on-surface">
                                {d.prestacion?.caso?.numeroCaso || `Caso #${d.prestacion?.casoId}`}
                              </td>
                              <td className="p-3 text-on-surface-variant">
                                {d.prestacion?.caso?.tipoServicio?.nombre || '—'}
                              </td>
                              <td className="p-3">
                                {d.prestacion?.caso?.beneficiario
                                  ? `${d.prestacion.caso.beneficiario.nombres} ${d.prestacion.caso.beneficiario.apellidos}`
                                  : '—'}
                                <p className="text-[10px] text-on-surface-variant mt-0.5">
                                  {d.prestacion?.caso?.beneficiario?.cedula || ''}
                                </p>
                              </td>
                              <td className="p-3 text-right font-extrabold text-primary">
                                USD {(d.monto || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                              </td>
                              {selectedRemesa.estado === 'ABIERTA' && (
                                <td className="p-3 text-center">
                                  <Button
                                    variant="danger"
                                    className="text-[10px] px-2 py-1 h-auto"
                                    disabled={submittingAction}
                                    onClick={() => void handleExclude(d.prestacionId)}
                                  >
                                    Excluir
                                  </Button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Footer buttons */}
                {selectedRemesa.estado === 'ABIERTA' && (
                  <div className="pt-4 border-t border-outline-variant/60 flex justify-end">
                    <Button
                      variant="accent"
                      disabled={submittingAction || detalles.length === 0}
                      onClick={() => void handleCloseRemesa()}
                    >
                      {submittingAction ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-1.5 h-4 w-4" />
                      )}
                      Presentar y Cerrar Remesa
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </FormPageLayout>
  );
}
