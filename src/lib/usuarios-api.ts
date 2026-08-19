import { apiFetch } from './api';

export interface UsuarioPortalApi {
  id: number;
  username: string;
  email?: string | null;
  nombreCompleto?: string | null;
  telefono?: string | null;
  proveedorId?: number | null;
  companiaId?: number | null;
  activo?: boolean;
  ultimoAccesoEn?: string | null;
  roles?: Array<{ rolCodigo?: string; rol?: { codigo?: string; nombre?: string } }>;
}

export interface CreateUsuarioPayload {
  username: string;
  password: string;
  email?: string;
  nombreCompleto?: string;
  telefono?: string;
  companiaId?: number;
  activo?: boolean;
  roles?: string[];
  nacionalidad?: string;
  cedrif?: number;
  correlativo?: number;
  perfilAsegurado?: 'TITULAR' | 'BENEFICIARIO';
  titularNacionalidad?: string;
  titularCedrif?: number;
}

export interface UpdateUsuarioPayload {
  email?: string;
  password?: string;
  nombreCompleto?: string;
  telefono?: string;
  activo?: boolean;
}

export const PORTAL_ROLES = [
  { codigo: 'ADMIN', label: 'Administrador' },
  { codigo: 'MEDICO_AUDITOR', label: 'Médico auditor' },
  { codigo: 'PROVEEDOR_SERVICIOS', label: 'Proveedor de servicios' },
  { codigo: 'ASEGURADO', label: 'Asegurado' },
] as const;

function normalizeUsuario(user: UsuarioPortalApi): UsuarioPortalApi {
  return {
    ...user,
    id: Number(user.id),
    companiaId: user.companiaId != null ? Number(user.companiaId) : null,
    proveedorId: user.proveedorId != null ? Number(user.proveedorId) : null,
  };
}

export function getUsuarioRoleCodes(user: UsuarioPortalApi): string[] {
  return (user.roles ?? [])
    .map((r) => r.rolCodigo ?? r.rol?.codigo)
    .filter((c): c is string => Boolean(c));
}

export async function fetchUsuarios(activo = true): Promise<UsuarioPortalApi[]> {
  const rows = await apiFetch<UsuarioPortalApi[]>(
    `/usuarios?activo=${activo ? 'true' : 'false'}`,
  );
  return rows.map(normalizeUsuario);
}

export async function createUsuario(payload: CreateUsuarioPayload): Promise<UsuarioPortalApi> {
  const created = await apiFetch<UsuarioPortalApi>('/usuarios', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      companiaId: payload.companiaId != null ? Number(payload.companiaId) : undefined,
      activo: payload.activo ?? true,
    }),
  });
  return normalizeUsuario(created);
}

export async function updateUsuario(
  id: number,
  payload: UpdateUsuarioPayload,
): Promise<UsuarioPortalApi> {
  const updated = await apiFetch<UsuarioPortalApi>(`/usuarios/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return normalizeUsuario(updated);
}

export async function assignUsuarioRole(
  userId: number,
  rolCodigo: string,
): Promise<void> {
  await apiFetch(`/usuarios/${userId}/roles`, {
    method: 'POST',
    body: JSON.stringify({ rolCodigo }),
  });
}

export async function removeUsuarioRole(
  userId: number,
  rolCodigo: string,
): Promise<void> {
  await apiFetch(`/usuarios/${userId}/roles/${encodeURIComponent(rolCodigo)}`, {
    method: 'DELETE',
  });
}

export async function syncUsuarioPrimaryRole(
  userId: number,
  currentRoles: string[],
  newRole: string,
): Promise<void> {
  for (const role of currentRoles) {
    if (role !== newRole) {
      await removeUsuarioRole(userId, role);
    }
  }
  if (!currentRoles.includes(newRole)) {
    await assignUsuarioRole(userId, newRole);
  }
}
