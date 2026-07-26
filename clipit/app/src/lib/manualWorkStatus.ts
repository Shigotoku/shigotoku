import type { Manual, ManualWorkStatus } from '../types';

export function manualWorkStatus(m: Manual): ManualWorkStatus {
  return m.workStatus ?? 'in_progress';
}

export function isManualInProgress(m: Manual): boolean {
  return manualWorkStatus(m) === 'in_progress';
}

export const WORK_STATUS_LABEL: Record<ManualWorkStatus, string> = {
  in_progress: '作成中',
  completed: '作成済み',
};
