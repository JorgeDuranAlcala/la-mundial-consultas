import { apiFetch } from './api';
import type { PortalCompania } from './types';

export interface CompaniaApi {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
  tipo?: string;
}

const COMPANIA_COLORS: Record<string, string> = {
  LA_MUNDIAL: '#0f1a5a',
  LOGISTIKA_DEMO: '#2e6dbf',
};

const FALLBACK_COLORS = ['#0f1a5a', '#2e6dbf', '#1a5a4a', '#4a1a5a'];

function shortNameForCompania(nombre: string, codigo: string): string {
  if (codigo === 'LA_MUNDIAL') return 'La Mundial';
  if (codigo.includes('LOGISTIKA')) return 'Logistika';
  const parts = nombre.trim().split(/\s+/);
  if (parts.length >= 2 && parts[0].toLowerCase() === 'la') {
    return `${parts[0]} ${parts[1]}`;
  }
  return parts[0] ?? nombre;
}

export function mapCompaniaToPortal(compania: CompaniaApi, index = 0): PortalCompania {
  return {
    id: Number(compania.id),
    codigo: compania.codigo,
    nombre: compania.nombre,
    descripcion: compania.descripcion ?? null,
    shortName: shortNameForCompania(compania.nombre, compania.codigo),
    color: COMPANIA_COLORS[compania.codigo] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
  };
}

export async function fetchPortalCompanias(): Promise<PortalCompania[]> {
  const rows = await apiFetch<CompaniaApi[]>(
    '/configuracion/companias?activo=true',
    {},
    { auth: false },
  );
  return rows.map(mapCompaniaToPortal);
}
