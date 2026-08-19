import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Eye, Search, Stethoscope } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { Input } from '@/components/ui/Input';
import { SERVICE_LABELS, STATUS_LABELS, type ServiceRequest } from '@/lib/types';
import { useAppStore, useAuth } from '@/stores/useStore';

function matchesSearch(req: ServiceRequest, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    req.id,
    req.casoId != null ? String(req.casoId) : '',
    SERVICE_LABELS[req.type] ?? req.type,
    req.beneficiaryName,
    req.cedula,
    STATUS_LABELS[req.status] ?? req.status,
    req.estadoCod,
    req.tipoServicioCod,
    req.notes,
    req.amount != null ? String(req.amount) : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function ColaMedicaPage() {
  const user = useAuth((s) => s.user);
  const requests = useAppStore((s) => s.requests);
  const isLoadingCasos = useAppStore((s) => s.isLoadingCasos);
  const updateCasoStatus = useAppStore((s) => s.updateCasoStatus);
  const [search, setSearch] = useState('');

  const queue = useMemo(
    () =>
      requests
        .filter((r) => r.status === 'analisis-medico' || r.requiresDoctor)
        .filter((r) => matchesSearch(r, search)),
    [requests, search],
  );

  const handleStatus = async (
    casoId: number | undefined,
    status: 'recaudo-pendiente' | 'rechazado' | 'aprobado',
    notes: string,
  ) => {
    if (!casoId) return;
    await updateCasoStatus(casoId, status, notes, user ? Number(user.id) : undefined);
  };

  return (
    <div className="step-enter">
      <PageHeader
        title="Cola de evaluación médica"
        subtitle="Casos escalados por IA cuando requieren intervención humana"
        icon={Stethoscope}
        breadcrumbs={[{ label: 'Inicio', to: '/app' }, { label: 'Cola médica' }]}
      />

      <div className="mb-4 max-w-md">
        <label className="mb-1.5 block text-[12px] font-semibold text-on-surface-variant">
          Buscar caso
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <Input
            className="pl-9"
            placeholder="N° caso, beneficiario, cédula o estatus…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        {isLoadingCasos && (
          <Card>
            <CardBody className="py-12 text-center text-on-surface-variant">
              Cargando casos…
            </CardBody>
          </Card>
        )}
        {!isLoadingCasos && queue.length === 0 && (
          <Card>
            <CardBody className="py-12 text-center text-on-surface-variant">
              {search.trim()
                ? 'Ningún caso coincide con la búsqueda'
                : 'No hay casos pendientes de evaluación médica'}
            </CardBody>
          </Card>
        )}
        {queue.map((req) => (
          <Card key={req.id}>
            <CardBody className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <StatusBadge status={req.status} />
                  <span className="text-[13px] text-on-surface-variant">{req.id}</span>
                </div>
                <p className="font-bold text-primary">{SERVICE_LABELS[req.type]}</p>
                <p className="text-[13px] text-on-surface-variant">
                  {req.beneficiaryName} · {req.cedula}
                </p>
                {req.amount != null && (
                  <p className="mt-1 text-[13px] text-on-surface">
                    Monto: USD {req.amount.toLocaleString('es-VE')}
                  </p>
                )}
                {req.notes && <p className="mt-2 text-[13px] text-accent-dark">{req.notes}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {req.casoId && (
                  <Link to={`/app/solicitudes/${req.casoId}`}>
                    <Button variant="secondary">
                      <Eye className="mr-1 h-4 w-4" />
                      Ver detalle y documentos
                    </Button>
                  </Link>
                )}
                <Button
                  variant="outline"
                  onClick={() =>
                    void handleStatus(req.casoId, 'recaudo-pendiente', 'Médico solicita recaudos adicionales')
                  }
                >
                  Solicitar recaudos
                </Button>
                <Button
                  variant="danger"
                  onClick={() => void handleStatus(req.casoId, 'rechazado', 'Rechazo médico')}
                >
                  Rechazar
                </Button>
                <Button onClick={() => void handleStatus(req.casoId, 'aprobado', 'Aprobado por médico auditor')}>
                  Aprobar
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function SolicitudesPage() {
  const requests = useAppStore((s) => s.requests);
  const isLoadingCasos = useAppStore((s) => s.isLoadingCasos);
  const casosError = useAppStore((s) => s.casosError);
  const refreshCasos = useAppStore((s) => s.refreshCasos);
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => requests.filter((r) => matchesSearch(r, search)),
    [requests, search],
  );

  return (
    <div className="step-enter">
      <PageHeader
        title="Solicitudes y casos"
        subtitle="Trazabilidad completa · estatus en tiempo real"
        icon={ClipboardList}
        breadcrumbs={[{ label: 'Inicio', to: '/app' }, { label: 'Solicitudes' }]}
        actions={
          <Button variant="outline" onClick={() => void refreshCasos()}>
            Actualizar
          </Button>
        }
      />

      <div className="surface-card overflow-hidden p-0">
        <div className="border-b border-outline-variant px-6 py-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="section-title">Registro de casos</h2>
              <p className="section-subtitle">
                {isLoadingCasos
                  ? 'Cargando…'
                  : search.trim()
                    ? `${filtered.length} de ${requests.length} solicitudes`
                    : `${requests.length} solicitudes en el sistema`}
              </p>
            </div>
            <div className="w-full max-w-sm">
              <label className="mb-1.5 block text-[12px] font-semibold text-on-surface-variant">
                Buscar
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                <Input
                  className="pl-9"
                  placeholder="N° caso, servicio, beneficiario, cédula…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          {casosError && <p className="mt-2 text-[13px] text-error">{casosError}</p>}
        </div>
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low/80">
                <th>N° caso</th>
                <th>Servicio</th>
                <th>Beneficiario</th>
                <th>Monto</th>
                <th>Estatus</th>
                <th>Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {!isLoadingCasos && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-on-surface-variant">
                    {search.trim()
                      ? 'Ninguna solicitud coincide con la búsqueda'
                      : 'No hay solicitudes registradas'}
                  </td>
                </tr>
              )}
              {filtered.map((req) => (
                <tr key={req.id} className="hover:bg-surface-container-low/50">
                  <td className="font-bold text-secondary">
                    {req.casoId ? (
                      <Link
                        to={`/app/solicitudes/${req.casoId}`}
                        className="hover:underline"
                      >
                        {req.id}
                      </Link>
                    ) : (
                      req.id
                    )}
                  </td>
                  <td>{SERVICE_LABELS[req.type]}</td>
                  <td>
                    {req.beneficiaryName}
                    <br />
                    <span className="text-[11px] text-on-surface-variant">{req.cedula}</span>
                  </td>
                  <td>{req.amount ? `USD ${req.amount}` : '—'}</td>
                  <td>
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="text-on-surface-variant">
                    {new Date(req.updatedAt).toLocaleDateString('es-VE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
