import type { CasoHistorialApi } from './caso-detail-api';

export const RECAUDO_NOTA_GENERICA = 'Médico solicita recaudos adicionales';

export const RECAUDO_TIPO_KEYWORDS: Record<string, string[]> = {
  PRESUPUESTO: ['presupuesto', 'cotizacion', 'proforma', 'factura proforma'],
  INFORME_MEDICO: [
    'informe medico',
    'historia clinica',
    'informe justificativo',
  ],
  ESTUDIOS_PARACLINICOS: [
    'paraclinicos',
    'paracl\u00ednicos',
    'imagenes',
    'estudios',
    'examenes',
    'laboratorio',
    'ecografia',
    'radiografia',
    'resonancia',
    'tomografia',
  ],
  CEDULA_BENEFICIARIO: [
    'cedula',
    'partida de nacimiento',
    'identificacion',
  ],
  CARTA_NARRATIVA: ['carta narrativa'],
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function getNotaMedicoRecaudo(
  historial: CasoHistorialApi[],
): string | null {
  if (!historial?.length) return null;

  const entries = [...historial]
    .filter((entry) => entry.estadoCod === 'RECAUDO_PENDIENTE')
    .sort(
      (a, b) =>
        new Date(b.registradoEn).getTime() -
        new Date(a.registradoEn).getTime(),
    );

  for (const entry of entries) {
    const nota = entry.observacion?.trim();
    if (!nota) continue;
    if (normalize(nota) === normalize(RECAUDO_NOTA_GENERICA)) continue;
    return nota;
  }

  return null;
}

export function sugerirTipoDocumento(nota: string): string | null {
  if (!nota?.trim()) return null;
  const normalized = normalize(nota);

  for (const tipoCod of Object.keys(RECAUDO_TIPO_KEYWORDS)) {
    if (normalized.includes(normalize(tipoCod))) return tipoCod;
  }

  for (const [tipoCod, keywords] of Object.entries(RECAUDO_TIPO_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalized.includes(normalize(keyword))) return tipoCod;
    }
  }

  return null;
}
