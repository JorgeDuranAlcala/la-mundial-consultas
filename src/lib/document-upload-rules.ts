export type ResolucionPreset =
  | 'ORIGINAL'
  | 'VGA'
  | 'HD_720'
  | 'FULL_HD_1080'
  | 'UHD_4K'
  | 'CUSTOM';

export const RESOLUCION_PRESETS: Record<
  ResolucionPreset,
  { label: string; minWidth: number; minHeight: number }
> = {
  ORIGINAL: { label: 'Original (sin mínimo)', minWidth: 0, minHeight: 0 },
  VGA: { label: 'VGA 480p (640×480)', minWidth: 640, minHeight: 480 },
  HD_720: { label: 'HD 720p (1280×720)', minWidth: 1280, minHeight: 720 },
  FULL_HD_1080: {
    label: 'Full HD 1080p (1920×1080)',
    minWidth: 1920,
    minHeight: 1080,
  },
  UHD_4K: { label: '4K UHD (3840×2160)', minWidth: 3840, minHeight: 2160 },
  CUSTOM: { label: 'Personalizado', minWidth: 0, minHeight: 0 },
};

export const TAMANO_MB_OPCIONES = [1, 2, 5, 10, 20, 50, 150] as const;
export const FORMATOS_DOCUMENTO = ['PDF', 'JPG', 'PNG'] as const;
export type FormatoDocumento = (typeof FORMATOS_DOCUMENTO)[number];

export interface DocumentUploadRule {
  tipoDocumentoCod: string;
  maxSizeMb: number;
  resolucionPreset: ResolucionPreset;
  minAnchoPx?: number | null;
  minAltoPx?: number | null;
  calidadImagen?: number | null;
  formatosPermitidos: FormatoDocumento[];
}

export const DEFAULT_UPLOAD_RULE: DocumentUploadRule = {
  tipoDocumentoCod: '_DEFAULT_',
  maxSizeMb: 5,
  resolucionPreset: 'HD_720',
  calidadImagen: 85,
  formatosPermitidos: ['PDF', 'JPG', 'PNG'],
};

export function resolveMinResolution(rule: DocumentUploadRule): {
  minWidth: number;
  minHeight: number;
} {
  if (rule.resolucionPreset === 'CUSTOM') {
    return {
      minWidth: rule.minAnchoPx ?? 0,
      minHeight: rule.minAltoPx ?? 0,
    };
  }
  const preset = RESOLUCION_PRESETS[rule.resolucionPreset] ?? RESOLUCION_PRESETS.HD_720;
  return { minWidth: preset.minWidth, minHeight: preset.minHeight };
}

export function mimeMatchesFormatos(
  mimeType: string,
  fileName: string,
  formatos: FormatoDocumento[],
): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const mime = mimeType.toLowerCase();

  const checks: Record<FormatoDocumento, boolean> = {
    PDF: mime === 'application/pdf' || ext === 'pdf',
    JPG: mime === 'image/jpeg' || mime === 'image/jpg' || ext === 'jpg' || ext === 'jpeg',
    PNG: mime === 'image/png' || ext === 'png',
  };

  return formatos.some((f) => checks[f]);
}

export function buildAcceptFromFormatos(formatos: FormatoDocumento[]): string {
  const parts: string[] = [];
  if (formatos.includes('PDF')) parts.push('.pdf', 'application/pdf');
  if (formatos.includes('JPG')) parts.push('.jpg', '.jpeg', 'image/jpeg');
  if (formatos.includes('PNG')) parts.push('.png', 'image/png');
  return parts.join(',');
}

export function mapConfigApiToRule(row: {
  tipoDocumentoCod: string;
  maxSizeMb: number;
  resolucionPreset: string;
  minAnchoPx?: number | null;
  minAltoPx?: number | null;
  calidadImagen?: number | null;
  formatosPermitidos?: string[] | null;
}): DocumentUploadRule {
  return {
    tipoDocumentoCod: row.tipoDocumentoCod,
    maxSizeMb: Number(row.maxSizeMb),
    resolucionPreset: (row.resolucionPreset as ResolucionPreset) || 'HD_720',
    minAnchoPx: row.minAnchoPx,
    minAltoPx: row.minAltoPx,
    calidadImagen: row.calidadImagen,
    formatosPermitidos: (row.formatosPermitidos?.length
      ? row.formatosPermitidos
      : DEFAULT_UPLOAD_RULE.formatosPermitidos) as FormatoDocumento[],
  };
}

export async function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith('image/')) return null;

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

export async function validateFileAgainstRule(
  file: File,
  rule: DocumentUploadRule,
): Promise<string | null> {
  const maxBytes = rule.maxSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return `El archivo supera el tamaño máximo permitido (${rule.maxSizeMb} MB)`;
  }

  if (!mimeMatchesFormatos(file.type, file.name, rule.formatosPermitidos)) {
    return `Formato no permitido. Use: ${rule.formatosPermitidos.join(', ')}`;
  }

  const isImage =
    file.type.startsWith('image/') || /\.(jpe?g|png)$/i.test(file.name);

  if (isImage) {
    const { minWidth, minHeight } = resolveMinResolution(rule);
    if (minWidth > 0 || minHeight > 0) {
      const dims = await getImageDimensions(file);
      if (!dims) {
        return 'No se pudo verificar la resolución de la imagen.';
      }
      if (dims.width < minWidth || dims.height < minHeight) {
        return `Resolución insuficiente (${dims.width}×${dims.height}). Mínimo: ${minWidth}×${minHeight} px`;
      }
    }
  }

  return null;
}

export function formatRuleSummary(rule: DocumentUploadRule): string {
  const { minWidth, minHeight } = resolveMinResolution(rule);
  const resolucion =
    rule.resolucionPreset === 'CUSTOM'
      ? `${minWidth}×${minHeight} px`
      : RESOLUCION_PRESETS[rule.resolucionPreset]?.label ?? rule.resolucionPreset;
  return `${rule.maxSizeMb} MB · ${resolucion} · ${rule.formatosPermitidos.join(', ')}`;
}


/** Comprime JPEG/PNG grandes para acelerar carga y validación IA. */
export async function compressImageForUpload(
  file: File,
  options?: { maxEdge?: number; quality?: number },
): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  if (file.size < 800 * 1024) return file;

  const maxEdge = options?.maxEdge ?? 1920;
  const quality = (options?.quality ?? 85) / 100;

  const dims = await getImageDimensions(file);
  if (!dims) return file;

  const scale = Math.min(1, maxEdge / Math.max(dims.width, dims.height));
  const width = Math.round(dims.width * scale);
  const height = Math.round(dims.height * scale);

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', quality),
  );
  if (!blob || blob.size >= file.size) return file;

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'imagen';
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}