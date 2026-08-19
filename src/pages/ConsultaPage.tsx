import { useState } from 'react';
import { Loader2, Search, ShieldCheck, UserRound } from 'lucide-react';
import { FormPageLayout } from '@/components/layout/FormPageLayout';
import { FormHelpAside } from '@/components/layout/WizardProgressAside';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { CedulaInput } from '@/components/ui/CedulaInput';
import { Label } from '@/components/ui/Input';
import { ValidationAlert } from '@/components/ui/ValidationAlert';
import { ApiError } from '@/lib/api';
import { parseDocumentForRms } from '@/lib/cedula.util';
import {
  consultarAseguradoLaMundial,
  type LaMundialConsultaResponse,
} from '@/lib/la-mundial-api';
import { useAuth } from '@/stores/useStore';

function formatMoney(value: number, moneda: string) {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: moneda === 'USD' ? 'USD' : 'VES',
    maximumFractionDigits: 2,
  }).format(value);
}

export function ConsultaPage() {
  const user = useAuth((s) => s.user);
  const [documentInput, setDocumentInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LaMundialConsultaResponse | null>(null);

  const roleLabel =
    user?.role === 'clinica' ? 'Proveedor de servicios' : 'Asegurado';

  const handleConsultar = async () => {
    setError(null);
    setResult(null);

    const parsed = parseDocumentForRms(documentInput, 0);
    if (!parsed) {
      setError('Ingrese una cédula válida (ej. 12345678).');
      return;
    }

    setSearching(true);
    try {
      const data = await consultarAseguradoLaMundial({
        nacionalidad: parsed.nacionalidad,
        cedrif: parsed.cedrif,
      });
      setResult(data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'No se pudo consultar en La Mundial.',
      );
    } finally {
      setSearching(false);
    }
  };

  return (
    <FormPageLayout
      header={
        <PageHeader
          title="Consulta de asegurado"
          subtitle="Búsqueda por cédula · API La Mundial (simulada)"
          icon={ShieldCheck}
          breadcrumbs={[{ label: 'Inicio', to: '/app' }, { label: 'Consulta' }]}
        />
      }
      aside={
        <FormHelpAside
          title="Portal de consultas"
          items={[
            { label: 'Modo', value: 'Solo lectura' },
            { label: 'Su rol', value: roleLabel },
            { label: 'Fuente', value: 'La Mundial' },
            { label: 'Estado API', value: 'Simulación local' },
          ]}
        />
      }
    >
      <Card>
        <CardHeader className="border-b border-outline-variant px-6 py-5">
          <h2 className="section-title">Buscar asegurado</h2>
          <p className="section-subtitle">
            Ingrese la cédula del titular o beneficiario para consultar pólizas y dependientes.
          </p>
        </CardHeader>
        <CardBody className="space-y-5">
          <div>
            <Label htmlFor="cedulaConsulta">Cédula del asegurado</Label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
              <CedulaInput
                id="cedulaConsulta"
                className="flex-1"
                placeholder="12345678"
                value={documentInput}
                onChange={setDocumentInput}
              />
              <Button
                type="button"
                className="shrink-0"
                disabled={searching}
                onClick={() => void handleConsultar()}
              >
                {searching ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Search size={16} />
                )}
                {searching ? 'Consultando…' : 'Consultar'}
              </Button>
            </div>
            <p className="mt-1.5 text-[12px] text-on-surface-variant">
              Datos de prueba: 12345678 (titular), 23456789 (beneficiario), 98765432 (otro titular).
            </p>
          </div>

          {error && <ValidationAlert messages={error} />}
        </CardBody>
      </Card>

      {result && (
        <div className="mt-6 space-y-6 step-enter">
          <Card>
            <CardHeader className="flex items-center gap-3 border-b border-outline-variant px-6 py-5">
              <UserRound size={20} className="text-primary" />
              <h2 className="section-title">Datos del asegurado</h2>
            </CardHeader>
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-bold tracking-wider text-on-surface-variant uppercase">
                  Nombre
                </p>
                <p className="mt-1 font-semibold text-on-surface">
                  {result.persona.nombreCompleto}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-wider text-on-surface-variant uppercase">
                  Documento
                </p>
                <p className="mt-1 font-semibold text-on-surface">
                  {result.persona.nacionalidad}-{result.persona.cedula}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-wider text-on-surface-variant uppercase">
                  Tipo
                </p>
                <p className="mt-1 font-semibold text-on-surface">{result.persona.tipo}</p>
              </div>
              {result.persona.titular && (
                <div>
                  <p className="text-[11px] font-bold tracking-wider text-on-surface-variant uppercase">
                    Titular
                  </p>
                  <p className="mt-1 font-semibold text-on-surface">{result.persona.titular}</p>
                </div>
              )}
              {result.persona.email && (
                <div>
                  <p className="text-[11px] font-bold tracking-wider text-on-surface-variant uppercase">
                    Correo
                  </p>
                  <p className="mt-1 text-on-surface">{result.persona.email}</p>
                </div>
              )}
              {result.persona.telefono && (
                <div>
                  <p className="text-[11px] font-bold tracking-wider text-on-surface-variant uppercase">
                    Teléfono
                  </p>
                  <p className="mt-1 text-on-surface">{result.persona.telefono}</p>
                </div>
              )}
            </CardBody>
          </Card>

          {result.polizas.length > 0 && (
            <Card>
              <CardHeader className="border-b border-outline-variant px-6 py-5">
                <h2 className="section-title">Pólizas</h2>
                <p className="section-subtitle">Fuente: {result.fuente}</p>
              </CardHeader>
              <CardBody className="divide-y divide-outline-variant/60 p-0">
                {result.polizas.map((poliza) => (
                  <div key={poliza.numeroPoliza} className="space-y-2 px-6 py-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="font-bold text-on-surface">{poliza.numeroPoliza}</p>
                      <span className="rounded-full bg-success-container px-3 py-1 text-[11px] font-bold text-on-success-container">
                        {poliza.estatus}
                      </span>
                    </div>
                    <p className="text-[13px] text-on-surface-variant">{poliza.producto}</p>
                    <p className="text-[13px] text-on-surface">
                      Vigencia: {poliza.vigenciaDesde} — {poliza.vigenciaHasta}
                    </p>
                    <p className="text-[13px] font-semibold text-primary">
                      Suma asegurada: {formatMoney(poliza.sumaAsegurada, poliza.moneda)}
                    </p>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          {result.dependientes.length > 0 && (
            <Card>
              <CardHeader className="border-b border-outline-variant px-6 py-5">
                <h2 className="section-title">Dependientes / beneficiarios</h2>
              </CardHeader>
              <CardBody className="divide-y divide-outline-variant/60 p-0">
                {result.dependientes.map((dep) => (
                  <div
                    key={`${dep.nacionalidad}-${dep.cedula}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
                  >
                    <div>
                      <p className="font-bold text-on-surface">{dep.nombreCompleto}</p>
                      <p className="text-[13px] text-on-surface-variant">
                        {dep.nacionalidad}-{dep.cedula} · {dep.parentesco}
                      </p>
                    </div>
                    <span
                      className={
                        dep.activo
                          ? 'text-[11px] font-bold text-success'
                          : 'text-[11px] font-bold text-on-surface-variant'
                      }
                    >
                      {dep.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </FormPageLayout>
  );
}
