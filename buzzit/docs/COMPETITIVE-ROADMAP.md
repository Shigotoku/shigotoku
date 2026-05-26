# BuzzIt 競合対抗ロードマップ（Phase 5〜）

## 0. ロードマップ概観

| Phase | テーマ | 主要競合 | 完了状況 |
|-------|--------|---------|---------|
| Phase 0 | 半自動投稿（notify） | — | ✅ |
| Phase 1 | Meta直結 + 5分 Worker | アピる, SocialDog | ✅ |
| Phase 2 | LINE ブロードキャスト | AI-LINE, Lステップ | ✅ |
| Phase 3 | 承認キュー + Auto Mode | — | ✅ |
| **Phase 4** | **ボイスドラフト + GBP連携** | **AI-BOUZ, Canly** | 🔵 着手 |
| **Phase 5** | **HPB連携 + LINEセグメント高度化** | **SALON assist, Lステップ, AI-LINE** | ⚪ 計画中 |
| **Phase 6** | **MEOダッシュボード + クチコミ管理** | **Canly, MEO Dashboard** | ⚪ 計画中 |
| **Phase 7** | **多店舗統合 / Enterprise** | **Canly, Buzz Commit** | ⚪ 構想 |
| **Phase 8** | **AIエージェント（Gemini Live）** | — | ⚪ 構想 |

---

## Phase 4 — ボイスドラフト + GBP連携（Q3 2026）

### 4.1 ボイスドラフト（音声→全媒体）

**競合:** AI-BOUZ（¥22,000一律）— カウンセリング音声から HPB / MEO / Instagram / チラシを生成

**BuzzIt 実装:**
- アプリ内 `MediaRecorder` で録音（最大3分）
- `POST /v1/voice-draft` → GCP Storage 経由で Gemini API（マルチモーダル）に音声送信
- 文字起こし + 投稿下書きを並列生成
- Magic Creator のアイデア欄に自動投入

**差別化:**
- Web App で完結（アプリインストール不要）
- Gemini で「投稿用」「キャプション用」「LINE台本」「Slack共有用」を**一度に4種類**生成
- AI-BOUZ より広い対象業種に展開可能

**配置:** Free プランから利用可能（戦略的に開放）

### 4.2 Google Business Profile（GBP）自動投稿

**競合:** Canly（要見積）, MEO Dashboard byGMO

**BuzzIt 実装:**
- 設定ページに「Google Business Profile 連携」追加
- OAuth で店舗オーナーアカウントを連携
- 投稿モード `gbp` を追加（既存の meta/line/auto と並列）
- `POST /v1/oauth/google/start` `callback` → Secret Manager にトークン保管

**差別化:**
- Instagram → GBP 自動同期（業界標準化）
- Canly が要見積制な中、Starter プラン（¥4,980）から GBP 連携を**標準提供**

**配置:** Starter プラン以上

---

## Phase 5 — HPB連携 + LINEセグメント高度化（Q4 2026）

### 5.1 ホットペッパービューティー トラッキング連携

**競合:** SALON assist（要見積）, AI-BOUZ

**BuzzIt 実装:**
- 設定で HPB 店舗URLを登録
- 計測リンク生成時に **HPB予約導線専用UTM**（`utm_medium=buzzit&utm_campaign={postId}`）を発行
- 投稿 → HPB 流入 → 予約完了ページのトラッキング（Browser SDK or サーバー側集約）
- ダッシュボードに「**HPB予約 寄与投稿ランキング**」を追加

**差別化:**
- 単なるブログ自動更新ではなく「どのSNS投稿がHPB予約に繋がったか」を可視化
- Growth OS で「経営判断データ」として提供

**配置:** Growth OS

### 5.2 LINE セグメント配信 + ステップ配信

**競合:** Lステップ, Liny, AI-LINE

**BuzzIt 実装:**
- 顧客タグ管理（来店頻度・最終来店日・年代・興味タグ）
- セグメント条件ビルダー（GUI）
- ステップ配信（友だち登録から N日後にメッセージ）
- 配信コスト推定ダッシュボード（2026秋料金改定対応）

