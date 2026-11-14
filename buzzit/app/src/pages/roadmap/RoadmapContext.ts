import { createContext, useContext } from 'react';
import type { RoadmapState } from './useRoadmapState';

export const RoadmapContext = createContext<RoadmapState | null>(null);

export function useRoadmap(): RoadmapState {
  const v = useContext(RoadmapContext);
  if (!v) throw new Error('RoadmapContext が必要です');
  return v;
}
