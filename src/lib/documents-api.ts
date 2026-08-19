import { uploadStorageFile } from './storage-api';
import { getApiBase } from './api';
import { useAuth } from '@/stores/useStore';
import {
  DEFAULT_UPLOAD_RULE,
  type DocumentUploadRule,
  validateFileAgainstRule,
} from './document-upload-rules';

export interface DocumentoCasoApi {
  id: number;
  casoId: number;
  tipoDocumentoCod: string;
  nombreArchivo: string;
  storageUrl?: string;
  mimeType?: string;
  tamanoBytes?: number;
  version?: number;
  esVigente?: boolean;
}

export async function validateDocumentFile(
  file: File,
  rule: DocumentUploadRule = DEFAULT_UPLOAD_RULE,
): Promise<string | null> {
  return validateFileAgainstRule(file, rule);
}

export interface DocumentAiPrevalidateResult {
  tipoDocumentoCod: string;
  nombreArchivo: string;
  puedeAnalizar: boolean;
  esLegible: boolean;
  esConforme: boolean;
  confianza: number;
  observaciones: string;
  tipoDocumentoCoincide?: boolean;
  ocrAplicado?: boolean;
  validadoConGemini?: boolean;
}

export async function prevalidateDocumentWithAi(
  file: File,
  tipoDocumentoCod: string,
  rule?: DocumentUploadRule,
  esperado?: { nombre?: string; cedula?: string; diagnostico?: string; tipoServicioCod?: string },
): Promise<DocumentAiPrevalidateResult> {
  const validationError = await validateDocumentFile(file, rule);
  if (validationError) {
    throw new Error(validationError);
  }

  const form = new FormData();
  form.append('file', file);
  form.append('tipo_documento_cod', tipoDocumentoCod);
  if (esperado?.nombre?.trim()) {
    form.append('nombre_esperado', esperado.nombre.trim());
  }
  if (esperado?.cedula?.trim()) {
    form.append('cedula_esperada', esperado.cedula.trim());
  }
  if (esperado?.diagnostico?.trim()) {
    form.append('diagnostico_esperado', esperado.diagnostico.trim());
  }
  if (esperado?.tipoServicioCod?.trim()) {
    form.append('tipo_servicio_cod', esperado.tipoServicioCod.trim());
  }

  const token = useAuth.getState().token;
  const response = await fetch(`${getApiBase()}/ai/validar-documento`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  const text = await response.text();
  let payload: DocumentAiPrevalidateResult | { message?: string } | null = null;
  if (text) {
    try {
      payload = JSON.parse(text) as DocumentAiPrevalidateResult;
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload && payload.message
        ? String(payload.message)
        : `Error ${response.status} al validar documento`;
    throw new Error(message);
  }

  return payload as DocumentAiPrevalidateResult;
}

export async function uploadCasoDocument(
  casoId: number,
  companyId: number,
  tipoDocumentoCod: string,
  file: File,
  _cargadoPorUsuarioId?: number,
  rule?: DocumentUploadRule,
): Promise<DocumentoCasoApi> {
  const validationError = await validateDocumentFile(file, rule);
  if (validationError) {
    throw new Error(validationError);
  }

  const stored = await uploadStorageFile({
    companyId,
    casoId,
    tipoDocumentoCod,
    file,
    category: 'medical',
    linkToCaso: true,
  });

  const documento = stored.documentoCaso;
  if (documento) {
    return documento;
  }

  if (stored.documentoCasoId) {
    return {
      id: stored.documentoCasoId,
      casoId,
      tipoDocumentoCod,
      nombreArchivo: stored.originalName,
      storageUrl: stored.storageUrl,
      mimeType: stored.mimeType,
      tamanoBytes: stored.sizeBytes,
      esVigente: true,
    };
  }

  throw new Error('No se pudo registrar el documento en el caso');
}

