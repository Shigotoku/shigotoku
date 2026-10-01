# DeckIt — Cursor Handoff Package

GAS プロトタイプ（旧称 MediToku Slide Studio）を GCP 商用 SaaS **DeckIt** へ移行するための引継ぎパッケージ。

## ブランド

- 製品名: **DeckIt**（デキット）— 「資料、できた。」
- 詳細: `docs/DECKIT-BRAND.md`

## 読む順

1. `docs/DECKIT-BRAND.md`
2. `docs/00_SHIGOTOKU_GCP_INTEGRATION.md`
3. `docs/01_MASTER_REQUIREMENTS.md`（要件は Slide Studio 表記の箇所あり → 製品名は DeckIt）
4. `docs/02_CURSOR_IMPLEMENTATION_PLAN.md`

## Legacy

- `legacy_gas/current/` = 最終 GAS 参照版（仕様書としてのみ）

## アプリ

- `app/` — Next.js（DeckIt UI）
- `packages/domain`, `packages/google-adapters`
- `e2e/` — Playwright

## Firebase

`docs/../../docs/FIREBASE-DECKIT-SETUP.md`（リポジトリルート `docs/FIREBASE-DECKIT-SETUP.md`）
