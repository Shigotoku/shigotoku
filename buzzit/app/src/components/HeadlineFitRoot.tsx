import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { fitHeadlines, initHeadlineFit } from '../lib/headlineFit';

export default function HeadlineFitRoot() {
  const { pathname } = useLocation();

  useEffect(() => {
    initHeadlineFit();
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      fitHeadlines();
      document.fonts?.ready.then(fitHeadlines);
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
