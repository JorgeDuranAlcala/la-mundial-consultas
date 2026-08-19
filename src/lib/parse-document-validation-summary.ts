export interface DocumentValidationSummaryItem {
  codigo: string;
  mensaje: string;
}

export interface ParsedDocumentValidationSummary {
  isDocumentValidation: boolean;
  intro: string;
  items: DocumentValidationSummaryItem[];
}

const DOCUMENT_CODE_PATTERN = /^[A-Z][A-Z0-9_]+$/;

export function parseDocumentValidationSummary(
  text: string,
): ParsedDocumentValidationSummary {
  const trimmed = text.trim();
  if (!trimmed.includes('Validación documental')) {
    return { isDocumentValidation: false, intro: '', items: [] };
  }

  const dotIndex = trimmed.indexOf('.');
  const intro =
    dotIndex >= 0 ? trimmed.slice(0, dotIndex + 1).trim() : 'Validación documental.';
  const rest = dotIndex >= 0 ? trimmed.slice(dotIndex + 1).trim() : '';

  if (!rest) {
    return { isDocumentValidation: true, intro, items: [] };
  }

  const items = rest
    .split(/\s*\|\s*/)
    .map((part) => {
      const colonIdx = part.indexOf(':');
      if (colonIdx <= 0) return null;
      const codigo = part.slice(0, colonIdx).trim();
      const mensaje = part.slice(colonIdx + 1).trim();
      if (!DOCUMENT_CODE_PATTERN.test(codigo) || !mensaje) return null;
      return { codigo, mensaje };
    })
    .filter((item): item is DocumentValidationSummaryItem => item != null);

  if (items.length === 0) {
    return { isDocumentValidation: false, intro: '', items: [] };
  }

  return { isDocumentValidation: true, intro, items };
}

export function buildDocumentLabelMap(
  documentos: Array<{
    tipoDocumentoCod: string;
    tipoDocumento?: { nombre?: string };
  }>,
): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const doc of documentos) {
    if (!labels[doc.tipoDocumentoCod]) {
      labels[doc.tipoDocumentoCod] =
        doc.tipoDocumento?.nombre ?? doc.tipoDocumentoCod.replace(/_/g, ' ');
    }
  }
  return labels;
}
