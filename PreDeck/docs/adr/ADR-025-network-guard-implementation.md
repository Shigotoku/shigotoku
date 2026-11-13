# ADR-025: Strict Local Mode のネットワークガード実装方式

| 項目 | 内容 |
|---|---|
| 状態 | 採用 |
| 決定日 | 2026-05-08 |
| 起票者 | AI エージェント |
| 関連 | ADR-010, ADR-014、要件定義書 §4.2、AI開発指示書 §1.2 / §9.3 |

## 背景

Strict Local Mode は外部送信が起きないことを技術的に保証する必要がある。
ライブラリ（`httpx`, `requests`, `urllib`, `aiohttp`, ...）ごとにブロックを書くより、
最下層の `socket` レイヤでガードする方が漏れにくい。

## 判断

sidecar 起動時に次のガードを段階的に有効化する。

1. **socket 監視**: `socket.socket.connect` と `socket.socket.connect_ex` をモンキーパッチし、
   宛先アドレスがループバック（`127.0.0.0/8`, `::1`）または `settings.allowed_hosts`（既定 `["127.0.0.1", "localhost"]`）以外の場合は `StrictLocalModeViolation` を送出する。
2. **DNS 監視**: `socket.getaddrinfo` の戻り値を検査し、解決先がループバックか `allowed_hosts` 内であることを確認する。
3. **明示許可ホスト**: クラウド許可モードを後で追加するときは、`allowed_hosts` への追加とユーザー承認の両方が必要。
4. **テスト**: pytest で `httpx.get("https://example.com")` の呼び出しがガードで拒否されることを検証する。
5. **監査ログ**: 違反検出時は `PreDeckData/logs/network_guard.log` に時刻・呼出元・宛先を記録する（個人情報を含めない）。

## 代替案

- ファイアウォール / OS 機能による外部通信ブロック: 確実だがクロスプラットフォーム実装が大がかり。アプリ層では使えない。
- ライブラリ単位のガード: `httpx` などの将来追加に追従するのが難しい。

## 影響

- sidecar の `localhost` / `127.0.0.1` 内通信（Ollama 等）は許可されるため、ローカル LLM 結線時に支障はない。
- テスト時には `pytest` のフィクスチャで一時的にホスト許可リストを操作する。

## 必須条件・後続タスク

- ネットワークガードはアプリ起動時の **最初** にインストールする。
- フロントエンド側でも `fetch` を `tauri://localhost` または `http://127.0.0.1:8765` に限定する `safeFetch` ラッパーを実装する。
- Tauri の `tauri.conf.json` で CSP / allowlist を最小化する。

## 参照

- 要件定義書 §4.2
- AI開発指示書 §1.2, §9.3
- 設計判断記録 ADR-010
