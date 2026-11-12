# ADR-028: faster-whisper を `local_files_only=True` で運用する

- ステータス: 採用
- 日付: 2026-05-08
- 関連: ADR-011 (faster-whisper 採用), AI開発指示書 §6.2, §1.2

## 文脈

faster-whisper の `WhisperModel` は、モデル名のみを指定するとデフォルトで Hugging Face Hub からモデルを自動ダウンロードする。これは Strict Local Mode の禁止事項「Hugging Face Hub 等からの自動モデルダウンロード」と矛盾する。

## 決定

**`FasterWhisperEngine.transcribe()` 内では必ず `model_local_path` を必須とし、`WhisperModel(local_files_only=True)` で初期化する。**

- `model_local_path is None` の場合は `RuntimeError` を送出して呼び出しを止める。
- API ルータ (`POST /api/asr/transcribe`) は `engine == "faster_whisper"` の場合に、`model_id` から `asr_models` テーブルを引き、`local_path` を `model_local_path` に解決した上でエンジンに渡す。
- `model_id` が未指定なら `Settings.default_asr_model_id` → `Repository.get_default_asr_model()` の順で解決する。それでも見つからなければ `ASR_MODEL_PATH_REQUIRED` を返す。
- ネットワークガードは `socket.connect` レベルで HF Hub の解決先をブロックするので、万が一 `local_files_only` を漏らしたコードがあってもダウンロードは発生しない。二重防御。

## モデル取得手順（運用）

ユーザーが手動で以下を実行する想定:

```bash
# 例: faster-whisper-large-v3 (CTranslate2 形式)
huggingface-cli download Systran/faster-whisper-large-v3 \
    --local-dir PreDeckData/models/asr/faster-whisper/large-v3
```

その上で PreDeck の「モデル管理」画面から `local_path = .../large-v3` で登録する。

## 影響範囲

- `sidecar/app/engines/asr/faster_whisper_engine.py` を本実装に置き換え。
- `sidecar/app/api/asr.py` でモデル ID → ローカルパス解決ロジックを追加。
- フロント「モデル管理」にローカルパス必須の登録 UI を追加。
- pytest: パッケージ未導入時の skip テスト、`model_local_path is None` での RuntimeError テスト。
