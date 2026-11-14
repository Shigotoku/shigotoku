import AiConnectSection from '../../components/AiConnectSection';
import PostingPlanSection from '../../components/PostingPlanSection';
import PersonaManagementSection from '../../components/PersonaManagementSection';
import AccountLedgerSection from '../../components/AccountLedgerSection';

export default function PersonasTab() {
  return (
    <div className="grid items-start gap-3 lg:grid-cols-2 2xl:grid-cols-4">
      <section className="buzz-card-pad space-y-3">
        <PersonaManagementSection />
      </section>
      <section className="buzz-card-pad space-y-3">
        <AiConnectSection />
      </section>
      <section className="buzz-card-pad space-y-3">
        <PostingPlanSection />
      </section>
      <section className="buzz-card-pad space-y-3">
        <AccountLedgerSection />
      </section>
    </div>
  );
}
