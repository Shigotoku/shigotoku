import StoreBillingSection from '../../components/StoreBillingSection';
import BusinessOverviewSection from '../../components/BusinessOverviewSection';
import { useSettings } from './SettingsContext';


export default function BusinessTab() {
  const { defaultDestinationUrl, setDefaultDestinationUrl, notifyEmail, setNotifyEmail, brandProfile, setBrandProfile, industry, setIndustry, entityType, setEntityType, officeNumber, setOfficeNumber, cardBrand, cardLast4 } = useSettings();
  return (
    <>
          <BusinessOverviewSection
            industry={industry}
            onIndustryChange={setIndustry}
            entityType={entityType}
            onEntityTypeChange={setEntityType}
            officeNumber={officeNumber}
            onOfficeNumberChange={setOfficeNumber}
            cardBrand={cardBrand}
            cardLast4={cardLast4}
          />
          <StoreBillingSection />
          <section className="buzz-card-pad space-y-4">
            <h3 className="text-lg font-bold">事業所の特徴</h3>
            <p className="text-sm text-neutral-600">
              ここに書いた強み・トーン・禁則は、ネタクリエイターの投稿文生成に反映されます。
            </p>
            <label className="buzz-label">お店の特徴・話し方</label>
            <textarea
              value={brandProfile}
              onChange={(e) => setBrandProfile(e.target.value)}
              placeholder="例: 初めての方に丁寧。専門用語は避ける。地域は渋谷。押し売りしない。"
              className="buzz-input h-28 resize-none"
            />
            <label className="buzz-label">予約・来店URL</label>
            <input
              value={defaultDestinationUrl}
              onChange={(e) => setDefaultDestinationUrl(e.target.value)}
              placeholder="https://example.com/reserve"
              className="buzz-input"
            />
            <label className="buzz-label">店長通知メール（任意）</label>
            <input
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              placeholder="owner@example.com"
              className="buzz-input"
            />
          </section>
    </>
  );
}
