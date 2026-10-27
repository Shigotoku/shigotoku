"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalMailSecrets = exports.functionSecrets = void 0;
exports.functionSecrets = ["GEMINI_API_KEY"];
/** 招待メール用。Secret 登録後に shapeitApi の secrets に追加して再デプロイ */
exports.optionalMailSecrets = ["RESEND_API_KEY"];
