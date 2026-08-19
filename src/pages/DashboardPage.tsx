import { Link, Navigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Bot,
  FileHeart,
  HeartPulse,
  LayoutDashboard,
  Pill,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { SERVICE_LABELS } from '@/lib/types';
import { useAuth, useAppStore } from '@/stores/useStore';

const quickLinks = {
  asegurado: [
    { to: '/app/reembolso', label: 'Solicitar reembolso', icon: FileHeart, color: 'bg-accent/10 text-accent-dark' },
    { to: '/app/aps', label: 'Emitir orden APS', icon: Stethoscope, color: 'bg-secondary-fixed text-navy-soft' },
    { to: '/app/farmacia', label: 'Orden de farmacia', icon: Pill, color: 'bg-success-container text-on-success-container' },
    { to: '/app/carta-aval', label: 'Carta aval', icon: ShieldCheck, color: 'bg-primary-fixed text-navy-soft' },
  ],
  clinica: [
    { to: '/app/emergencia', label: 'Emergencia médica', icon: HeartPulse, color: 'bg-accent/10 text-accent-dark' },
    { to: '/app/activar-aps', label: 'Activar orden APS', icon: Stethoscope, color: 'bg-secondary-fixed text-navy-soft' },
    { to: '/app/activar-farmacia', label: 'Activar farmacia', icon: Pill, color: 'bg-success-container text-on-success-container' },
  ],
  medico: [
    { to: '/app/cola-medica', label: 'Casos pendientes IA', icon: Stethoscope, color: 'bg-primary-fixed text-navy-soft' },
  ],
  admin: [],
};

const kpis = [
  { key: 'pending', label: 'Casos en proceso', icon: Bot, color: 'bg-primary-fixed text-primary' },
  { key: 'total', label: 'Solicitudes totales', icon: LayoutDashboard, color: 'bg-secondary-fixed text-secondary' },
  { key: 'integration', label: 'Integración activa', icon: ShieldCheck, color: 'bg-success-container text-on-success-container' },
] as const;

export function DashboardPage() {
  const user = useAuth((s) => s.user)!;
  const selectedCompania = useAuth((s) => s.selectedCompania);
  if (user.role === 'admin') return <Navigate to="/app/admin" replace />;

  const requests = useAppStore((s) => s.requests);
  const links =
    user.role === 'asegurado' && selectedCompania?.codigo === 'LA_MUNDIAL'
      ? [
          {
            to: '/app/asegurabilidad',
            label: 'Buscar',
            icon: ShieldCheck,
            color: 'bg-secondary-fixed text-navy-soft',
          },
          ...quickLinks.asegurado,
        ]
      : quickLinks[user.role];
  const pending = requests.filter((r) =>
    ['analisis-medico', 'recaudo-pendiente', 'analisis'].includes(r.status),
  );

  const kpiValues = {
    pending: pending.length,
    total: requests.length,
    integration: 'RMS',
  };

  return (
    <div className="step-enter">
      <PageHeader
        hero
        title={`Bienvenido, ${user.name}`}
        subtitle="Gestión de servicios de salud con validación asistida por IA"
        icon={LayoutDashboard}
        breadcrumbs={[{ label: 'Inicio' }]}
      />

      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map(({ key, label, icon: Icon, color }, index) => (
          <div
            key={key}
            className="surface-card p-5 transition-all hover:-translate-y-0.5"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold tracking-wider text-on-surface-variant uppercase">{label}</p>
                <p className="mt-2 text-[28px] font-extrabold tracking-tight text-on-surface">
                  {kpiValues[key]}
                </p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                <Icon size={18} strokeWidth={2.2} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="mb-10">
        <div className="mb-4 flex items-center gap-3">
          <p className="text-[10px] font-bold tracking-[0.18em] text-on-surface-variant uppercase">
            Acciones rápidas
          </p>
          <div className="h-px flex-1 bg-surface-dim/80" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {links.map(({ to, label, icon: Icon, color }) => (
            <Link key={to} to={to} className="group surface-card p-5 transition-all hover:-translate-y-1 hover:shadow-elev-2">
              <div className="flex items-start justify-between gap-3">
                <div className={`rounded-xl p-2.5 ${color}`}>
                  <Icon size={18} strokeWidth={2.2} />
                </div>
                <ArrowUpRight
                  size={16}
                  className="text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100"
                />
              </div>
              <p className="mt-4 font-bold text-on-surface">{label}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <p className="text-[10px] font-bold tracking-[0.18em] text-on-surface-variant uppercase">
              Actividad reciente
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
            <p className="section-subtitle">Estatus en tiempo real · trazabilidad completa</p>
          </div>
          {requests.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-on-surface-variant">Sin actividad reciente</div>
          ) : (
            <div className="divide-y divide-outline-variant/60">
              {requests.slice(0, 5).map((req) => (
                <div key={req.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                  <div>
                    <p className="font-bold text-on-surface">{SERVICE_LABELS[req.type]}</p>
                    <p className="text-[13px] text-on-surface-variant">
                      {req.id} · {req.beneficiaryName}
                    </p>
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
