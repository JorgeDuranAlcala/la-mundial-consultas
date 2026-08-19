import { AlertCircle, CheckCircle2, ShieldCheck, Stethoscope, Landmark, BadgeCheck } from 'lucide-react';
import type { AiValidationResult } from '@/lib/casos-api';
import { formatVigenciaPoliza } from '@/lib/rms-poliza-api';
import { cn } from '@/lib/utils';

interface AiAuditorResultPanelProps {
  aiResult: AiValidationResult;
  className?: string;
}

function fmtUsd(n?: number) {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n.toLocaleString('es-VE', { minimumFractionDigits: 2 })} USD`;
}

function fmtNum(n?: number, suffix = '') {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n.toLocaleString('es-VE', { minimumFractionDigits: 2 })}${suffix}`;
}

function fmtText(value?: string | null) {
  const t = value?.trim();
  return t ? t : '—';
}

export function AiAuditorResultPanel({ aiResult, className }: AiAuditorResultPanelProps) {
  const { allPassed, confiabilidadPct, analisisIA, pertinenciaMedica, compromisoDatos, vigenciaPoliza } = aiResult;

  const vigenciaTexto =
    vigenciaPoliza?.desde || vigenciaPoliza?.hasta
      ? formatVigenciaPoliza(vigenciaPoliza.desde, vigenciaPoliza.hasta)
      : null;

  return (
    <div className={cn("space-y-6 text-left", className)}>
      {/* 1. Header Banner & Reliability Score */}
      <div className={cn(
        "rounded-2xl border p-5 flex flex-col md:flex-row items-center justify-between gap-4",
        allPassed 
          ? "bg-success-container/30 border-success/30 text-success-on-container" 
          : "bg-error-container/30 border-error/30 text-error-on-container"
      )}>
        <div className="flex items-center gap-3">
          {allPassed ? (
            <ShieldCheck className="h-10 w-10 text-success" strokeWidth={1.8} />
          ) : (
            <AlertCircle className="h-10 w-10 text-accent" strokeWidth={1.8} />
          )}
          <div>
            <h3 className="text-base font-bold">
              {allPassed ? 'Caso Aprobado por IA (Auto-Emisión)' : 'Escalado a Auditoría Médica'}
            </h3>
            <p className="text-xs opacity-90 mt-1">
              {allPassed 
                ? 'La auditoría documental y pertinencia médica clínica resultaron conformes. Compromiso emitido.' 
                : 'El caso presenta observaciones o confiabilidad menor al 90%. Se requiere revisión manual.'}
            </p>
          </div>
        </div>
        {confiabilidadPct !== undefined && (
          <div className="flex flex-col items-center justify-center bg-surface px-4 py-2 rounded-2xl border border-outline-variant">
            <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">Confiabilidad</span>
            <span className={cn(
              "text-2xl font-black mt-0.5",
              confiabilidadPct >= 90 ? "text-success" : "text-accent"
            )}>
              {confiabilidadPct}%
            </span>
          </div>
        )}
      </div>

      {/* 2. Document Checklist (Phase 1) */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-outline-variant pb-2">
          <BadgeCheck className="h-5 w-5 text-primary" />
          <h4 className="font-bold text-sm text-primary">Fase 1: Auditoría Documental y de Identidad</h4>
        </div>
        {analisisIA ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(analisisIA).map(([key, check]) => {
              const labelMap: Record<string, string> = {
                identificacionDocumentos: 'Identificación de Documentos',
                legibilidadIntegridad: 'Legibilidad e Integridad',
                completitud: 'Completitud de Requisitos',
                correspondenciaBeneficiario: 'Correspondencia del Beneficiario',
                coherenciaDiagnostico: 'Coherencia de Diagnóstico',
                validacionFechas: 'Validación de Fechas',
              };
              const muestraVigencia = key === 'validacionFechas' && Boolean(vigenciaTexto);
              return (
                <div key={key} className="flex gap-2.5 p-3 rounded-xl bg-surface border border-outline-variant/60">
                  <div className="mt-0.5">
                    {check.status ? (
                      <CheckCircle2 className="h-4 w-4 text-success fill-success/10" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-accent fill-accent/10" />
                    )}
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-on-surface">
                      {labelMap[key] || key}
                    </p>
                    {muestraVigencia && (
                      <p className="text-[11px] font-semibold text-on-surface mt-0.5">
                        Vigencia de póliza: {vigenciaTexto}
                      </p>
                    )}
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      {key === 'validacionFechas' && vigenciaTexto
                        ? check.observaciones
                            .replace(/Vigencia de póliza:\s*Desde\s*[^.]+\./gi, '')
                            .replace(/Desde\s+\d{2}\/\d{2}\/\d{4}\s*[–-]\s*Hasta\s+\d{2}\/\d{2}\/\d{4}/gi, '')
                            .trim() || 'Fechas cotejadas con la vigencia de la póliza seleccionada.'
                        : check.observaciones}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[12px] text-on-surface-variant">
            La auditoría cruzada no devolvió comprobaciones de identidad. Revise el resumen del caso.
            {vigenciaTexto ? ` Vigencia de póliza: ${vigenciaTexto}.` : ''}
          </p>
        )}
      </div>

      {/* 3. Clinical Pertinence Check (Phase 2) */}
      {pertinenciaMedica && (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-5 space-y-5">
          <div className="flex items-center gap-2 border-b border-outline-variant pb-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            <h4 className="font-bold text-sm text-primary">Fase 2: Evaluación Clínica y Pertinencia</h4>
          </div>

          {/* Vital Signs Table */}
          <div className="space-y-2">
            <h5 className="text-[12px] font-bold text-on-surface-variant">Signos Vitales y Triaje</h5>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              {Object.entries(pertinenciaMedica.evaluacionSalud.signosVitales || {}).map(([name, val]) => {
                const labelMap: Record<string, string> = {
                  tensionArterial: 'Tensión Art.',
                  frecuenciaCardiaca: 'Frec. Cardíaca',
                  frecuenciaRespiratoria: 'Frec. Resp.',
                  saturacionOxigeno: 'Sat. Oxígeno',
                  temperatura: 'Temperatura',
                };
                return (
                  <div key={name} className="p-2.5 rounded-xl bg-surface border border-outline-variant/60">
                    <p className="text-[10px] text-on-surface-variant uppercase">{labelMap[name] || name}</p>
                    <p className="text-xs font-bold text-on-surface mt-0.5">{val || '—'}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Clinical Pillar List */}
          <div className="space-y-3">
            <h5 className="text-[12px] font-bold text-on-surface-variant">Criterios Médicos Clínicos Evaluados</h5>
            <div className="grid gap-2.5">
              {Object.entries(pertinenciaMedica.pertinencia || {}).map(([key, check]) => {
                const labelMap: Record<string, string> = {
                  necesidadMedicaReal: 'Necesidad Médica Real',
                  proporcionalidad: 'Proporcionalidad del Tratamiento',
                  adecuacionGuiasClinicas: 'Adecuación a Guías Clínicas',
                  coherenciaDocumental: 'Coherencia Documental (Informe vs Presupuesto)',
                  riesgoBeneficio: 'Evaluación Riesgo vs Beneficio',
                };
                return (
                  <div key={key} className="flex gap-2.5 text-xs">
                    <span className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full mt-0.5 text-[9px] font-bold text-white",
                      check.status ? "bg-success" : "bg-accent"
                    )}>
                      {check.status ? '✓' : '!'}
                    </span>
                    <div>
                      <span className="font-bold text-on-surface">{labelMap[key] || key}: </span>
                      <span className="text-on-surface-variant">{check.observaciones}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. RMS Integration Commitment Card */}
      {compromisoDatos && (
        <div className="rounded-2xl border border-primary-fixed bg-surface-container-high p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-outline-variant pb-2">
            <Landmark className="h-5 w-5 text-primary" />
            <h4 className="font-bold text-sm text-primary">Compromiso Financiero y Registro RMS</h4>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 text-xs">
            {/* Actividad 1: Sintomatología */}
            <div className="bg-surface border border-outline-variant p-3 rounded-xl space-y-1.5">
              <p className="font-bold text-primary text-[11px] uppercase tracking-wider">Actividad: Registrar Sintomatología</p>
              <p className="text-on-surface-variant"><strong className="text-on-surface">Causa:</strong> {fmtText(compromisoDatos.causa)}</p>
              <p className="text-on-surface-variant"><strong className="text-on-surface">Subcausa:</strong> {fmtText(compromisoDatos.subcausa)}</p>
              <p className="text-on-surface-variant"><strong className="text-on-surface">Tratamiento:</strong> {fmtText(compromisoDatos.tratamiento)}</p>
            </div>

            {/* Actividad 2: Cobertura */}
            <div className="bg-surface border border-outline-variant p-3 rounded-xl space-y-1.5">
              <p className="font-bold text-primary text-[11px] uppercase tracking-wider">Actividad: Cobertura</p>
              <p className="text-on-surface-variant"><strong className="text-on-surface">Cobertura:</strong> {fmtText(compromisoDatos.coberturaNombre)}</p>
              <p className="text-on-surface-variant"><strong className="text-on-surface">Suma Asegurada:</strong> {fmtUsd(compromisoDatos.sumaAsegurada)}</p>
              <p className="text-on-surface-variant"><strong className="text-on-surface">Monto Ajuste:</strong> {fmtUsd(compromisoDatos.montoAjuste)}</p>
              <p className="text-on-surface-variant"><strong className="text-on-surface">Suma Disponible:</strong> {fmtUsd(compromisoDatos.sumaDisponible)}</p>
            </div>

            {/* Actividad 3: Registro de Reserva */}
            <div className="bg-surface border border-outline-variant p-3 rounded-xl space-y-1.5">
              <p className="font-bold text-primary text-[11px] uppercase tracking-wider">Actividad: Registro de Reserva</p>
              <p className="text-on-surface-variant"><strong className="text-on-surface">Reserva Inicial:</strong> {fmtNum(compromisoDatos.reservaInicial)}</p>
              <p className="text-on-surface-variant"><strong className="text-on-surface">Monto Reserva:</strong> {fmtUsd(compromisoDatos.montoReserva)}</p>
              <p className="text-on-surface-variant"><strong className="text-on-surface">Tasa de Cambio:</strong> {fmtNum(compromisoDatos.tasaCambio, ' Bs.')}</p>
            </div>

            {/* Actividad 4: Confirmación Siniestro */}
            <div className="bg-surface border border-outline-variant p-3 rounded-xl space-y-1.5">
              <p className="font-bold text-primary text-[11px] uppercase tracking-wider">Actividad: Confirmación de Cierre</p>
              <p className="text-on-surface-variant"><strong className="text-on-surface">Totales:</strong> {fmtNum(compromisoDatos.totales)}</p>
              <p className="text-on-surface-variant"><strong className="text-on-surface">Tipo de Pago:</strong> {fmtText(compromisoDatos.tipoPago)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
