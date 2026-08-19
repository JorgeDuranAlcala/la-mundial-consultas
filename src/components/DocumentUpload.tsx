import { useId, useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  prevalidateDocumentWithAi,
  validateDocumentFile,
  type DocumentAiPrevalidateResult,
} from '@/lib/documents-api';
import {
  buildAcceptFromFormatos,
  compressImageForUpload,
  DEFAULT_UPLOAD_RULE,
  formatRuleSummary,
  type DocumentUploadRule,
} from '@/lib/document-upload-rules';
import { ValidationAlert } from '@/components/ui/ValidationAlert';

interface DocumentUploadProps {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  file?: File | null;
  tipoDocumentoCod?: string;
  uploadRule?: DocumentUploadRule;
  onFileSelect?: (file: File | null) => void;
  onAiValidation?: (result: DocumentAiPrevalidateResult | null) => void;
  disabled?: boolean;
  expectedNombre?: string | null;
  expectedCedula?: string | null;
  expectedDiagnostico?: string | null;
  expectedTipoServicioCod?: string | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentUpload({
  label,
  hint,
  required,
  className,
  file,
  tipoDocumentoCod,
  uploadRule = DEFAULT_UPLOAD_RULE,
  onFileSelect,
  onAiValidation,
  disabled,
  expectedNombre,
  expectedCedula,
  expectedDiagnostico,
  expectedTipoServicioCod,
}: DocumentUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<DocumentAiPrevalidateResult | null>(null);
  const hasFile = Boolean(file);

  const openPicker = () => {
    if (!disabled && !aiLoading) inputRef.current?.click();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || aiLoading) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPicker();
    }
  };

  const runAiValidation = async (selected: File, tipoCod: string) => {
    setAiLoading(true);
    setAiResult(null);
    onAiValidation?.(null);
    try {
      const result = await prevalidateDocumentWithAi(selected, tipoCod, uploadRule, {
        nombre: expectedNombre ?? undefined,
        cedula: expectedCedula ?? undefined,
        diagnostico: expectedDiagnostico ?? undefined,
        tipoServicioCod: expectedTipoServicioCod ?? undefined,
      });
      setAiResult(result);
      onAiValidation?.(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo validar el documento con IA';
      setFileError(message);
      onAiValidation?.(null);
    } finally {
      setAiLoading(false);
    }
  };

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    e.target.value = '';
    if (!selected) return;

    let fileToUse = selected;
    try {
      fileToUse = await compressImageForUpload(selected, {
        quality: uploadRule.calidadImagen ?? 85,
      });
    } catch {
      fileToUse = selected;
    }

    const error = await validateDocumentFile(fileToUse, uploadRule);
    if (error) {
      setFileError(error);
      setAiResult(null);
      onAiValidation?.(null);
      return;
    }
    setFileError(null);
    setAiResult(null);
    onFileSelect?.(fileToUse);

    if (tipoDocumentoCod) {
      void runAiValidation(fileToUse, tipoDocumentoCod);
    }
  };

  const clearFile = (e: MouseEvent) => {
    e.stopPropagation();
    setFileError(null);
    setAiResult(null);
    onAiValidation?.(null);
    onFileSelect?.(null);
  };

  const aiWarning =
    aiResult &&
    (!aiResult.esConforme ||
      aiResult.tipoDocumentoCoincide === false ||
      !aiResult.esLegible);

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={disabled || aiLoading ? -1 : 0}
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center transition',
          hasFile && aiWarning
            ? 'border-accent bg-accent-container/30 hover:border-accent'
            : hasFile
              ? 'border-success bg-success-container/40 hover:border-success'
              : fileError
                ? 'border-error/60 bg-error-container/30 hover:border-error'
                : 'border-surface-dim bg-surface-container-low hover:border-secondary hover:bg-secondary-fixed/30',
          (disabled || aiLoading) && 'pointer-events-none opacity-60',
          className,
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className="sr-only"
          accept={buildAcceptFromFormatos(uploadRule.formatosPermitidos)}
          disabled={disabled || aiLoading}
          onChange={handleChange}
        />

        {aiLoading ? (
          <>
            <Loader2 className="mb-2 h-8 w-8 animate-spin text-secondary" />
            <p className="text-[13px] font-bold text-on-surface">{label}</p>
            <p className="mt-2 text-[12px] text-on-surface-variant">
              Validando con OCR + IA…
            </p>
          </>
        ) : hasFile && file ? (
          <>
            <div
              className={cn(
                'mb-2 flex h-10 w-10 items-center justify-center rounded-xl',
                aiWarning
                  ? 'bg-accent-container text-accent-dark'
                  : 'bg-success-container text-success',
              )}
            >
              {aiWarning ? (
                <AlertTriangle className="h-5 w-5" strokeWidth={2.2} />
              ) : (
                <CheckCircle2 className="h-5 w-5" strokeWidth={2.2} />
              )}
            </div>
            <p className="text-[13px] font-bold text-on-surface">
              {label}
              {required && <span className="text-accent"> *</span>}
            </p>
            <p className="mt-2 max-w-full truncate text-[12px] font-medium text-primary">
              {file.name}
            </p>
            <p className="mt-1 text-[11px] text-on-surface-variant">
              {formatFileSize(file.size)} · Clic para reemplazar
            </p>
            <button
              type="button"
              onClick={clearFile}
              className="mt-3 inline-flex items-center gap-1 rounded-full border border-outline-variant bg-surface px-3 py-1 text-[11px] font-medium text-on-surface-variant transition hover:border-accent hover:text-accent"
            >
              <X className="h-3 w-3" />
              Quitar archivo
            </button>
          </>
        ) : (
          <>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-fixed text-secondary">
              <Upload className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <p className="text-[13px] font-bold text-on-surface">
              {label}
              {required && <span className="text-accent"> *</span>}
            </p>
            {hint && <p className="mt-1 text-[11px] text-on-surface-variant">{hint}</p>}
            <p className="mt-2 text-[11px] text-on-surface-variant/70">
              Clic para seleccionar · {formatRuleSummary(uploadRule)}
            </p>
          </>
        )}
      </div>

      {fileError && (
        <ValidationAlert title="No se puede subir este archivo" messages={fileError} />
      )}

      {aiWarning && aiResult && (
        <div
          role="alert"
          className="flex gap-2 rounded-xl border border-accent/50 bg-accent-container/50 px-3 py-2 text-[12px] text-on-surface"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent-dark" />
          <div>
            <p className="font-bold text-accent-dark">Documento no conforme</p>
            <p className="mt-0.5 leading-snug">{aiResult.observaciones}</p>
            {!aiResult.validadoConGemini && aiResult.ocrAplicado && (
              <p className="mt-1 text-[11px] text-on-surface-variant">
                Validado con OCR (IA temporalmente no disponible).
              </p>
            )}
          </div>
        </div>
      )}

      {aiResult && !aiWarning && hasFile && (
        <p className="text-[11px] font-medium text-success">
          Documento validado: coincide con el tipo esperado.
        </p>
      )}
    </div>
  );
}
