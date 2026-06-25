import { apiFetch } from '../lib/api';

export async function generateManualPdf(manualId: string): Promise<{ pdfUrl: string; pageCount: number }> {
  return apiFetch(`/v1/manuals/${encodeURIComponent(manualId)}/pdf`, { method: 'POST' });
}

export async function applyStepMasksServer(
  manualId: string,
  stepId: string,
  masks?: Array<{ x: number; y: number; width: number; height: number; type?: string }>,
): Promise<{ screenshotUrl: string }> {
  return apiFetch(`/v1/steps/${encodeURIComponent(stepId)}/apply-masks`, {
    method: 'POST',
    body: JSON.stringify({ manualId, masks }),
  });
}
