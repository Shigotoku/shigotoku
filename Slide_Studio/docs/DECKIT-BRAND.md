# DeckIt ブランド

| 項目 | 内容 |
|------|------|
| 正式名 | **DeckIt** |
| 読み | デキット |
| タグライン | **資料、できた。** |
| 英語サブ | Your Slides. Your Drive. Your Style. |

## 製品ライン（将来）

| 製品 | 役割 |
|------|------|
| **DeckIt** | 元資料・Style・お手本から Google Slides を「作る」（本リポジトリ） |
| **PreDeck**（別製品・構想） | プレゼン中に AI が直す／話しながらスライドが育つ |

コードフォルダ `Slide_Studio` は GAS 引継ぎ時の名称。ユーザー向け表記は **DeckIt** に統一する。

## 技術 ID

- Firebase プロジェクト（目標）: `shigotoku-deckit-prod`
- Firestore: `deckit_users`, `deckit_projects`, …
- 環境変数: `NEXT_PUBLIC_DECKIT_DATA_MODE=mock|firebase`
