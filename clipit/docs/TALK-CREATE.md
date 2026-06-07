# 話して作成（Google Meet 連携）

**更新:** 2026-06-04

## 概要

操作のクリック記録だけでは伝わらない「なぜ」「NG」「注意点」を、Google Meet で画面共有しながら説明し、文字起こしとスクショを AI が1本のマニュアルに統合する機能です。

## Phase 1（MVP・実装済み）

1. Meet で業務画面を見せながら説明
2. 会議後、Google ドキュメントの文字起こしをコピー
3. アプリ `/manuals/new/talk` で貼り付け + スクショアップロード（タイムスタンプ任意）
4. `POST /v1/ai/merge-talk-steps` で Gemini マルチモーダル統合
5. プレビュー確認後 `ingest` でマニュアル保存 → 編集画面

### 関連ファイル

| 層 | パス |
|----|------|
| API | `clipit/api/src/services/talkMerge.ts`, `index.ts` |
| アプリ | `ManualTalkCreatePage.tsx`, `services/talkCreate.ts` |
| 用語辞書 | `lib/termGlossary.ts`, 設定画面 |
| 健康診断 | `lib/manualHealthCheck.ts`, `ManualHealthPanel.tsx` |

### 用語辞書

組織設定で1行1語。API 統合時に文字起こしへ適用。未設定時は医療・SaaS向けデフォルト語彙を使用。

## Phase 2（未実装）

- Google Meet API / Drive からの文字起こし自動取得
- Meet 説明モード（拡張からワンクリックで会議開始ガイド）
- 現場QR・教育パック連携

## 3本柱の作成導線

`/manuals/new` から選択:

1. **クリック記録** → `/manuals/new/record`
2. **話して作成** → `/manuals/new/talk`
3. **スクショ** → `/manuals/new/screenshots`
