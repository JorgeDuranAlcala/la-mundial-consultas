import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import { AuroraBackground } from '@/components/layout/AuroraBackground';
import { BrandLockup } from '@/components/ui/Brand';
import { fetchPortalCompanias } from '@/lib/companias-api';
import type { PortalCompania } from '@/lib/types';
import { useAuth } from '@/stores/useStore';

export function ClientSelectorPage() {
  const setSelectedCompania = useAuth((s) => s.setSelectedCompania);
  const [companias, setCompanias] = useState<PortalCompania[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPortalCompanias()
      .then((rows) => {
        if (!cancelled) setCompanias(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar las empresas');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center p-5">
      <AuroraBackground />

      <div className="relative z-10 w-full max-w-3xl step-enter">
        <div className="mb-8 text-center">
          <span className="inline-flex items-center rounded-full border border-primary/15 bg-surface-container-lowest/80 px-4 py-1.5 text-[10px] font-bold tracking-[0.18em] text-on-surface-variant uppercase backdrop-blur-sm">
            La Mundial · Consultas
          </span>
          <div className="mt-8 flex justify-center">
            <BrandLockup size="lg" tone="dark" logoSize={52} />
          </div>
          <h1 className="mt-6 text-[32px] font-extrabold tracking-tight text-primary md:text-[36px]">
            Portal de Consultas
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[14px] text-on-surface-variant">
            Consulta de asegurados · Solo lectura
          </p>        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="surface-card p-6 text-center text-[13px] text-accent">
            {error}
            <p className="mt-2 text-on-surface-variant">Verifique que el backend esté activo en el puerto 3001.</p>
          </div>
        )}

        {!loading && !error && companias.length === 0 && (
          <div className="surface-card p-8 text-center text-on-surface-variant">
            No hay empresas activas configuradas en el sistema.
          </div>
        )}

        {!loading && !error && companias.length > 0 && (
          <div
            className={`grid gap-4 ${companias.length === 1 ? 'max-w-md mx-auto' : 'sm:grid-cols-2'}`}
          >
            {companias.map((compania) => (
              <Link
                key={compania.id}
                to="/login"
                onClick={() => setSelectedCompania(compania)}
                className="group surface-card flex flex-col items-center p-8 transition-all hover:-translate-y-1 hover:shadow-elev-2"
              >
                <div
                  className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-elev-primary"
                  style={{ backgroundColor: compania.color }}
                >
                  {compania.shortName.charAt(0)}
                </div>
                <Building2 className="mb-2 h-5 w-5 text-on-surface-variant transition-colors group-hover:text-secondary" />
                <p className="text-center font-bold text-on-surface">{compania.nombre}</p>
                {compania.descripcion && (
                  <p className="mt-2 text-center text-[12px] text-on-surface-variant">
                    {compania.descripcion}
                  </p>
                )}
              </Link>
            ))}          </div>
        )}

        <p className="mt-8 text-center text-[11px] text-on-surface-variant/70">
          La Mundial · Consultas de asegurados
        </p>
      </div>
    </div>
  );
}
