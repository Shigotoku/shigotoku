import PageHeader from "../components/PageHeader";
import StubPanel from "../components/StubPanel";

export default function ManualSharePage() {
  return (
    <>
      <PageHeader title="共有する" description="PDF / QR / URL / 確認依頼。公開前に個人情報の隠し忘れ確認を通します。" />
      <StubPanel>共有・PDF/QR発行・公開前フェイルセーフ確認は Phase 1 で実装します。要件定義書 §7.1 / §8.3 を参照。</StubPanel>
    </>
  );
}
