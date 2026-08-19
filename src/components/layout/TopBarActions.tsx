import { HelpCircle, UserRound } from 'lucide-react';
import { useAuth } from '@/stores/useStore';

const pillClass =
  'pointer-events-auto flex items-center gap-1.5 rounded-full border border-outline-variant/30 bg-surface-container-low/50 px-3 py-1.5 text-[13px] font-medium text-on-surface-variant shadow-sm backdrop-blur-md transition-colors hover:bg-surface-container-high hover:text-primary';

const pillPrimaryClass =
  'pointer-events-auto flex max-w-[240px] items-center gap-1.5 rounded-full border border-primary-container/30 bg-primary px-3 py-1.5 text-[13px] font-medium text-on-primary shadow-sm backdrop-blur-md transition-colors hover:bg-primary-container';

const roleLabels: Record<string, string> = {
  asegurado: 'Asegurado',
  clinica: 'Proveedor de servicios',
  medico: 'Médico',
  admin: 'Admin',
};

export function TopBarActions() {
  const { user, selectedCompania } = useAuth();
  const compania = selectedCompania;

  if (!user) return null;

  return (
    <div className="pointer-events-none absolute top-4 right-5 z-50 flex items-center gap-2 md:right-8 lg:right-10">
      {compania && (
        <span className={pillClass} title={compania.nombre}>
          <span className="hidden h-2 w-2 rounded-full sm:inline-block" style={{ backgroundColor: compania.color }} />
          <span className="hidden sm:inline">{compania.shortName}</span>
        </span>
      )}
      <button type="button" className={pillClass}>
        <HelpCircle size={14} className="shrink-0" />
        <span className="hidden sm:inline">Ayuda</span>
      </button>
      <button type="button" className={pillPrimaryClass} title={`${user.name} · ${roleLabels[user.role]}`}>
        <UserRound size={14} className="shrink-0" />
        <span className="hidden truncate sm:inline">
          {user.name}
          <span className="font-normal text-on-primary/75"> · {roleLabels[user.role]}</span>
        </span>
      </button>
    </div>
  );
}
