export function collectRequiredFieldErrors(
  fields: Array<{ code: string; name: string; required: boolean }>,
  values: Record<string, string>,
): string[] {
  const errors: string[] = [];
  for (const field of fields) {
    if (!field.required) continue;
    const value = values[field.code]?.trim();
    if (!value) {
      errors.push(`Complete el campo "${field.name}"`);
    }
  }
  return errors;
}

export function collectRequiredDocumentErrors(
  documents: Array<{ tipo_documento_cod: string; obligatorio: boolean }>,
  files: Record<string, File>,
  docLabels: Record<string, string>,
): string[] {
  const errors: string[] = [];
  for (const doc of documents) {
    if (!doc.obligatorio) continue;
    if (!files[doc.tipo_documento_cod]) {
      const label = docLabels[doc.tipo_documento_cod] ?? doc.tipo_documento_cod;
      errors.push(`Suba el documento obligatorio: ${label}`);
    }
  }
  return errors;
}
