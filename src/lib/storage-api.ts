import { apiFetch } from './api';

export interface StorageUploadResponseApi {
  fileId: string;
  fileName: string;
  originalName: string;
  relativePath: string;
  remotePath: string;
  storageUrl: string;
  companyId: number;
  category: string;
  casoId?: number;
  tipoDocumentoCod?: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  hashSha256?: string;
  documentoCasoId?: number;
  documentoCaso?: {
    id: number;
    casoId: number;
    tipoDocumentoCod: string;
    nombreArchivo: string;
    storageUrl: string;
    mimeType?: string;
    tamanoBytes?: number;
    version?: number;
    esVigente?: boolean;
  };
}

export interface UploadStorageFileInput {
  companyId: number;
  file: File;
  casoId?: number;
  tipoDocumentoCod?: string;
  category?: string;
  linkToCaso?: boolean;
}

export async function uploadStorageFile(
  input: UploadStorageFileInput,
): Promise<StorageUploadResponseApi> {
  const form = new FormData();
  form.append('file', input.file);
  form.append('company_id', String(input.companyId));

  if (input.category) {
    form.append('category', input.category);
  }
  if (input.casoId != null) {
    form.append('caso_id', String(input.casoId));
  }
  if (input.tipoDocumentoCod) {
    form.append('tipo_documento_cod', input.tipoDocumentoCod);
  }
  if (input.linkToCaso != null) {
    form.append('link_to_caso', input.linkToCaso ? 'true' : 'false');
  }

  return apiFetch<StorageUploadResponseApi>('/storage/files/upload', {
    method: 'POST',
    body: form,
  });
}
