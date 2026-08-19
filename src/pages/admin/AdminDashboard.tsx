import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Building2,
  ClipboardList,
  FileText,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { SERVICE_LABELS } from '@/lib/types';
import { useAuth, useAppStore } from '@/stores/useStore';

const quickActions = [
  {
    to: '/app/solicitudes',
    label: 'Ver solicitudes',
    subtitle: 'Revisa y gestiona todas las solicitudes',
    icon: ClipboardList,
    color: 'bg-primary-fixed text-navy-soft',
  },
  {
    to: '/app/admin/usuarios',
    label: 'Gestionar usuarios',
    subtitle: 'Administra los usuarios de la empresa',
    icon: Users,
    color: 'bg-secondary-fixed text-navy-soft',
  },
  {
    to: '/app/admin/configuracion',
    label: 'Configuración',
    subtitle: 'Ajustes de integración y preferencias',
    icon: Settings,
    color: 'bg-success-container text-on-success-container',
  },
];

const statusGroups = [
  { key: 'pendiente', label: 'Pendientes', color: 'text-yellow-600' },
  { key: 'analisis', label: 'En análisis (IA)', color: 'text-blue-600' },
  { key: 'aprobado', label: 'Aprobados', color: 'text-emerald-600' },
  { key: 'rechazado', label: 'Rechazados', color: 'text-rose-600' },
] as const;

export function AdminDashboard() {
  const user = useAuth((s) => s.user)!;
  const selectedCompania = useAuth((s) => s.selectedCompania);
  const requests = useAppStore((s) => s.requests);
  const beneficiaries = useAppStore((s) => s.beneficiaries);

  const pendingRequests = requests.filter((r) =>
    ['pendiente', 'analisis', 'recaudo-pendiente', 'analisis-medico'].includes(r.status),
  );
  const approvedRequests = requests.filter((r) => r.status === 'aprobado' || r.status === 'liquidada');

  const statusCounts = requests.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="step-enter">
      <PageHeader
        hero
        title={`Panel de administración`}
        subtitle={selectedCompania?.nombre ?? user.companiaNombre ?? 'Portal de gestión empresarial'}
        icon={Building2}
        breadcrumbs={[{ label: 'Admin' }]}
      />

      <div className="mb-8 flex items-center gap-3 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ backgroundColor: selectedCompania?.color ?? '#333' }}
        >
          <Building2 size={22} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-on-surface">{selectedCompania?.nombre ?? 'Sin empresa'}</p>
          <p className="text-[12px] text-on-surface-variant">
            Administrador · {user.email}
          </p>
        </div>
        <Link
          to="/app/admin/configuracion"
          className="btn-outline flex items-center gap-1.5 text-[13px]"
        >
          <Settings size={14} />
          Ajustes
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total beneficiarios', value: beneficiaries.length, icon: Users, color: 'bg-primary-fixed text-primary' },
          { label: 'Solicitudes totales', value: requests.length, icon: FileText, color: 'bg-secondary-fixed text-secondary' },
          { label: 'En proceso', value: pendingRequests.length, icon: Activity, color: 'bg-accent/10 text-accent-dark' },
          { label: 'Tasa de aprobación', value: requests.length > 0 ? `${Math.round((approvedRequests.length / requests.length) * 100)}%` : '0%', icon: TrendingUp, color: 'bg-success-container text-on-success-container' },
        ].map(({ label, value, icon: Icon, color }, index) => (
          <div
            key={label}
            className="surface-card p-5 transition-all hover:-translate-y-0.5"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold tracking-wider text-on-surface-variant uppercase">{label}</p>
                <p className="mt-2 text-[28px] font-extrabold tracking-tight text-on-surface">{value}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                <Icon size={18} strokeWidth={2.2} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statusGroups.map(({ key, label, color }) => (
          <div key={key} className="surface-card flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-dim">
              <BarChart3 size={16} className={color} />
            </div>
            <div>
              <p className="text-[18px] font-extrabold text-on-surface">{statusCounts[key] ?? 0}</p>
              <p className="text-[11px] text-on-surface-variant">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <section className="mb-10">
        <div className="mb-4 flex items-center gap-3">
          <p className="text-[10px] font-bold tracking-[0.18em] text-on-surface-variant uppercase">
            Acciones rápidas
          </p>
          <div className="h-px flex-1 bg-surface-dim/80" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map(({ to, label, subtitle, icon: Icon, color }) => (
            <Link
              key={to}
              to={to}
              className="group surface-card p-5 transition-all hover:-translate-y-1 hover:shadow-elev-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`rounded-xl p-2.5 ${color}`}>
                  <Icon size={18} strokeWidth={2.2} />
                </div>
                <ArrowUpRight
                  size={16}
                  className="text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100"
                />
              </div>
              <p className="mt-2 font-bold text-on-surface">{label}</p>
              <p className="mt-0.5 text-[12px] text-on-surface-variant">{subtitle}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent requests */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <p className="text-[10px] font-bold tracking-[0.18em] text-on-surface-variant uppercase">
              Solicitudes recientes
            </p>
            <div className="hidden h-px w-16 bg-surface-dim/80 sm:block" />
          </div>
          <Link to="/app/solicitudes" className="text-[13px] font-semibold text-secondary hover:text-primary">
            Ver todas
          </Link>
        </div>
        <div className="surface-card overflow-hidden p-0">
          <div className="border-b border-outline-variant px-6 py-5">
            <h2 className="section-title">Últimas solicitudes</h2>
            <p className="section-subtitle">Trazabilidad completa de la empresa</p>
          </div>
          {requests.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-on-surface-variant">Sin solicitudes</div>
          ) : (
            <div className="divide-y divide-outline-variant/60">
              {requests.slice(0, 5).map((req) => (
                <div key={req.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-dim">
                      <FileText size={14} className="text-on-surface-variant" />
                    </div>
                    <div>
                      <p className="font-bold text-on-surface">{SERVICE_LABELS[req.type]}</p>
                      <p className="text-[13px] text-on-surface-variant">
                        {req.id} · {req.beneficiaryName}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
