# ShapeIt Firebase / Hosting セットアップ

ClipIt / RunWith と同型の **専用 Firebase プロジェクト** で運用します。

## URL

| 用途 | URL |
|------|-----|
| LP | `https://shigotoku.com/shapeit/`（`shigotoku-prod` Hosting） |
| App | `https://app.shapeit.shigotoku.com` |
| API | `https://app.shapeit.shigotoku.com/api` |

## プロジェクト

| 項目 | 値 |
|------|-----|
| Firebase プロジェクト ID | `shigotoku-shapeit-prod` |
| Hosting サイト ID | `shigotoku-shapeit-app` |
| Firestore コレクション | `shapeit_*`（feedback / issues / changelog / fix_pack_meta / notifications 等） |
| デプロイ設定 | `deploy/firebase.shapeit.json` |

## 伴走チェックリスト（詳細）

リポジトリルートの **[docs/FIREBASE-SHAPEIT-SETUP.md](../../docs/FIREBASE-SHAPEIT-SETUP.md)** を Phase 1 から順に進めてください。

## デプロイコマンド

```powershell
cd deploy
npm run deploy:shapeit        # フル（推奨）
npm run deploy:shapeit-app    # Hosting のみ
npm run deploy:shapeit-api    # API のみ
npm run deploy:shapeit-rules  # Firestore / Storage ルールのみ
```

## 設定ファイル

- `deploy/build.config.mjs` → `SHAPEIT_FIREBASE`
- `deploy/.firebaserc` → エイリアス `shapeit`
- `shapeit/app/.env.example` → ローカル開発用
