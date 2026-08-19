import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
} from 'lucide-react';
import { BrandLockup } from '@/components/ui/Brand';
import { cn } from '@/lib/utils';
import { useAuth } from '@/stores/useStore';
import type { UserRole } from '@/lib/types';

const navConfig: Record<
  UserRole,
  { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean }[]
> = {
  asegurado: [
    { to: '/app/consulta', label: 'Consultar asegurado', icon: ShieldCheck, end: true },
  ],
  clinica: [
    { to: '/app/consulta', label: 'Consultar asegurado', icon: ShieldCheck, end: true },
  ],
};

interface SideNavProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function SideNav({ isCollapsed, onToggle }: SideNavProps) {
  const { user, selectedCompania, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const compania = selectedCompania;

  if (!user) return null;

  const nav = navConfig[user.role] ?? navConfig.asegurado;

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate('/');
  };

  return (
    <>
      <aside
        className={cn(
          'sidebar-gradient fixed top-0 left-0 z-40 hidden h-screen flex-col border-r border-white/5 text-sidebar-text transition-all duration-300 md:flex',
          isCollapsed ? 'w-20' : 'w-64',
        )}
      >
        <div
          className={cn(
            'flex items-center border-b border-white/5 px-4 pt-5 pb-5',
            isCollapsed ? 'justify-center' : 'justify-between',
          )}
        >
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <BrandLockup size="sm" tone="light" logoSize={36} />
              {compania && (
                <p className="mt-2 truncate rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-sidebar-muted">
                  {compania.shortName}
                </p>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="btn-icon shrink-0 text-sidebar-muted hover:bg-white/10 hover:text-white"
            title={isCollapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-5">
          {!isCollapsed && (
            <p className="mb-1 px-2 text-[10px] font-bold tracking-[0.22em] text-sidebar-muted/80 uppercase">
              Consultas
            </p>
          )}
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={isCollapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-xl border transition-all',
                  isCollapsed ? 'justify-center px-2 py-2' : 'px-3 py-2',
                  isActive
                    ? 'border-white/15 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                    : 'border-transparent hover:border-white/10 hover:bg-white/[0.04]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex shrink-0 items-center justify-center rounded-lg transition-colors',
                      isCollapsed ? 'h-9 w-9' : 'h-7 w-7',
                      isActive
                        ? 'relative bg-emerald-500 text-white shadow-[0_4px_10px_rgba(16,185,129,0.3)]'
                        : 'border border-white/5 bg-white/5 text-sidebar-muted group-hover:text-white',
                    )}
                  >
                    <Icon size={isCollapsed ? 14 : 12} strokeWidth={2.5} />
                  </span>
                  {!isCollapsed && (
                    <span
                      className={cn(
                        'truncate text-[12.5px] font-bold tracking-tight',
                        isActive ? 'text-white' : 'text-sidebar-text',
                      )}
                    >
                      {label}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className={cn('flex flex-col gap-2 border-t border-white/5 p-3', isCollapsed && 'items-center')}>
          {!isCollapsed && (
            <p className="truncate px-2 text-[10px] text-sidebar-muted" title={user.name}>
              {user.name}
            </p>
          )}
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            title={isCollapsed ? 'Cerrar sesión' : undefined}
            className={cn(
              'group flex w-full items-center gap-3 rounded-xl border border-transparent transition-all hover:border-rose-400/25 hover:bg-rose-500/10',
              isCollapsed ? 'justify-center px-2 py-2' : 'px-3 py-2',
            )}
          >
            <span
              className={cn(
                'flex shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-sidebar-muted transition-colors group-hover:border-rose-400/30 group-hover:bg-rose-500/20 group-hover:text-rose-300',
                isCollapsed ? 'h-9 w-9' : 'h-7 w-7',
              )}
            >
              <LogOut size={isCollapsed ? 14 : 12} strokeWidth={2.5} />
            </span>
            {!isCollapsed && (
              <span className="text-[12.5px] font-bold tracking-tight group-hover:text-rose-200">
                Cerrar sesión
              </span>
            )}
          </button>
        </div>
      </aside>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-deep/40 p-4 backdrop-blur-sm">
          <div className="surface-card w-full max-w-sm p-6 step-enter">
            <h2 className="text-lg font-bold text-primary">Cerrar sesión</h2>
            <p className="mt-2 text-sm text-on-surface-variant">¿Seguro que deseas salir del portal?</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn-outline" onClick={() => setShowLogoutConfirm(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-danger" onClick={handleLogout}>
                Sí, salir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
