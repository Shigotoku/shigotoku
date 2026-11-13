# ADR-023: MVP は Mock 優先のスタブ実装で骨格を完成させる

| 項目 | 内容 |
|---|---|
| 状態 | 採用 |
| 決定日 | 2026-05-08 |
| 起票者 | AI エージェント（ユーザー承認済） |
| 関連 | ADR-010, ADR-011, ADR-013, ADR-014、AI開発指示書 §10.1 / §10.2 |

## 背景

PreDeck の MVP は、Strict Local Mode を既定とし、外部送信を一切しない。
ローカル ASR（faster-whisper / whisper.cpp）とローカル LLM（Ollama / llama.cpp）の実モデルは、
ライセンス確認・モデル取得（実通信）が必要であり、本フェーズでは行えない。
一方で、5 ステップ UI と 2.5 ペイン ワークベンチの「録音 → 文字おこし → 改善 → 練習」フローを成立させるには、ASR / LLM の出力が必要である。

## 判断

- ASR / LLM は抽象クラス（`AsrEngine`, `LlmEngine`）として実装する。
- MVP の正式エンジンは `MockAsrEngine` と `MockLlmEngine` とし、決定的な擬似データを返す。
- `FasterWhisperEngine`, `WhisperCppEngine`, `LocalOllamaEngine`, `LlamaCppEngine`, `CloudLlmEngine` はクラスとして配置するが、`is_available()` で必ず「未導入 / 未設定」を返し、`run()` は復旧可能エラーを送出する。
- ユーザーがモデルをインポートし、設定で実エンジンを選択した場合のみ、`is_available()` が `True` を返す将来実装に切り替わる。

## 代替案

- 仕様3ファイルにある依存をすべてインストールし、faster-whisper / Ollama を直結する案。実通信を伴うため初回承認の対象であり、MVP 範囲外。

## 影響

- フロントエンドの体験は、Mock データで「動く」状態になる。
- API 仕様（仕様 §5）はそのまま実装し、実エンジン差し替え時に再変更不要。
- テストは Mock を使った決定的なものになる。

## 必須条件・後続タスク

- Phase 2 で実エンジン結線を行う前に、ライセンス（Q-L-001〜009）の人間承認を取得する。
- モデル管理画面で「インポート」「テスト」UI を提供する（MVPで雛形を実装）。

## 参照

- AI開発指示書 §6.1, §7.1, §10.2
- 設計判断記録 ADR-010, ADR-011, ADR-013, ADR-014
