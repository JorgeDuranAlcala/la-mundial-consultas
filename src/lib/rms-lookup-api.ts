import { buscarProveedorRmsPorCedula } from './rms-proveedor-api';
import { buscarPersonaRmsPorCedula, type PersonaRmsResponse } from './rms-persona-api';
import type { UserRole } from './types';

export type RmsLookupTarget = 'personas' | 'proveedores';

export function getRmsLookupTargetForRole(role: UserRole | undefined): RmsLookupTarget {
  return role === 'clinica' ? 'proveedores' : 'personas';
}

export async function buscarRmsPorCedula(
  target: RmsLookupTarget,
  params: {
    nacionalidad: string;
    cedrif: number;
    correlativo: number;
  },
): Promise<PersonaRmsResponse> {
  if (target === 'proveedores') {
    return buscarProveedorRmsPorCedula(params);
  }
  return buscarPersonaRmsPorCedula(params);
}
