import { ChevronRight, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Breadcrumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  hero?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  breadcrumbs = [{ label: 'Inicio', to: '/app' }],
  actions,
  hero = false,
}: PageHeaderProps) {
  return (
    <header className="mb-8">
      {breadcrumbs.length > 0 && (
        <div className="mb-4 flex items-center gap-1.5 text-[11px] text-on-surface-variant">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.label} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={11} />}
              {crumb.to ? (
                <Link to={crumb.to} className="hover:text-primary transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-semibold text-on-surface">{crumb.label}</span>
              )}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2.5">
            {Icon && (
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary shadow-elev-primary">
                <Icon size={15} className="text-white" strokeWidth={2.5} />
              </div>
            )}
            <h1
              className={
                hero
                  ? 'text-[32px] font-extrabold tracking-tight text-primary md:text-[36px]'
                  : 'text-[22px] font-extrabold tracking-tight text-on-surface'
              }
            >
              {title}
            </h1>
          </div>
          {subtitle && (
            <p className="max-w-2xl text-[13px] text-on-surface-variant md:text-[14px]">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
