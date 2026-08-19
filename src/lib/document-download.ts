import { getApiBase } from "./api";
import { useAuth } from "@/stores/useStore";
import type { CasoDocumentoApi } from "./caso-detail-api";

function resolveDocumentUrl(doc: CasoDocumentoApi): string {
  const base = getApiBase();
  // Preferir descarga por ID: el backend resuelve storage:// y legacy
  return `${base}/storage/files/download?documento_caso_id=${doc.id}`;
}

async function fetchDocumentBlob(doc: CasoDocumentoApi): Promise<Blob> {
  const token = useAuth.getState().token;
  const url = resolveDocumentUrl(doc);

  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Error ${response.status} al obtener el documento`;
    try {
      const json = JSON.parse(text) as { message?: string | string[] };
      if (json.message) {
        message = Array.isArray(json.message)
          ? json.message.join(" ")
          : json.message;
      }
    } catch {
      if (text) message = text.slice(0, 200);
    }
    throw new Error(message);
  }

  return response.blob();
}

export async function downloadCasoDocument(
  doc: CasoDocumentoApi,
): Promise<void> {
  const blob = await fetchDocumentBlob(doc);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = doc.nombreArchivo || "documento";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function viewCasoDocument(doc: CasoDocumentoApi): Promise<void> {
  // Abrir pestaña de inmediato (evita bloqueo de popup tras await)
  const previewTab = window.open("about:blank", "_blank");
  try {
    const blob = await fetchDocumentBlob(doc);
    const objectUrl = URL.createObjectURL(blob);
    if (previewTab) {
      previewTab.location.href = objectUrl;
    } else {
      window.open(objectUrl, "_blank", "noopener,noreferrer");
    }
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch (err) {
    previewTab?.close();
    throw err;
  }
}

export function canPreviewDocument(doc: CasoDocumentoApi): boolean {
  const mime = doc.mimeType?.toLowerCase() ?? "";
  const name = doc.nombreArchivo.toLowerCase();
  return (
    mime.startsWith("image/") ||
    mime === "application/pdf" ||
    name.endsWith(".pdf") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png")
  );
}
