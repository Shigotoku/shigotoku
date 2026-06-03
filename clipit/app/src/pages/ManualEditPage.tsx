import PageHeader from "../components/PageHeader";
import StubPanel from "../components/StubPanel";

export default function ManualEditPage() {
  return (
    <>
      <PageHeader title="マニュアル編集" description="左：ステップ一覧 / 中央：スクショ / 右：説明・注意・NG例・マスク" />
      <StubPanel>編集画面（3カラム）は Phase 1 で実装します。要件定義書 §7.4 を参照。</StubPanel>
    </>
  );
}
