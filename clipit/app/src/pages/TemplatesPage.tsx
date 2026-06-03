import PageHeader from "../components/PageHeader";
import StubPanel from "../components/StubPanel";

export default function TemplatesPage() {
  return (
    <>
      <PageHeader title="テンプレート" description="クリニック・中小企業向けの初期テンプレートから作成できます。" />
      <StubPanel>テンプレート一覧は Phase 2 で実装します。要件定義書 §7.2 を参照。</StubPanel>
    </>
  );
}
