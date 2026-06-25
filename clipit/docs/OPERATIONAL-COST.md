# クリッピット 運用コスト試算と削減施策

**版:** 1.0（2026-06-08）

スクリーンショットで見ていた「運用コスト試算」ダッシュボードの根拠ドキュメントです。  
（Cursor Canvas 版は `UNIT-ECONOMICS-AND-SECURITY.md` §8 に `canvases/clipit-unit-economics.canvas.tsx` と記載がありますが、リポジトリには未コミットの場合があります。本文書が施策の正本です。）

## 結論（閲覧は安い）

- **共有 URL の閲覧**は Firestore スナップショット 1 回読み取りが中心で、AI・Functions は走りません。
- 主なコストは **画像転送（Storage egress）** です。
- 作成時だけ AI（Gemini）が使われます。説明文は **ルールベースが既定**、AI は明示操作時のみ。

## 4 つの削減施策と実装状況

| # | 施策 | 効果（試算） | 状態 | 実装ファイル |
|---|------|-------------|------|-------------|
| 1 | 画像 WebP 化・最大辺 1280px | 転送・保管 ▲40% 目安 | ✅ | `clipit/app/src/lib/optimizeScreenshot.ts`, `uploadStepScreenshot.ts`, `clipit/api/src/lib/optimizeScreenshot.ts`, `storageImage.ts` |
| 2 | Cache-Control 長期化（1年・immutable） | 再閲覧の転送 ▲60% 目安 | ✅ | `clipit/app/src/lib/storageMeta.ts`, `clipit/api/src/lib/storageImage.ts` |
| 3 | 画面外画像の lazy load | 途中離脱時の転送 ▲20% 目安 | ✅ | `ScreenshotFrame.tsx`, `StepScreenshotPreview.tsx`, `StepDocumentImage.tsx` |
| 4 | 説明文のルールベース既定（AI は任意） | AI 呼び出し ▲80% 目安 | ✅ | `instructionRules.ts`, `gemini.ts`, 拡張 ingest（`polishWithAi` オフ既定）, 話して作成・まとめて修正の AI チェックオフ既定 |

### CDN（任意・未導入）

Firebase download URL をそのまま利用。月間転送 **100GB 超** の見込みで Cloud CDN を検討。手順は `CDN-SETUP.md`。

## 試算パラメータ（ダッシュボード想定）

| 項目 | 値 |
|------|-----|
| マニュアル数 | 50 |
| 1 本あたり画像 | 8 枚 × 500KB → **施策後は WebP 150KB 級を想定** |
| 月間閲覧 PV | 3,000 |
| 新規作成 | 100 本/月 |

施策前後の試算は `UNIT-ECONOMICS-AND-SECURITY.md` §3〜§6 を参照。

## 関連ドキュメント

- ユニットエコノミクス全体: `clipit/docs/UNIT-ECONOMICS-AND-SECURITY.md`
- CDN 手順: `clipit/docs/CDN-SETUP.md`
- 課金・プラン上限: `clipit/docs/BILLING-RULES.md`
