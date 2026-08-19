import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { CedulaInput } from '@/components/ui/CedulaInput';
import { Button } from '@/components/ui/Button';
import { Label, Select } from '@/components/ui/Input';
import { ValidationAlert } from '@/components/ui/ValidationAlert';
import { resolveBeneficiaryFromDocument } from '@/lib/beneficiario-api';
import { parseDocumentForRms } from '@/lib/cedula.util';
import { buscarRmsPorCedula, type RmsLookupTarget } from '@/lib/rms-lookup-api';
import type { PersonaRmsResponse } from '@/lib/rms-persona-api';
import type { Beneficiary } from '@/lib/types';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/stores/useStore';

/** Correlativo fijo para búsquedas de persona/paciente en solicitudes. */
const RMS_CORRELATIVO_DEFAULT = 0;

export interface BeneficiaryRmsSearchResult {
  persona: PersonaRmsResponse;
  beneficiary: Beneficiary;
  /** Nombre del registro local de póliza (puede diferir del nombre RMS). */
  localPolicyName?: string;
}

interface BeneficiaryRmsSearchProps {
  rmsLookup: RmsLookupTarget;
  beneficiaries: Beneficiary[];
  policyNumber: string;
  polizaId: number | null;
  /**
   * Si true (usuario asegurado), solo permite cédulas de su póliza asociada
   * (titular / tomador / dependientes).
   */
  associatedOnly?: boolean;
  /** Tomador o titular pueden consultar todos; dependiente solo el suyo. */
  puedeConsultarTodos?: boolean;
  vinculoParentesco?: string | null;
  vinculoBeneficiarioId?: number | null;
  /** Cédula del usuario autenticado (V-12345678). */
  vinculoCedula?: string | null;
  /** Se llama al montar / recargar para refrescar cobertura. */
  onCoverageChanged?: () => void | Promise<void>;
  onResolved: (result: BeneficiaryRmsSearchResult | null) => void;
  disabled?: boolean;
}

const RMS_LOOKUP_LABELS: Record<RmsLookupTarget, { hint: string; found: string; notFound: string }> =
  {
    personas: {
      hint: 'Ingrese solo la cédula (ej. V-12345678).',
      found: 'Paciente encontrado en La Mundial (RMS)',
      notFound: 'No se encontró beneficiario/paciente con documento {doc} en La Mundial.',
    },
    proveedores: {
      hint: 'Ingrese solo la cédula (ej. V-12345678).',
      found: 'Paciente encontrado en RMS (proveedores)',
      notFound: 'No se encontró paciente con documento {doc} en RMS (proveedores).',
    },
  };

function canSearchLaMundial(
  role: string | undefined,
  companiaCodigo: string | undefined,
): boolean {
  return role === 'asegurado' && companiaCodigo === 'LA_MUNDIAL';
}

function personaStubFromBeneficiary(beneficiary: Beneficiary): PersonaRmsResponse {
  return {
    serialpersona: '',
    nacionalidad: '',
    cedrif: '',
    correlativo: '0',
    nombre: null,
    apellido: null,
    nombreCompleto: beneficiary.name,
    razonsocial: null,
    numrif: null,
    numnit: null,
    sexo: '',
    fecnac: '',
    edocivil: '',
    direccion: '',
    cdPais: '',
    cdEstado: '',
    cdCiudad: '',
    cdMunicipio: '',
    telefono: null,
    celular: null,
    email: null,
    cdEstatus: '',
    fecreg: '',
  };
}

