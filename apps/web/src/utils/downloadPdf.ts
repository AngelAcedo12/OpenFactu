/**
 * Descarga un PDF desde un endpoint autenticado (requiere token + tenantId).
 * Fuerza la descarga con el filename devuelto por el servidor o con fallback.
 */
export async function downloadPdf(
  url: string,
  token: string,
  tenantId: string,
  fallbackName: string = 'documento.pdf'
): Promise<void> {
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error al generar PDF' }));
    throw new Error(err.error || 'Error al generar PDF');
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || fallbackName;

  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}
