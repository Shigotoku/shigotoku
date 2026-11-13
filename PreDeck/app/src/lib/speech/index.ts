export {
  detectSpeechSupport,
  isIosDevice,
  supportsOnDeviceSpeech,
  getOnDeviceSpeechStatus,
  ensureOnDeviceSpeechReady,
  ensureMicrophonePermission,
  speechErrorMessage,
  startLiveSpeech,
  composeWithInterim,
  type SpeechSupport,
  type SpeechPrivacyMode,
  type OnDeviceSpeechStatus,
  type LiveSpeechOptions,
} from './speechRecognition';
export { applyMedicalTermCorrections, buildSpeechPhraseHints } from './medicalTermPostProcess';
export {
  normalizeSpeechSegment,
  appendJapaneseSpeechSegment,
  finalizeJapaneseSpeechText,
  composeJapaneseInterim,
} from './speechTextFormat';
export {
  getVocabulary,
  setUserDictionary,
  getUserDictionary,
  type SpeechVocabulary,
  type UserDictionaryEntry,
} from './vocabulary';

export { cleanSegment, joinSegment, finalizeText, removeJapaneseSpaces, removeFillers } from './format';

