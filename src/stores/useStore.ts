import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Beneficiary, PortalCompania, ServiceRequest, User, UserRole } from '@/lib/types';
import { ApiError } from '@/lib/api';
import { loginApi, meApi, type AuthUserResponse } from '@/lib/auth-api';
import {
  buildCreateCasoPayload,
  cambiarEstadoCaso,
  createCaso,
  listCasos,
} from '@/lib/casos-api';
import { loadDefaultCoverage } from '@/lib/coverage-api';
import {
  mapCasoToServiceRequest,
  mapStatusToEstado,
} from '@/lib/caso-mappers';
import type { ServiceType } from '@/lib/types';
import {
  canAccessPortal,
  homePathForRole,
  resolveUserRole,
} from '@/lib/roles';

const DEMO_BENEFICIARIES: Beneficiary[] = [];

const DEMO_REQUESTS: ServiceRequest[] = [];

function mapAuthUser(
  apiUser: AuthUserResponse,
  compania: PortalCompania,
  portalRole: UserRole,
): User {
  const role = resolveUserRole(apiUser.roles);
  const displayRole = canAccessPortal(apiUser.roles, portalRole) ? portalRole : role;

  return {
    id: String(apiUser.id),
    username: apiUser.username,
    name: apiUser.nombreCompleto?.trim() || apiUser.username,
    email: apiUser.email ?? apiUser.username,
    role: displayRole,
    backendRoles: apiUser.roles,
    companiaId: Number(apiUser.companiaId ?? compania.id),
    companiaNombre: compania.nombre,
  };
}

interface AuthState {
  selectedCompania: PortalCompania | null;
  user: User | null;
  token: string | null;
  isHydrating: boolean;
  setSelectedCompania: (compania: PortalCompania) => void;
  login: (username: string, password: string, portalRole: UserRole) => Promise<string | null>;
  establishSession: (
    token: string,
    apiUser: AuthUserResponse,
    portalRole: UserRole,
  ) => string | null;
  hydrateSession: () => Promise<void>;
  logout: () => void;
}

interface AppState {
  requests: ServiceRequest[];
  beneficiaries: Beneficiary[];
  defaultPolizaId: number | null;
  defaultCompaniaId: number | null;
  defaultAseguradoTitularId: number | null;
  /** Tomador/titular pueden consultar todos los asociados; dependiente solo el suyo. */
  puedeConsultarTodos: boolean;
  vinculoParentesco: string | null;
  vinculoBeneficiarioId: number | null;
  /** Cédula del usuario autenticado asociada a la póliza (tipo-numero). */
  vinculoCedula: string | null;
  isLoadingCasos: boolean;
  isLoadingCoverage: boolean;
  casosError: string | null;
  loadCoverage: (companiaId?: number) => Promise<void>;
  refreshCasos: () => Promise<void>;
  submitCaso: (input: {
    serviceType: ServiceType;
    beneficiarioId: number;
    polizaId?: number;
    companiaId?: number;
    motivoConsulta?: string;
    montoSolicitado?: number;
    esPrioritario?: boolean;
    usuarioCreadorId?: number;
    casoOrigenId?: number;
    intakeStepData?: Record<string, string>;
    portalStepData?: Array<{ serviceStepId: number; data: Record<string, string> }>;
  }) => Promise<{ requestId: string; casoId: number }>;
  updateCasoStatus: (
    casoId: number,
    status: ServiceRequest['status'],
    notes?: string,
    usuarioId?: number,
  ) => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      selectedCompania: null,
      user: null,
      token: null,
      isHydrating: true,

      setSelectedCompania: (compania) => set({ selectedCompania: compania }),

      hydrateSession: async () => {
        const { token, selectedCompania } = get();
        if (!token || !selectedCompania) {
          set({ isHydrating: false, user: null, token: null });
          return;
        }

        try {
          const apiUser = await meApi();
          const role = resolveUserRole(apiUser.roles);
          set({
            user: mapAuthUser(apiUser, selectedCompania, role),
            isHydrating: false,
          });
        } catch {
          set({ user: null, token: null, isHydrating: false });
        }
      },

