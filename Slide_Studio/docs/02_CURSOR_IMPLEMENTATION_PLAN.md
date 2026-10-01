# Cursor Implementation Plan

## Milestone 0 — Existing GCP discovery
**完了メモ:** `docs/00_SHIGOTOKU_GCP_INTEGRATION.md`  
要約: Firebase Auth/Firestore/Hosting/Functions パターンは shigotoku モノレポ既存。**DeckIt** は **専用 Firebase `shigotoku-deckit-prod`** + **Next.js（`Slide_Studio/app`）**。Phase A は mock のみ。

## Milestone 1 — UI Skeleton（現在）
Next.js + TypeScript + `packages/domain`。mock `BootstrapService` で sidebar、4-step composer、Project、Style、source dropzone、preview、dialogs（即時開閉）、responsive、**Playwright**（`Slide_Studio/e2e`）。

## Milestone 2 — Domain / Firestore（進行中）
`packages/domain` + サーバー `slide_*` コレクション。初回ログインで personal org + スターター Style を自動作成（`provisioning.ts`）。

## Milestone 3 — Auth（進行中）
Firebase Auth（Google）、`AuthGate`、`NEXT_PUBLIC_DECKIT_DATA_MODE=mock|firebase`。E2E は常に mock。

## Milestone 4 — Google Drive（骨格）
`/api/google/drive/status|connect`、`@deckit/google-adapters` mock。OAuth トークン交換は C-2。

## Milestone 5 — Slides
template copy、create deck、thumbnail、preview、PPTX。

## Milestone 6 — Generation
ManualGeminiEngineから開始可。外部JSONは内部DeckPlan型へ正規化。

## Milestone 7 — Style & Learning
Effective Style resolver、Reference、Design DNA、edited-deck learning。

## Milestone 8 — Production
Billing、usage、audit、OAuth verification、monitoring、runbook。

## DoD
no white screen / immediate feedback / error isolation / retry / idempotency / automated test。
