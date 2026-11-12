import { chromeOnDeviceEngine } from "./chromeEngine";
import type { AsrEngine } from "./types";

export type { AsrEngine, AsrSession, AsrStartOptions } from "./types";

/**
 * 利用可能なエンジンの登録簿。
 * 追加するとき（例: ブラウザ内 Whisper）は AsrEngine を実装してここに足すだけでよい。
 * 先頭ほど優先。audioLeavesDevice が true のものは自動選択しない。
 */
const engines: AsrEngine[] = [chromeOnDeviceEngine];

export function registerEngine(engine: AsrEngine): void {
  if (!engines.some((e) => e.id === engine.id)) engines.push(engine);
}

export function listEngines(): AsrEngine[] {
  return [...engines];
}

/** 既定のエンジン: 端末内で動き、かつ対応しているもの。無ければ null */
export function pickDefaultEngine(): AsrEngine | null {
  return engines.find((e) => !e.audioLeavesDevice && e.isSupported()) ?? null;
}

export function getEngine(id: string): AsrEngine | undefined {
  return engines.find((e) => e.id === id);
}
