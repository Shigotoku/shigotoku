# DeckIt × SHIGOTOKU 既存 GCP 統合メモ

**更新:** 2026-10-01  
**目的:** 新規インフラの重複を避け、モノレポ内の他プロダクトと同じ運用感で DeckIt を載せる。

## 既存モノレポの実態

| 領域 | 現状（shigotoku リポジトリ） | DeckIt での扱い |
|------|------------------------------|------------------------|
| フロント | 各プロダクトは **Vite + React 19 + Tailwind 4**（`clipit/app`, `runwith/app`, `buzzit/app`） | **Next.js App Router**（API Routes + 将来 Cloud Run 1 コンテナ）。UI/トークンは GAS v5 と要件書に合わせる |
| Auth | **Firebase Auth**（Google / Email）。`runwith/app/src/lib/firebase.ts` が参照実装 | Phase B 以降: 専用 Firebase プロジェクト + 既存 `signInWithGoogle` パターンを **Auth Adapter** に包む |
| DB | **Firestore**（プロダクト別プロジェクト分割。`docs/FIREBASE-SPLIT.md`） | メタデータのみ（`03_DATA_MODEL.md`）。本文は Drive |
| API | **Firebase Functions v2**（`buzzit/api`, `clipit/api`, `shapeit/api`） | 長時間ジョブ・Slides/Drive は Phase C 以降 **Cloud Run ワーカー** または Functions のいずれか。最初は Next Route Handlers + mock |
| Hosting | Firebase Hosting + カスタムドメイン | 目標: `app.deckit.shigotoku.com`。新規 `shigotoku-deckit-prod` を `FIREBASE-SPLIT` と同パターンで追加 |
| CI/CD | `.github/workflows/deploy.yml` → `deploy/package.json` の `deploy:*` | Phase 8: `deploy:slide-app` を追加（他アプリと同型） |
| Logging | Cloud Logging（Functions 標準）、構造化ログは API 側で徐々に導入 | `requestId` / `organizationId` を middleware で付与（BuzzIt API と同思想） |
| Secrets | GCP Secret Manager / Firebase 環境 | OAuth クライアント・Gemini キーは Secret Manager。リポジトリに置かない |

## Firebase プロジェクト案（未作成）

`docs/FIREBASE-SPLIT.md` に倣う:

| プロジェクト ID（目標） | 用途 |
|-------------------------|------|
| `shigotoku-deckit-prod` | DeckIt 本番 |
| `shigotoku-deckit-dev` | 開発（または prod のみ + ローカル emulator） |

Hosting サイト ID 例: `shigotoku-deckit-app`

## GAS `mt5Bootstrap` → GCP `GET /api/bootstrap`

Legacy は Drive 待ちで UI を止めないよう **partial bootstrap** を返す。GCP 版も同様:

- `capabilities` — 常に返す（mock でも可）
- `user` / `organization` — Auth 後
- `projects` / `styles` — 非同期・スケルトン表示
- `driveNavigation` — 失敗しても `warnings[]` のみ、Shell は描画継続

## 技術選定の修正（要件書からの差分）

1. **モノレポ配置:** `Slide_Studio/app`（プロダクト境界をフォルダで保持。将来 `deploy/scripts/build-slide-app.mjs`）
2. **Phase A は Google 未接続:** `MockDriveProvider` / `MockSlidesProvider` を `packages/domain` のポート実装
3. **Cloud Run:** 本番は Next standalone イメージ。BuzzIt とは別サービス名（例: `deckit-web`）
4. **組織モデル:** RunWith の `Company` 相当は Slide の `Organization` — フィールド名は Slide ドメインを正とし、共有 DB は使わない（プロジェクト分割）

## 実装フェーズ（開発者向け短縮版）

| Phase | 成果物 | Google 依存 |
|-------|--------|----------------|
| A | App Shell, domain types, mock repos, Playwright green | なし |
| B | Firebase Auth + Firestore repositories | Auth のみ |
| C | Drive/Slides adapters + Picker | OAuth + APIs |
| D | GenerationJob + engine | Gemini 等 |
| E | Style resolver, Reference, Design DNA | 一部 Drive |
| F | deploy スクリプト, audit, billing | — |

## 参照コード（移植しない・パターンのみ）

- `runwith/app/src/lib/firebase.ts` — Google ログイン
- `runwith/app/src/store/auth.ts` — セッション + 初期化
- `buzzit/api/src/index.ts` — Firestore + HTTPS 関数の規模感
- `deploy/package.json` — デプロイコマンド命名