**差別化:**
- LINE単体ツールではなく **SNS投稿のリーチデータと統合**
- Firestore で顧客 × 投稿 × 予約の3軸を結合
- セグメント配信前に「配信コスト ¥X,XXX → 推定CV Y件」を表示

**配置:** Pro（基本セグメント） / Growth OS（高度セグメント + ステップ配信）

---

## Phase 6 — MEOダッシュボード + クチコミ管理（Q1 2027）

**競合:** Canly, MEO Dashboard, MEO Analytics

**BuzzIt 実装:**
- GBP 投稿実績・閲覧数・経路（マップ/検索）の可視化
- クチコミ集約・AI返信ドラフト（Gemini）
- 写真投稿の自動同期
- 順位レポート（指定キーワードでの自店舗順位推移）

**差別化:**
- 単店舗は Growth OS 標準
- 多店舗は Enterprise（カンリー直接競合）

---

## Phase 7 — 多店舗統合 / Enterprise（Q2 2027）

**競合:** Canly（75,000店舗導入）, Buzz Commit（運用代行）

**BuzzIt 実装:**
- 親アカウント × 複数子店舗の階層管理
- 店舗横断ダッシュボード（KPI集計）
- 投稿テンプレートの一括配信（店舗ごとカスタマイズ可）
- 改ざん検知（GBP の悪意ある編集申請を24時間監視）
- SLA・専任CSM
- Single Sign-On（Google Workspace, Microsoft Entra ID）

**配置:** Enterprise（要見積）

---

## Phase 8 — AIエージェント / Gemini Live（Q3 2027〜）

- Gemini Live（音声対話）で「今日のSNS戦略相談」
- 投稿実績データを元にした自動改善提案
- 競合店アカウントの自動ベンチマーキング

---

## 横断改善

### A. PWA化（商標リスク回避策）

- アプリストア（iOS/Android）競合との名称重複を回避するため、**PWA + ホーム画面追加** を主推奨
- `manifest` 拡充、Service Worker、オフラインキャッシュ
- インストールプロンプトUIを App 内に常設

### B. SEO/コンテンツマーケ

- `shigotoku.com/buzzit/blog/` を Astro で開設
- 「LINE料金改定対策」「美容室SNS運用の教科書」など、競合より深いコンテンツ
- 競合比較ページ（vs アピる / vs AI-BOUZ / vs Lステップ）

### C. パートナーシップ

- ホットペッパービューティー店舗代理店との提携（紹介経済圏）
- Buzz Commit 等の運用代行会社向け Reseller プラン
- Google Workspace パートナー認定

---

## KPI 目標（12ヶ月先）

| 指標 | 6ヶ月 | 12ヶ月 |
|------|------|--------|
| 登録店舗数 | 500 | 3,000 |
| 有料転換率 | 8% | 15% |
| MRR | ¥800,000 | ¥6,000,000 |
| Growth OS 比率 | 5% | 15% |
| Enterprise契約 | 1社 | 10社 |
| 解約率（月） | < 5% | < 3% |

---

## 競合別ポジショニング表

| 競合 | BuzzIt の勝ち方 |
|------|----------------|
| **アピる** | Slack/承認/売上ファネルで差別化（同価格帯） |
| **AI-LINE** | Meta直結 + Slack + 多媒体（¥14,800 を Pro ¥9,800 で機能勝ち） |
| **SocialDog** | LINE / 店舗売上 / GBP を含めた「経営OS」レイヤー |
| **Lステップ / Liny** | SNS連携・AI生成・売上Funnelで「LINE+α」を提案 |
| **Social Insight** | 中堅以下に強い（初期費用ゼロ・¥4,980〜） |
| **AI-BOUZ** | Web完結 + 多媒体出力 + 多店舗対応 |
| **SALON assist** | HPB連携 + SNS統合（経営判断データ提供） |
| **Canly** | 単店舗〜10店舗で機能勝ち、多店舗は Enterprise で対抗 |
| **Buzz Commit** | 内製化支援 + 運用代行リセラー化 |
