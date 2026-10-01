export function isIos() {
  return /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

export function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

export function isStandalonePwa() {
  return window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean((navigator as { standalone?: boolean }).standalone));
}

export function isNarrowViewport() {
  return window.innerWidth < 768;
}

export function isMobileUi() {
  return isIos() || isAndroid() || isNarrowViewport();
}

export function chromeExtensionSupported() {
  return typeof window !== "undefined" && !isIos() && !isAndroid();
}
