import { useEffect, useState } from 'react';
import {
  fetchLineSteps,
  fetchScheduledJobs,
  fetchSettings,
  fetchDashboard,
} from '../lib/api';
import type { SetupSignals } from '../lib/setupDiagnosis';

const empty: SetupSignals = {
  metaConnected: false,
  lineConnected: false,
  hasDestinationUrl: false,
  hasScheduledOrPost: false,
  hasLineStep: false,
  liveDashboard: false,
};

export function useSetupSignals() {
  const [signals, setSignals] = useState<SetupSignals>(empty);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const next = { ...empty };

      try {
        const settings = await fetchSettings();
        next.metaConnected = !!settings.metaConnected;
        next.lineConnected = !!settings.lineChannelAccessToken?.trim();
        next.hasDestinationUrl = !!settings.defaultDestinationUrl?.trim();
      } catch {
        /* ignore */
      }

      try {
        const jobs = await fetchScheduledJobs();
        next.hasScheduledOrPost = jobs.jobs.length > 0;
      } catch {
        /* ignore */
      }

      try {
        const steps = await fetchLineSteps();
        next.hasLineStep = steps.steps.length > 0;
      } catch {
        /* ignore */
      }

      try {
        await fetchDashboard();
        // 連携が1つでもあれば本番寄りとみなす（完全モック固定表示を避ける）
        next.liveDashboard = next.metaConnected || next.lineConnected || next.hasScheduledOrPost;
      } catch {
        next.liveDashboard = false;
      }

      if (!cancelled) {
        setSignals(next);
        setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return { signals, loading, isSample: !signals.liveDashboard };
}
