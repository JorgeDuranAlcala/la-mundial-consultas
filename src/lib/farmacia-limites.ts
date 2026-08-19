import { formatMontoField } from '@/lib/locale-number';

/** Tope mensual de Orden de Farmacia (USD) — solo pólizas colectivas. */
export const FARMACIA_TOPE_MENSUAL_USD = 60;

export function mensajeTopeFarmacia(tope = FARMACIA_TOPE_MENSUAL_USD): string {
  return `En pólizas colectivas el tope mensual de farmacia es USD ${formatMontoField(tope)}. No puede continuar con un monto mayor.`;
}

export function farmaciaMontoExcedeTope(
  monto: number,
  tope = FARMACIA_TOPE_MENSUAL_USD,
): boolean {
  return Number.isFinite(monto) && monto > tope;
}

export function farmaciaTopeAplica(esColectiva?: boolean | null): boolean {
  return Boolean(esColectiva);
}

export function resolveMontoCap(params: {
  serviceType: string;
  sumaAsegurada?: number | null;
  /** Solo farmacia: tope $60 si la póliza RMS es colectiva. */
  esColectiva?: boolean | null;
}): number | null {
  const suma =
    params.sumaAsegurada != null &&
    Number.isFinite(params.sumaAsegurada) &&
    params.sumaAsegurada > 0
      ? params.sumaAsegurada
      : null;

  if (params.serviceType === 'farmacia') {
    if (farmaciaTopeAplica(params.esColectiva)) {
      return suma != null
        ? Math.min(FARMACIA_TOPE_MENSUAL_USD, suma)
        : FARMACIA_TOPE_MENSUAL_USD;
    }
    return suma;
  }
  return suma;
}
