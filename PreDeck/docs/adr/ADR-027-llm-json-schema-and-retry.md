# ADR-027: LLM 出力の JSON Schema 強制と再試行戦略

- ステータス: 採用
- 日付: 2026-05-08
- 関連: AI開発指示書 §7.3 / §7.4, 要件定義書 §8.4 / §8.6

## 文脈

要件定義書 §8.4 と AI 開発指示書 §7.3 では、LLM 出力を自由文ではなく JSON Schema で受け取ることが必須となっている。  
具体的には:

- `improve_script`: improved_script / changes / structure_diagnosis / priority_actions
- `diagnose_structure`: structure_diagnosis / missing_elements / priority_actions
- `generate_questions`: questions[] (question / category / severity)

ただしローカル LLM はモデルにより出力の整合性が安定しないため、

1. パース失敗
2. 必須フィールド欠落
3. スコア値の範囲違反

が発生し得る。

## 決定

**Pydantic で `Output` モデル群を一元定義し、全エンジン (`Mock`, `Ollama`, `LlamaCpp`) が同じ検証関数 `validate_output(task, parsed)` を必ず通る構造にする。**

- 検証は `app/engines/llm/schemas.py` に集約。
- 各エンジンは検証失敗時に **最大 2 回** までリトライする (= 合計 3 回試行)。
- リトライしても通らない場合は `LlmResult.validation_errors` に Pydantic のパス情報付きエラーを格納し、HTTP 経路では LLM ジョブを `failed` で完了させる（恒久エラーとして扱い、ユーザに復旧アクションを提示）。

### Mock も同じ検証を通す

`MockLlmEngine` の出力も同じ Pydantic モデルで `validate_output()` を通すことで、

- 本番エンジンが MockLlmEngine と Schema レベルで等価であることを保証する
- フロントエンドが Mock とローカル LLM で同一スキーマを期待できる

を実現する。

### LLM Schema を API として公開

フロント側で UI 検証や開発時のデバッグを容易にするため、`GET /api/llm/schema/{task}` を公開する。Strict Local Mode 配下で外部に出ない、純粋なローカル GET。

## プロンプト入力制限 (§7.4)

`prompts.py` で以下の上限を強制する:

- `MAX_USER_SCRIPT_CHARS = 4000`
- `MAX_TRANSCRIPT_CHARS = 4000`
- `MAX_NEIGHBOR_SUMMARY_CHARS = 600`

超過時は末尾に「文字数上限 N に達したため以降を省略」を付して切り詰める。  
過去イテレーション・全体構成は要約のみを許容する設計。

## 影響範囲

- `sidecar/app/engines/llm/schemas.py` 新規。
- `sidecar/app/engines/llm/prompts.py` 新規。
- `MockLlmEngine` を schema 検証経路に組み込み。
- `LocalOllamaEngine` / `LlamaCppEngine` を本実装し、リトライ + 検証を実装。
- `GET /api/llm/schema/{task}` エンドポイントを追加。
