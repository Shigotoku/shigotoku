# ADR-026: Ollama を HTTP API 経由で接続する

- ステータス: 採用
- 日付: 2026-05-08
- 関連: ADR-013, ADR-014, ADR-025, AI開発指示書 §7

## 文脈

MVP の `LocalOllamaEngine` を実結線するにあたり、

1. ローカル Ollama サーバ (`http://127.0.0.1:11434`) を HTTP で直接叩く
2. 公式 Python クライアント (`ollama-python`) を依存追加する
3. Tauri 側 Rust から呼ぶ

の 3 案を検討した。

## 決定

**1. HTTP 直叩きを採用する。**

- 追加の Python 依存は `httpx` のみ（既に dev 依存にあり、本体依存に昇格）。
- パッケージのリリース速度に左右されず、Ollama の REST 仕様 (`/api/chat`, `/api/generate`, `/api/tags`) のみで完結。
- Strict Local Mode のネットワークガードは `socket.connect` レベルで動作するため、`127.0.0.1:11434` は自然に許可される。逆に外部 Ollama を指せばそこで拒否される（ガードはホストのみで判定）。
- `format: "json"` パラメータで JSON Schema 強制。
- 失敗時は `2 回まで` リトライし、validation 失敗とパース失敗を区別して `validation_errors` で返す。

## 補足: Ollama URL の検証

ユーザーが設定で URL を変えられるが、`PATCH /api/settings` 側で `urlparse(url).hostname` がループバック以外なら `OLLAMA_URL_NOT_LOOPBACK` を返す。 Strict Local Mode を維持しつつ、ポート変更や `localhost`/`127.0.0.1` の使い分けは許可する。

## 不採用案

- 公式 Python ライブラリ: 追加依存となり、ライセンス確認も増える。HTTP 直叩きで足りる。
- Rust 側: フロント／バックエンドの責務分離を崩す。FastAPI sidecar に閉じる方針 (ADR-006) を維持。

## 影響範囲

- `sidecar/app/engines/llm/ollama_engine.py` を本実装。
- `pyproject.toml` の本体依存に `httpx` を追加。
- `app/api/settings.py` で `ollama_base_url` 検証を追加。
- フロント `SettingsPage` に Ollama URL / 既定モデル名の編集 UI を追加。
