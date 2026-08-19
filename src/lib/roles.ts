import type { UserRole } from './types';

/** Roles del backend (cat_rol_portal) */
export type BackendRole = 'ASEGURADO' | 'PROVEEDOR_SERVICIOS';

export const PORTAL_ROLE_BACKEND: Record<UserRole, BackendRole[]> = {
  clinica: ['PROVEEDOR_SERVICIOS'],
  asegurado: ['ASEGURADO'],
};

export function resolveUserRole(backendRoles: string[]): UserRole {
  if (
    backendRoles.includes('PROVEEDOR_SERVICIOS') ||
    backendRoles.some((r) => r.startsWith('PROVEEDOR_'))
  ) {
    return 'clinica';
  }
  return 'asegurado';
}

export function canAccessPortal(backendRoles: string[], portalRole: UserRole): boolean {
  if (portalRole === 'clinica') {
    return backendRoles.some(
      (r) => r === 'PROVEEDOR_SERVICIOS' || r.startsWith('PROVEEDOR_'),
    );
  }
  const allowed = PORTAL_ROLE_BACKEND[portalRole];
  return backendRoles.some((r) => allowed.includes(r as BackendRole));
}

export function homePathForRole(_role: UserRole): string {
  return '/app/consulta';
}

export const DEMO_CREDENTIALS: Record<
  UserRole,
  { username: string; password: string; hint: string }
> = {
  clinica: {
    username: 'proveedor.demo',
    password: 'demo123',
    hint: 'Proveedor de servicios (registrarse con RIF J-031225887-0)',
  },
  asegurado: {
    username: 'asegurado.demo',
    password: 'demo123',
    hint: 'Asegurado titular (registrarse con cédula 12345678)',
  },
};
