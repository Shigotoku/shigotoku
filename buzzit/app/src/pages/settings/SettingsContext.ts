import { createContext, useContext } from 'react';
import type { SettingsState } from './useSettingsState';

export const SettingsContext = createContext<SettingsState | null>(null);

export function useSettings(): SettingsState {
  const v = useContext(SettingsContext);
  if (!v) throw new Error('SettingsContext が必要です');
  return v;
}