      login: async (username, password, portalRole) => {
        const selectedCompania = get().selectedCompania;
        if (!selectedCompania) return null;

        const { token, user: apiUser } = await loginApi(username, password);

        if (!canAccessPortal(apiUser.roles, portalRole)) {
          throw new ApiError(
            403,
            'Tu usuario no tiene permisos para este tipo de acceso. Selecciona el rol correcto.',
          );
        }

        if (
          apiUser.companiaId != null &&
          Number(apiUser.companiaId) !== Number(selectedCompania.id)
        ) {
          throw new ApiError(
            403,
            'Este usuario no pertenece a la compañía seleccionada.',
          );
        }

        const user = mapAuthUser(apiUser, selectedCompania, portalRole);
        set({ token, user });
        return homePathForRole(user.role);
      },

      establishSession: (token, apiUser, portalRole) => {
        const selectedCompania = get().selectedCompania;
        if (!selectedCompania) return null;

        if (!canAccessPortal(apiUser.roles, portalRole)) {
          throw new ApiError(
            403,
            'Tu usuario no tiene permisos para este tipo de acceso.',
          );
        }

        if (
          apiUser.companiaId != null &&
          Number(apiUser.companiaId) !== Number(selectedCompania.id)
        ) {
          throw new ApiError(
            403,
            'Este usuario no pertenece a la compañía seleccionada.',
          );
        }

        const user = mapAuthUser(apiUser, selectedCompania, portalRole);
        set({ token, user });
        return homePathForRole(user.role);
      },

      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'logistika-auth',
      partialize: (state) => ({
        selectedCompania: state.selectedCompania,
        user: state.user,
        token: state.token,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          void state.hydrateSession();
        } else {
          useAuth.setState({ isHydrating: false });
        }
      },
    },
  ),
);

