import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { fitHeadlines, initHeadlineFit } from "../lib/headlineFit";
import { enhanceJpWrap } from "../lib/jpWrap";

export default function HeadlineFitRoot() {
  const { pathname } = useLocation();

  useEffect(() => {
    initHeadlineFit();
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      fitHeadlines();
      enhanceJpWrap();
      document.fonts?.ready.then(() => {
        fitHeadlines();
        enhanceJpWrap();
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
