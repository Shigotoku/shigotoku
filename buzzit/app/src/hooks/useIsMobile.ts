import { useEffect, useState } from 'react';

/** Tailwind `lg` 未満をモバイル扱い（サイドバーがドロワーになる幅） */
export function useIsMobile(breakpointPx = 1024) {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpointPx : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const onChange = () => setMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [breakpointPx]);

  return mobile;
}
