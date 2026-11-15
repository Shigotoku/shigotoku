# PreDeck（プレデキ）

話すだけでプレゼン原稿を整え、本番に近い形で練習できるローカルファーストのデスクトップ向けアプリです。

## フォルダ構成

| パス | 内容 |
|------|------|
| `app/` | **Web 版**（React + Vite + TS + Tailwind）。PDF 取り込み・録音は端末内で完結 |
| `api/` | AI 中継 API（Cloud Functions。テキストのみ・保存なし・無料枠/BYOK） |
| `landing-page/` | 静的 LP（今後 Astro 化） |
| `legacy/` | 旧ローカル版（FastAPI `main.py` + `static/`）。Web 版移行完了まで参照用 |
| `docs/` | 要件定義・ADR・移行計画（[`WEB-MIGRATION-PLAN.md`](./docs/WEB-MIGRATION-PLAN.md)） |

## 起動（Web 版）

```bash
cd PreDeck/app && npm install && npm run dev   # http://localhost:5179
```

## 起動（旧ローカル版・Windows）

`legacy/install.bat`（初回）→ `legacy/start.bat`（`http://localhost:8000`）
## ドキュメント

正本は [`docs/要件定義書 Ver7.0（完全統合版）.md`](./docs/要件定義書%20Ver7.0（完全統合版）.md)。索引は [`docs/README.md`](./docs/README.md)。

## シゴトク monorepo 内での位置づけ

他プロダクト（ClipIt / RunWith 等）と同様、`PreDeck/` がプロダクトルートです。LP の Firebase 統合やデプロイは未接続です。



