export interface TalkScreenshotInput {
  imageBase64: string;
  timestamp?: string;
  label?: string;
}

export interface MergedTalkStep {
  title: string;
  instruction: string;
  note?: string;
  type?: 'normal' | 'warning' | 'ng_example' | 'check';
  elementText?: string;
  screenshotIndex: number;
}

export interface TalkMergeResult {
  steps: MergedTalkStep[];
  usedGemini: boolean;
  mergeMode: 'rules' | 'text_ai';
  ruleConfidence: number;
  warnings: string[];
}