export function BeneficiaryRmsSearch({
  rmsLookup,
  beneficiaries,
  policyNumber,
  polizaId,
  associatedOnly = false,
  puedeConsultarTodos = true,
  //vinculoParentesco = null,
  vinculoBeneficiarioId = null,
  vinculoCedula = null,
  onCoverageChanged,
  onResolved,
  disabled = false,
}: BeneficiaryRmsSearchProps) {
  const user = useAuth((s) => s.user);
  const selectedCompania = useAuth((s) => s.selectedCompania);
  const showMundialSearch = canSearchLaMundial(user?.role, selectedCompania?.codigo);

  const [documentInput, setDocumentInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BeneficiaryRmsSearchResult | null>(null);
  const [selectedLocalId, setSelectedLocalId] = useState('');

  const selectableBeneficiaries = useMemo(() => {
    if (!associatedOnly) return beneficiaries;
    if (puedeConsultarTodos) return beneficiaries;
    if (vinculoBeneficiarioId != null) {
      return beneficiaries.filter((b) => b.beneficiarioId === vinculoBeneficiarioId);
    }
    if (vinculoCedula) {
      const digits = vinculoCedula.replace(/\D/g, '');
      return beneficiaries.filter(
        (b) => b.cedula.replace(/\D/g, '') === digits,
      );
    }
    return beneficiaries;
  }, [
    associatedOnly,
    beneficiaries,
    puedeConsultarTodos,
    vinculoBeneficiarioId,
    vinculoCedula,
  ]);

  // Recarga cobertura al montar (asegurado) y fija cédula del autenticado.
  useEffect(() => {
    if (!associatedOnly) return;
    let cancelled = false;
    setReloading(true);
    void (async () => {
      try {
        await onCoverageChanged?.();
      } finally {
        if (!cancelled) setReloading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Solo al montar / cambiar modo asociado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [associatedOnly]);

  useEffect(() => {
    if (!associatedOnly) return;
    if (vinculoCedula) {
      setDocumentInput(vinculoCedula);
    }
  }, [associatedOnly, vinculoCedula]);

  const resolveFromBeneficiary = (beneficiary: Beneficiary) => {
    const resolved: BeneficiaryRmsSearchResult = {
      persona: personaStubFromBeneficiary(beneficiary),
      beneficiary: {
        ...beneficiary,
        policyNumber: beneficiary.policyNumber || policyNumber,
        polizaId: beneficiary.polizaId || polizaId || 0,
      },
      localPolicyName: beneficiary.name,
    };
    setResult(resolved);
    setSelectedLocalId(beneficiary.id);
    onResolved(resolved);
  };

  const handleSelectBeneficiary = (id: string) => {
    setError(null);
    setResult(null);
    setSelectedLocalId(id);
    if (!id) {
      onResolved(null);
      return;
    }
    const beneficiary = selectableBeneficiaries.find((b) => b.id === id);
    if (!beneficiary) {
      onResolved(null);
      return;
    }
    resolveFromBeneficiary(beneficiary);
  };

  const handleSearch = async () => {
    setError(null);
    setResult(null);
    onResolved(null);

    // Asegurado: no busca cédulas ajenas; debe elegir beneficiario de su póliza.
    if (associatedOnly) {
      setError(
        'Use la lista de beneficiarios de su póliza. La solicitud se basa en la cédula de su cuenta autenticada.',
      );
      return;
    }

    const parsed = parseDocumentForRms(documentInput, RMS_CORRELATIVO_DEFAULT);
    if (!parsed) {
      setError('Ingrese una cédula válida (ej. V-12345678).');
      return;
    }

    setSearching(true);
    const labels = RMS_LOOKUP_LABELS[rmsLookup];
    try {
      const persona = await buscarRmsPorCedula(rmsLookup, {
        nacionalidad: parsed.nacionalidad,
        cedrif: parsed.cedrif,
        correlativo: RMS_CORRELATIVO_DEFAULT,
      });

      const beneficiary = await resolveBeneficiaryFromDocument(
        beneficiaries,
        persona.nacionalidad,
        persona.cedrif,
        policyNumber,
        polizaId ?? 0,
      );

      if (!beneficiary) {
        setError(
          `La persona "${persona.nombreCompleto}" existe en RMS (${parsed.nacionalidad}-${parsed.cedrif}), pero no figura como beneficiario ni como asegurado/dependiente con póliza vigente.`,
        );
        return;
      }

      if (polizaId && beneficiary.polizaId && beneficiary.polizaId !== polizaId) {
        setError(
          `La cédula pertenece a otra póliza (${beneficiary.policyNumber}). Debe consultar un asegurado/dependiente asociado a la póliza actual.`,
        );
        return;
      }

      const rmsName = persona.nombreCompleto?.trim() || beneficiary.name;
      const localPolicyName = beneficiary.name;

      const resolved: BeneficiaryRmsSearchResult = {
        persona,
        localPolicyName:
          localPolicyName !== rmsName ? localPolicyName : undefined,
        beneficiary: {
          ...beneficiary,
          name: rmsName,
          cedula:
            persona.nacionalidad && persona.cedrif
              ? `${persona.nacionalidad}-${persona.cedrif}`
              : beneficiary.cedula,
        },
      };
      setResult(resolved);
      onResolved(resolved);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError(
          labels.notFound.replace(
            '{doc}',
            `${parsed.nacionalidad}-${parsed.cedrif}`,
          ),
        );
      } else {
        setError(
          err instanceof Error ? err.message : 'No se pudo consultar el registro en RMS.',
        );
      }
    } finally {
      setSearching(false);
    }
  };

  const handleDocumentChange = (value: string) => {
    if (associatedOnly) return;
    setDocumentInput(value);
    setError(null);
    setResult(null);
    onResolved(null);
  };

  // Flujo asegurado: cédula del titular autenticado (oculta; viene de la sesión) + lista de beneficiarios.
  if (associatedOnly) {
    return (
      <div className="space-y-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <Label htmlFor="beneficiary-policy">
              Beneficiario
            </Label>
            <Button
              type="button"
              variant="outline"
              className="h-8 px-2 text-[12px]"
              disabled={disabled || reloading}
              onClick={() => {
                setReloading(true);
                void (async () => {
                  try {
                    await onCoverageChanged?.();
                    setError(null);
                    setResult(null);
                    setSelectedLocalId('');
                    onResolved(null);
                  } finally {
                    setReloading(false);
                  }
                })();
              }}
            >
              {reloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              Recargar
            </Button>
          </div>
          <Select
            id="beneficiary-policy"
            value={selectedLocalId}
            onChange={(e) => handleSelectBeneficiary(e.target.value)}
            disabled={disabled || reloading || selectableBeneficiaries.length === 0}
          >
            <option value="">Seleccione quién recibirá el servicio</option>
            {selectableBeneficiaries.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} · {b.cedula}
                {b.relationship ? ` · ${b.relationship}` : ''}
              </option>
            ))}
          </Select>
          <p className="mt-1.5 text-[12px] text-on-surface-variant">
            {puedeConsultarTodos
              ? 'Titular/tomador: puede solicitar para cualquier beneficiario de su póliza en La Mundial.'
              : 'Dependiente: solo puede solicitar para sí mismo.'}
            {policyNumber && policyNumber !== '—'
              ? ` Póliza ${policyNumber}.`
              : ''}
          </p>
        </div>

        {(reloading || disabled) && (
          <div className="flex items-center gap-2 text-[13px] text-on-surface-variant">
            <Loader2 className="h-4 w-4 animate-spin" />
            Recargando información de la póliza…
          </div>
        )}

        {selectableBeneficiaries.length === 0 && !reloading && (
          <ValidationAlert messages="No hay cobertura vigente en La Mundial (RMS) para esta cuenta." />
        )}

        {error && <ValidationAlert messages={error} />}

        {result && (
          <div className="rounded-2xl border border-success-container bg-success-container/60 p-4 text-[13px] text-on-success-container">
            <p className="font-bold">Beneficiario seleccionado</p>
            <p className="mt-1 font-semibold">{result.beneficiary.name}</p>
            <p className="mt-1">Documento: {result.beneficiary.cedula}</p>
            {result.beneficiary.policyNumber !== '—' && (
              <p className="mt-2 font-semibold">
                Póliza: {result.beneficiary.policyNumber}
              </p>
            )}
            {result.beneficiary.relationship && (
              <p className="mt-1">Parentesco: {result.beneficiary.relationship}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (!showMundialSearch) {
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="beneficiary-local">Beneficiario</Label>
          <Select
            id="beneficiary-local"
            value={selectedLocalId}
            onChange={(e) => handleSelectBeneficiary(e.target.value)}
            disabled={disabled || beneficiaries.length === 0}
          >
            <option value="">Seleccione un beneficiario</option>
            {beneficiaries.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} · {b.cedula}
              </option>
            ))}
          </Select>
        </div>
        {beneficiaries.length === 0 && (
          <ValidationAlert messages="No hay beneficiarios cargados para esta póliza." />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-form-gap xl:grid-cols-2">
        <div className="xl:col-span-2">
          <Label>Cédula del beneficiario / paciente</Label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <CedulaInput
              className="flex-1"
              placeholder="12345678"
              value={documentInput}
              onChange={handleDocumentChange}
              disabled={disabled || searching}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleSearch();
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              className="sm:min-w-[180px]"
              disabled={disabled || searching || !documentInput.trim()}
              onClick={() => void handleSearch()}
            >
              {searching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando…
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Buscar en RMS
                </>
              )}
            </Button>
          </div>
          <p className="mt-1.5 text-[12px] text-on-surface-variant">
            {RMS_LOOKUP_LABELS[rmsLookup].hint}
          </p>
        </div>
      </div>

      {error && <ValidationAlert messages={error} />}

      {result && (
        <div className="rounded-2xl border border-success-container bg-success-container/60 p-4 text-[13px] text-on-success-container">
          <p className="font-bold">{RMS_LOOKUP_LABELS[rmsLookup].found}</p>
          <p className="mt-1 font-semibold">{result.persona.nombreCompleto}</p>
          <p className="mt-1">
            Documento: {result.persona.nacionalidad}-{result.persona.cedrif}
          </p>
          {result.persona.email && <p>Email: {result.persona.email}</p>}
          {result.beneficiary.policyNumber !== '—' && (
            <p className="mt-2 font-semibold">
              Póliza asociada: {result.beneficiary.policyNumber}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
