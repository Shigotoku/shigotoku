import PageHeader from "../components/PageHeader";
import StubPanel from "../components/StubPanel";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="設定" description="組織・ロゴ・プラン・スタッフの設定。" />
      <StubPanel>組織設定・プラン管理は Phase 3 で実装します。要件定義書 §11 を参照。</StubPanel>
    </>
  );
}
