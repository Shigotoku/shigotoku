# ADR-0003: 動画版 DeckIt の製品名を WrapIt(ラップイット)とする

- 状態: 採用(商標確認は未了。公開前の必須ゲート)
- 日付: 2026-11-27

## 背景
DeckIt の動画版(会社のブランド・決まりを守ってショート動画を量産するアプリ)の名前が必要。外部提案の仮称 Reelit は、Web 検索で次の既存サービスが確認できた(商標調査ではない)。

- reelit.ai(Reels and video ads for any business — ほぼ同一の立ち位置)、reelit.pro、同名の動画アプリ2件
- Filmit / Vidit / Frameit / MotionIt / ShotIt / PlayIt / CutIt も動画分野で使用中

## 決定
**WrapIt(ラップイット)** を採用する。

- 由来: 映画の "It's a wrap!"(撮影完了=できた)+ 日本で通じる「ラッピング」(ブランドの意匠で包む)。
- キャッチ案: 「動画、仕上がった。」 / Your Brand. Your Rules. Wrapped.
- 技術 ID: フォルダ `wrapit/`、Firebase `shigotoku-wrapit-prod`、アプリ `app.wrapit.shigotoku.com`、LP `shigotoku.com/wrapit/`(いずれも未作成)。

## 代替案
- CrankIt(撮影用語「クランクイン」+「量産」。英語の "crank" の悪い連想あり)
- RollIt(音声 SNS アプリと同名あり。意味はやや弱い)
- 「DeckIt Video」とするサブブランド案(製品として独立しにくく、M&A でも切り離しにくい)
- TakeIt / StoryIt / SlateIt / Loopit / TrailIt 等は同名の既存サービスがあり見送り

## 未解決(公開前に必須)
1. J-PlatPat で第9・35・41・42類を、称呼「ラップイット」を含めて検索
2. WIPO Global Brand Database(海外展開・M&A を見据える場合)
3. 弁理士への相談
4. 「ラップ」(食品用ラップ・音楽)との混同の検討
5. 商標出願の要否と時期

商標で問題が出た場合は、CrankIt を第一の代替とする。名称はフォルダ・Firebase プロジェクト ID・`deploy/build.config.mjs` の定数に集約し、変更の影響を小さくする。

## 注意
Web 検索の結果は参考情報であり、商標の使用可否を保証しない。
