const MOBILE_MQ = '(max-width: 767px)';

function getTargets(): HTMLElement[] {
  const set = new Set<HTMLElement>();
  document.querySelectorAll<HTMLElement>('[data-headline-fit]').forEach((el) => set.add(el));
  document.querySelectorAll<HTMLElement>('main h1.font-bold:not([data-headline-fit-off])').forEach((el) =>
    set.add(el),
  );
  document.querySelectorAll<HTMLElement>('main h2.font-bold:not([data-headline-fit-off])').forEach((el) =>
    set.add(el),
  );
  return [...set];
}

export function fitHeadlines() {
  const mobile = window.matchMedia(MOBILE_MQ).matches;
  getTargets().forEach((node) => {
    node.style.fontSize = '';
    node.style.whiteSpace = '';
    if (!mobile) return;

    const wrap = node.closest('.headline-fit-wrap') as HTMLElement | null;
    const maxWidth = wrap?.clientWidth ?? node.parentElement?.clientWidth ?? window.innerWidth;
    const maxPx = Number(node.dataset.headlineMax) || 30;
    const minPx = Number(node.dataset.headlineMin) || 13;

    node.style.whiteSpace = 'nowrap';
    let low = minPx;
    let high = maxPx;
    while (high - low > 0.25) {
      const mid = (low + high) / 2;
      node.style.fontSize = `${mid}px`;
      if (node.scrollWidth > maxWidth) high = mid;
      else low = mid;
    }
    node.style.fontSize = `${low}px`;
  });
}

let initialized = false;
let observer: ResizeObserver | null = null;

export function initHeadlineFit() {
  fitHeadlines();
  if (initialized) return;
  initialized = true;

  window.addEventListener('resize', fitHeadlines);
  document.fonts?.ready.then(fitHeadlines);

  observer = new ResizeObserver(() => fitHeadlines());
  document.querySelectorAll('.headline-fit-wrap').forEach((el) => observer!.observe(el));
  const main = document.querySelector('main');
  if (main) observer.observe(main);
}
