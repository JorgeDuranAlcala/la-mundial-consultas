import { ServiceWizard } from '@/pages/ServiceWizard';

export function ReembolsoPage() {
  return (
    <ServiceWizard title="Solicitar servicio de reembolso" serviceType="reembolso" />
  );
}

export function ApsPage() {
  return (
    <ServiceWizard
      title="Solicitar y emitir orden de servicio (APS)"
      serviceType="aps"
    />
  );
}

export function FarmaciaPage() {
  return (
    <ServiceWizard
      title="Solicitar y emitir orden de farmacia"
      serviceType="farmacia"
    />
  );
}

export function CartaAvalPage() {
  return (
    <ServiceWizard title="Solicitar servicio de carta aval" serviceType="carta-aval" />
  );
}

export function EmergenciaPage() {
  return (
    <ServiceWizard
      title="Solicitar servicio de emergencias médicas"
      serviceType="emergencia"
    />
  );
}
