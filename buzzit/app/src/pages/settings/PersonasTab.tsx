import AiConnectSection from '../../components/AiConnectSection';
import PostingPlanSection from '../../components/PostingPlanSection';
import PersonaManagementSection from '../../components/PersonaManagementSection';
import AccountLedgerSection from '../../components/AccountLedgerSection';


export default function PersonasTab() {
  return (
    <>
        <section className="buzz-card-pad space-y-4">
          <PersonaManagementSection />
        </section>
        <section className="buzz-card-pad space-y-4">
          <AiConnectSection />
        </section>
        <section className="buzz-card-pad space-y-4">
          <PostingPlanSection />
        </section>
        <section className="buzz-card-pad space-y-4">
          <AccountLedgerSection />
        </section>
    </>
  );
}
