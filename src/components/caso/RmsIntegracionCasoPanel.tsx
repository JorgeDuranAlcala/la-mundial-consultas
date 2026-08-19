import { useState } from 'react';
import { Landmark, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import type { CasoBeneficiarioApi } from '@/lib/caso-mappers';
import {
  consultarDependenciaRms,
  crearSiniestroRms,
  type RmsDependenciaResult,
  type RmsSiniestroApsResult,
} from '@/lib/rms-siniestro-api';
import type { CasoCompletoApi } from '@/lib/caso-detail-api';

type OrdenAps = NonNullable<CasoCompletoApi['ordenesAps']>[number];
type OrdenFarmacia = NonNullable<CasoCompletoApi['ordenesFarmacia']>[number];
type CartaAval = NonNullable<CasoCompletoApi['cartaAval']>;
type Reembolso = NonNullable<CasoCompletoApi['reembolso']>;
type SyncRms = NonNullable<CasoCompletoApi['sincronizacionesRms']>[number];

interface RmsIntegracionCasoPanelProps {
  casoId: number;
  tipoServicioCod: string;
  companiaCodigo?: string;
  beneficiario?: CasoBeneficiarioApi | null;
  ordenesAps?: OrdenAps[];
  ordenesFarmacia?: OrdenFarmacia[];
  cartaAval?: CartaAval | null;
  reembolso?: Reembolso | null;
  sincronizacionesRms?: SyncRms[];
  onRefresh: () => void | Promise<void>;
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-VE', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function RmsIntegracionCasoPanel({
  casoId,
  tipoServicioCod,
  companiaCodigo,
  beneficiario,
  ordenesAps = [],
  ordenesFarmacia = [],
  cartaAval,
  reembolso,
  sincronizacionesRms = [],
  onRefresh,
}: RmsIntegracionCasoPanelProps) {
  const [busy, setBusy] = useState<'dep' | 'sim' | 'crear' | null>(null);
  const [depResult, setDepResult] = useState<RmsDependenciaResult | null>(null);
  const [rmsResult, setRmsResult] = useState<RmsSiniestroApsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const servicio = (() => {
    switch (tipoServicioCod) {
      case 'APS': {
        const orden = ordenesAps[0];
        return {
          label: 'siniestro APS',
          entidadLabel: 'Orden APS local',
          ordenText: orden
            ? `${orden.codigoOrden} · ${orden.estado}`
            : 'Aún no emitida (aparece al completar paso EMITIR)',
          rmsIdExterno: orden?.rmsIdExterno ?? null,
        };
      }
      case 'FARMACIA': {
        const orden = ordenesFarmacia[0];
        return {
          label: 'siniestro farmacia',
          entidadLabel: 'Orden farmacia local',
          ordenText: orden
            ? `${orden.codigoOrden} · ${orden.estado}`
            : 'Aún no emitida (aparece al completar paso EMITIR)',
          rmsIdExterno: orden?.rmsIdExterno ?? null,
        };
      }
      case 'CARTA_AVAL':
      case 'EMERGENCIA':
        return {
          label: 'siniestro carta aval',
          entidadLabel: 'Carta aval local',
          ordenText: cartaAval?.codigoCarta
            ? `${cartaAval.codigoCarta} · emitida`
            : 'Aún no emitida (aparece al completar paso EMITIR)',
          rmsIdExterno: cartaAval?.rmsIdExterno ?? null,
        };
      case 'REEMBOLSO':
        return {
          label: 'siniestro reembolso',
          entidadLabel: 'Reembolso local',
          ordenText: reembolso
            ? `Monto aprobado ${reembolso.montoAprobado ?? reembolso.montoSolicitado ?? '—'}`
            : 'Extensión de reembolso no disponible',
          rmsIdExterno: reembolso?.rmsIdExterno ?? null,
        };
      default:
        return null;
    }
  })();

  if (!servicio) return null;

  const esLaMundial = !companiaCodigo || companiaCodigo === 'LA_MUNDIAL';
  const docLabel = beneficiario
    ? `${beneficiario.tipoCedula ?? 'V'}-${beneficiario.cedula}`
    : '—';

  const run = async (mode: 'dep' | 'sim' | 'crear') => {
    setBusy(mode);
    setError(null);
    try {
      if (mode === 'dep') {
        if (!beneficiario?.cedula) {
          throw new Error('El caso no tiene cédula de beneficiario');
        }
        const result = await consultarDependenciaRms({
          nacionalidad: beneficiario.tipoCedula ?? 'V',
          cedula: beneficiario.cedula,
        });
        setDepResult(result);
      } else {
        const result = await crearSiniestroRms({
          casoId,
          c_serv: mode === 'sim' ? '0' : '1',
        });
        setRmsResult(result);
        await onRefresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al consultar RMS');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            <div>
              <h2 className="section-title">Integración RMS — {servicio.label}</h2>
              <p className="section-subtitle">
                Solo se crea siniestro si el asegurado está en la BD de La Mundial
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            className="shrink-0"
            disabled={busy != null}
            onClick={() => void onRefresh()}
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <dl className="grid gap-3 text-[13px] sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
              Compañía
            </dt>
            <dd className="mt-0.5 font-medium text-on-surface">
              {companiaCodigo ?? '—'}
              {!esLaMundial && (
                <span className="ml-2 text-on-surface-variant">
                  (RMS solo aplica a LA_MUNDIAL)
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
              Beneficiario
            </dt>
            <dd className="mt-0.5 font-medium text-on-surface">{docLabel}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
              {servicio.entidadLabel}
            </dt>
            <dd className="mt-0.5 font-medium text-on-surface">
              {servicio.ordenText}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
              Siniestro / clave RMS
            </dt>
            <dd className="mt-0.5 font-medium text-on-surface">
              {servicio.rmsIdExterno ? (
                <span className="text-success">{servicio.rmsIdExterno}</span>
              ) : (
                <span className="text-on-surface-variant">Sin ID externo aún</span>
              )}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2 border-t border-outline-variant/60 pt-4">
{/*           <Button
            variant="secondary"
            disabled={busy != null || !beneficiario?.cedula}
            onClick={() => void run('dep')}
          >
            {busy === 'dep' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            1. Consultar La Mundial
          </Button> */}
          <Button
            variant="secondary"
            disabled={busy != null}
            onClick={() => void run('sim')}
          >
            {busy === 'sim' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            2. Simular
          </Button>
          <Button
            variant="accent"
            disabled={busy != null}
            onClick={() => void run('crear')}
          >
            {busy === 'crear' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Landmark className="h-4 w-4" />
            )}
            3. Crear siniestro
          </Button>
        </div>

        {error && (
          <p className="rounded-xl border border-error/30 bg-error/5 px-3 py-2 text-[13px] text-error">
            {error}
          </p>
        )}

        {depResult && (
          <div
            className={cn(
              'rounded-xl border p-3 text-[13px]',
              depResult.enMundial
                ? 'border-success/30 bg-success/5 text-on-surface'
                : 'border-outline-variant bg-surface-container-low text-on-surface-variant',
            )}
          >
            <p className="font-bold text-primary">Resultado /dependencia</p>
            <p className="mt-1">
              {depResult.enMundial
                ? `Asegurado encontrado en La Mundial · ${depResult.polizas.length} póliza(s)/certificado(s)`
                : 'Asegurado NO encontrado en La Mundial — no se creará siniestro'}
            </p>
            {depResult.polizas[0] && (
              <p className="mt-1 text-on-surface-variant">
                serialcontrato={depResult.polizas[0].n_serialcontrato} · serialcertif=
                {depResult.polizas[0].n_serialcertif}
                {depResult.polizas[0].n_correlativo != null
                  ? ` · correlativo=${depResult.polizas[0].n_correlativo}`
                  : ''}
              </p>
            )}
          </div>
        )}

        {rmsResult && (
          <div
            className={cn(
              'rounded-xl border p-3 text-[13px]',
              rmsResult.creado && rmsResult.confirmadoEnBd !== false
                ? 'border-success/30 bg-success/5'
                : rmsResult.omitido
                  ? 'border-outline-variant bg-surface-container-low'
                  : 'border-warning/30 bg-warning/5',
            )}
          >
            <p className="font-bold text-primary">Resultado RMS</p>
            <p className="mt-1">{rmsResult.mensaje}</p>
            {(rmsResult.n_clave != null ||
              rmsResult.n_siniestro != null ||
              rmsResult.n_estatus != null) && (
              <p className="mt-1 text-on-surface-variant">
                {[
                  rmsResult.n_estatus != null ? `estatus ${rmsResult.n_estatus}` : null,
                  rmsResult.n_clave != null ? `Clave ${rmsResult.n_clave}` : null,
                  rmsResult.n_siniestro != null ? `Siniestro ${rmsResult.n_siniestro}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
            {rmsResult.confirmadoEnBd != null && (
              <p
                className={cn(
                  'mt-1 font-medium',
                  rmsResult.confirmadoEnBd ? 'text-success' : 'text-warning',
                )}
              >
                {rmsResult.confirmadoEnBd
                  ? 'Validación BD: siniestro encontrado en e_detsinisalud_seg'
                  : 'Validación BD: NO se encontró el siniestro (API respondió pero no hay fila)'}
              </p>
            )}
            {rmsResult.confirmadoEnBd === null && rmsResult.creado && (
              <p className="mt-1 text-on-surface-variant">
                Validación BD: no disponible (no se pudo consultar RMS)
              </p>
            )}
            {rmsResult.omitido && rmsResult.motivoOmitido && (
              <p className="mt-1 text-on-surface-variant">Motivo: {rmsResult.motivoOmitido}</p>
            )}
          </div>
        )}

        {sincronizacionesRms.length > 0 && (
          <div className="border-t border-outline-variant/60 pt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
              Historial sincronizacion_externa (RMS)
            </p>
            <ul className="space-y-2">
              {sincronizacionesRms.slice(0, 8).map((s) => (
                <li
                  key={s.id}
                  className="rounded-lg border border-outline-variant/60 px-3 py-2 text-[12px]"
                >
                  <span className={s.exitoso ? 'text-success font-semibold' : 'text-error font-semibold'}>
                    {s.exitoso ? 'OK' : 'FAIL'}
                  </span>
                  {' · '}
                  {s.operacion}
                  {s.idExterno ? ` · id=${s.idExterno}` : ''}
                  {' · '}
                  {formatDate(s.sincronizadoEn)}
                  {s.mensajeError && (
                    <p className="mt-1 text-on-surface-variant">{s.mensajeError}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
