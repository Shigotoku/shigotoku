# PreDeck Web 版 移行計画（案）

作成日: 2026-11-12 / 状態: フェーズ0〜1の土台を実装済み（app/ で PDF 取り込み・録音が動作。認証・文字起こし・AI は未実装）

## 1. 方針

| 項目 | 決定 |
|------|------|
| 形態 | Web アプリ。シゴトクの他アプリ（ShapeIt / ClipIt 等）と同じ構成 |
| スライド取り込み | **PDF のみ**（pptx 直接取り込みは廃止） |
| スライド・音声の保存 | **サーバー／クラウドに保存しない**（端末内のみ） |
| AI へ送るデータ | **テキストのみ**（スライド画像・音声は送らない） |
| DeckIt との関係 | 別アプリのまま連携（PDF エクスポート／インポート、共通ログイン） |
| 想定端末 | 個人端末（端末内の文字起こしが重い場合のみサーバー経由を代替に） |
| コスト | 文字起こしは端末内、AI は軽量モデル優先、無料枠は回数制限＋BYOK |

## 2. 目標構成（他アプリと同形式）

```
PreDeck/
├── landing-page/   # Astro（現 landing-page/*.html を移植）
├── app/            # React + Vite + TypeScript + Tailwind（Firebase Auth）
├── api/            # Cloud Functions / Cloud Run（TypeScript。AI 中継のみ・保存なし）
├── legacy/         # 現 main.py + static/（移行完了まで参照用に保持。完了後に削除）
└── docs/
```

- URL 案: `shigotoku.com/predeck/`（LP）、`app.predeck.shigotoku.com`（アプリ）
- `deploy/build.mjs` と `firebase` 設定に PreDeck を追加（DeckIt と同じ手順）

## 3. 現行 API の移行先

| 現行 `main.py` の機能 | Web 版での扱い |
|----------------------|----------------|
| `/api/upload-slides`, `/api/convert-pdf`, `/api/slides/*` | **ブラウザ内**（PDF.js で描画。サーバー不要） |
| `/api/open-pptx`, `/api/open-app-folder`, `/api/local-ip` 等 PC 操作系 | **廃止** |
| `/api/transcribe`, `/api/transcribe-chunk*` | **端末内**。ちょこっとワークスの音声入力（Chrome の Web Speech オンデバイス認識＋専門用語辞書＋整形）を採用。`app/src/lib/speech/` に取り込み済み |
| `/api/improve-script(-stream)`, `/api/analyze-*`, `/api/suggest-metaphors`, `/api/pressure-pitch` | `api/` が **テキストのみ**を LLM に中継（ログ非保存、ストリーミング維持） |
| `/api/convert-english`, `/api/speakable-english`, `/api/translate-transcript` | 同上。英語原稿の自動作成と練習の中核 |
| `/api/sessions*` | **端末内保存**（IndexedDB）。クラウド保存は有料オプション（別途検討） |
| `/api/ollama-*`, `/api/whisper-model-check`, `/api/system-spec`, `/api/setup-check`, `/api/tags`, `/api/test-ai` | 廃止または簡素化（ローカル LLM は Web 版では非対応） |
| `/api/status`, `/api/version` | `api/` のヘルスチェックに集約 |

## 4. データ・プライバシー設計

- Firebase に保存するのは **アカウント・プラン・利用回数のみ**（スライド・音声・原稿本文は保存しない）。
- `api/` はリクエスト本文をログに出さない。LLM 側も保存オフの設定を使う。
- UI に「スライドと音声は端末の外に出ません。AI にはテキストだけを送ります」を明示。
- 利用規約・プライバシーポリシーをこの方針で PreDeck 用に用意する。

## 5. コスト設計

- 文字起こし: 端末内（サーバー費用ゼロ）。
- 軽い処理（誤字・言い回し）: 小型モデル。重い処理（構成改善・英訳）のみ上位モデル。
- 無料枠は 1 日／月の回数制限。超過は有料プラン、または利用者自身の API キー（BYOK）。
- 送信テキスト量を制限（スライド単位で分割、不要部分は送らない）。

## 6. DeckIt 連携

- DeckIt → PreDeck: スライドを **PDF で書き出し**、PreDeck に取り込む（ファイル経由。クラウド共有しない）。
- PreDeck → DeckIt: 改善後の原稿テキストをコピー／ファイル出力（将来的に連携 API は任意）。
- ログインは Firebase Auth を共通化できるか別途確認（アプリごとのプロジェクト分離は売却のため維持）。

## 7. 段階計画

| フェーズ | 内容 |
|---------|------|
| 0 | 本計画の承認、`legacy/` への退避（`main.py`, `static/`） |
| 1 | `app/` 雛形（ShapeIt と同構成）、認証、PDF 取り込み・表示、端末内録音 |
| 2 | **完了（初版）**: ちょこっとワークス由来の端末内文字起こし＋医療／科学／物理辞書＋マイ辞書。残り: 整形層（`textPostprocess` 相当）の取り込み、実機での精度検証、Chrome 以外の代替 |
| 3 | **完了（初版）**: `api/` の AI 中継（改善・英語化・評価）、日次の無料枠、BYOK。認証（Firebase Auth・Google）の接続とデプロイ設定は実装済み。残り: Firebase プロジェクト作成と実デプロイ（docs/PREDECK-FIREBASE-SETUP.md）、課金 |
| 4 | 英語機能（英語原稿の自動作成、練習、差分表示） |
| 5 | LP の Astro 化、デプロイ統合、規約整備、`legacy/` 削除 |

## 8. 未決事項

- 端末内 Whisper の精度・速度（日本語。モデルサイズの選定）
- 使用する LLM と原価の試算
- 履歴のクラウド保存を有料機能として出すか
- ブランド・ドメイン（`predeck` サブドメインの確定）
- Web 版移行後、ローカル版（`legacy/`）を提供し続けるか


## 9. 文字起こし方針（2026-11-12 追記）

- 採用: ちょこっとワークスの `speech-common`（Web Speech API・端末内モード）。音声はクラウドへ出ない（`privacyMode: clinical`）。
- 専門用語: `vocabulary/` に **medical / science（物理・化学・生物・数学・単位）/ academic（両方）** を用意。確定文の補正＋Chrome のフレーズバイアスの両方で使う。
- マイ辞書: 利用者が「正しい表記=誤認識」を登録（端末内 localStorage）。標準辞書より優先。
- 制約: Chrome（推奨）の最新版が前提。日本語音声パックの初回ダウンロードが必要。Safari/Firefox・スマホは非対応か不安定。
- 今後: 辞書の拡充（分野別パック）、誤認識の自動学習、英語練習用の発音差分、Chrome 非対応時の代替（サーバー経由 ASR）。
- 元資料のライセンス・社内利用範囲は要確認（売却時の権利整理に影響）。

## 10. 追加の検討資料

- 方式比較・ライセンス確認: [ASR-AND-LICENSE-REVIEW.md](./ASR-AND-LICENSE-REVIEW.md)


- 認識エンジンは `app/src/lib/asr/` の `AsrEngine` で差し替え可能（2026-11-12）。音声が端末外に出るエンジンは既定では選ばれない。