export const useAppStore = create<AppState>()((set, get) => ({
  requests: DEMO_REQUESTS,
  beneficiaries: DEMO_BENEFICIARIES,
  defaultPolizaId: null,
  defaultCompaniaId: null,
  defaultAseguradoTitularId: null,
  puedeConsultarTodos: true,
  vinculoParentesco: null,
  vinculoBeneficiarioId: null,
  vinculoCedula: null,
  isLoadingCasos: false,
  isLoadingCoverage: false,
  casosError: null,

  loadCoverage: async (companiaId) => {
    set({ isLoadingCoverage: true, casosError: null });
    try {
      const authUser = useAuth.getState().user;
      const ctx = await loadDefaultCoverage(
        companiaId ?? authUser?.companiaId ?? undefined,
        authUser?.email,
        { role: authUser?.role },
      );
      if (!ctx) {
        set({
          beneficiaries: [],
          defaultPolizaId: null,
          defaultCompaniaId: null,
          defaultAseguradoTitularId: null,
          puedeConsultarTodos: true,
          vinculoParentesco: null,
          vinculoBeneficiarioId: null,
          vinculoCedula: null,
          isLoadingCoverage: false,
        });
        return;
      }
      const beneficiaries: Beneficiary[] = ctx.beneficiarios
        .filter((b) => b.activoEnPoliza)
        .map((b) => ({
          id: String(b.id),
          beneficiarioId: b.id,
          polizaId: ctx.polizaId,
          name: `${b.nombres} ${b.apellidos}`.trim(),
          cedula: `${b.tipoCedula ?? 'V'}-${b.cedula}`,
          relationship: b.parentescoNombre ?? b.parentescoCod ?? 'Titular',
          policyNumber: ctx.numeroPoliza,
        }));
      set({
        beneficiaries,
        defaultPolizaId: ctx.polizaId,
        defaultCompaniaId: Number(ctx.companiaId),
        defaultAseguradoTitularId: Number(ctx.aseguradoTitularId),
        puedeConsultarTodos: ctx.vinculoUsuario?.puedeConsultarTodos ?? true,
        vinculoParentesco: ctx.vinculoUsuario?.parentescoCod ?? null,
        vinculoBeneficiarioId: ctx.vinculoUsuario?.beneficiarioId ?? null,
        vinculoCedula:
          ctx.vinculoUsuario?.tipoCedula && ctx.vinculoUsuario?.cedula
            ? `${ctx.vinculoUsuario.tipoCedula}-${ctx.vinculoUsuario.cedula}`
            : null,
        isLoadingCoverage: false,
      });
    } catch (err) {
      set({
        beneficiaries: [],
        defaultPolizaId: null,
        defaultCompaniaId: null,
        defaultAseguradoTitularId: null,
        puedeConsultarTodos: true,
        vinculoParentesco: null,
        vinculoBeneficiarioId: null,
        vinculoCedula: null,
        isLoadingCoverage: false,
        casosError:
          err instanceof Error ? err.message : 'No se pudo cargar cobertura',
      });
    }
  },

  refreshCasos: async () => {
    set({ isLoadingCasos: true, casosError: null });
    try {
      const casos = await listCasos();
      const requests = casos.map((c) => {
        const mapped = mapCasoToServiceRequest(c);
        return {
          id: mapped.id,
          casoId: mapped.casoId,
          type: mapped.type,
          status: mapped.status,
          beneficiaryName: mapped.beneficiaryName,
          cedula: mapped.cedula,
          createdAt: mapped.createdAt,
          updatedAt: mapped.updatedAt,
          amount: mapped.amount,
          requiresDoctor: mapped.requiresDoctor,
          estadoCod: mapped.estadoCod,
          tipoServicioCod: mapped.tipoServicioCod,
          beneficiarioId: mapped.beneficiarioId,
          polizaId: mapped.polizaId,
        };
      });
      set({ requests, isLoadingCasos: false });
    } catch (err) {
      set({
        isLoadingCasos: false,
        casosError:
          err instanceof Error ? err.message : 'No se pudieron cargar los casos',
      });
    }
  },

  submitCaso: async (input) => {
    const { defaultPolizaId, defaultCompaniaId, defaultAseguradoTitularId } = get();
    const polizaId = input.polizaId ?? defaultPolizaId;
    const companiaId = input.companiaId ?? defaultCompaniaId;
    if (!polizaId || !companiaId) {
      throw new Error('Cobertura no cargada. Verifique el beneficiario e intente de nuevo.');
    }

    const mergedFromPortal = input.portalStepData?.length
      ? Object.assign({}, ...input.portalStepData.map((e) => e.data))
      : {};
    const intake = input.intakeStepData ?? mergedFromPortal;
    const motivoConsulta =
      input.motivoConsulta ?? intake.MOTIVO_CONSULTA ?? undefined;
    const montoRaw = intake.MONTO_SOLICITADO ?? intake.MONTO_ESTIMADO;
    const montoSolicitado =
      input.montoSolicitado ??
      (montoRaw ? Number(montoRaw) : undefined);

    const payload = buildCreateCasoPayload(
      input.serviceType,
      companiaId,
      polizaId,
      input.beneficiarioId,
      input.usuarioCreadorId,
      {
        motivoConsulta,
        montoSolicitado,
        esPrioritario: input.esPrioritario,
        aseguradoId: defaultAseguradoTitularId ?? undefined,
        casoOrigenId: input.casoOrigenId,
        intakeStepData: input.portalStepData
          ? undefined
          : Object.keys(intake).length
            ? intake
            : undefined,
        portalStepData: input.portalStepData,
      },
    );

    const created = await createCaso(payload);
    const mapped = mapCasoToServiceRequest(created);
    const request: ServiceRequest = {
      id: mapped.id,
      casoId: mapped.casoId,
      type: mapped.type,
      status: mapped.status,
      beneficiaryName: mapped.beneficiaryName,
      cedula: mapped.cedula,
      createdAt: mapped.createdAt,
      updatedAt: mapped.updatedAt,
      amount: mapped.amount,
      requiresDoctor: mapped.requiresDoctor,
      estadoCod: mapped.estadoCod,
      tipoServicioCod: mapped.tipoServicioCod,
      beneficiarioId: mapped.beneficiarioId,
      polizaId: mapped.polizaId,
    };

    set((s) => ({ requests: [request, ...s.requests] }));
    return { requestId: request.id, casoId: request.casoId! };
  },

  updateCasoStatus: async (casoId, status, notes, usuarioId) => {
    const estadoCod = mapStatusToEstado(status);
    const updated = await cambiarEstadoCaso(casoId, estadoCod, notes, usuarioId);
    const mapped = mapCasoToServiceRequest(updated);

    set((s) => ({
      requests: s.requests.map((r) =>
        r.casoId === casoId
          ? {
              ...r,
              status: mapped.status,
              notes: notes ?? r.notes,
              updatedAt: mapped.updatedAt,
              estadoCod: mapped.estadoCod,
            }
          : r,
      ),
    }));
  },
}));
