import { useEffect, useState } from 'react';
import { Building2, AlertTriangle, Send } from 'lucide-react';
import { fetchEnterpriseKpis, bulkDistributeTemplate } from '../lib/api';
import PlanLockNotice from '../components/PlanLockNotice';
import { useApp } from '../store/appContext';

export default function EnterpriseDashboardPage() {
  const { plan } = useApp();
  const [kpis, setKpis] = useState<
    Array<{
      storeId: string;
      storeName: string;
      healthScore: number;
      lineFriends: number;
      reach: number;
      revenue: number;
      metaConnected: boolean;
      lineConnected: boolean;
      gbpConnected: boolean;
    }>
  >([]);
  const [alerts, setAlerts] = useState<Array<{ id: string; field: string; detail: string; status: string }>>([]);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!['growth', 'enterprise'].includes(plan)) return;
    fetchEnterpriseKpis()
      .then((r) => {
        setKpis(r.kpis);
        setAlerts(r.tamperAlerts);
      })
      .catch(() => {});
  }, [plan]);

  const handleBulk = async () => {
    if (!templateTitle.trim() || !templateBody.trim()) return;
    try {
      const r = await bulkDistributeTemplate({
        storeIds: kpis.map((k) => k.storeId),
        templateTitle: templateTitle.trim(),
        templateBody: templateBody.trim(),
      });
      setMessage(`${r.jobIds.length} ?????????????????`);
    } catch {
      setMessage('??????????????');
    }
  };

  if (!['growth', 'enterprise'].includes(plan)) {
    return (
      <div className="buzz-page">
        <PlanLockNotice feature="hpb" currentPlan={plan} />
      </div>
    );
  }

  const totalRevenue = kpis.reduce((a, k) => a + k.revenue, 0);
  const totalReach = kpis.reduce((a, k) => a + k.reach, 0);

  return (
    <div className="buzz-page space-y-6">
      <div className="flex items-center gap-2">
        <div className="buzz-icon-box">
          <Building2 className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-bold">Enterprise ?????????</h1>
      </div>

      {message && <p className="buzz-alert buzz-alert-info text-sm">{message}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="buzz-card-pad">
          <p className="text-xs text-neutral-500">???</p>
          <p className="buzz-stat-value text-2xl">{kpis.length}</p>
        </div>
        <div className="buzz-card-pad">
          <p className="text-xs text-neutral-500">?????</p>
          <p className="buzz-stat-value text-2xl">{totalReach.toLocaleString()}</p>
        </div>
        <div className="buzz-card-pad">
          <p className="text-xs text-neutral-500">??????</p>
          <p className="buzz-stat-value text-2xl">?{totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="buzz-banner buzz-banner-warning">
          <h2 className="mb-2 flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            ?????????
          </h2>
          <ul className="space-y-1 text-sm">
            {alerts.map((a) => (
              <li key={a.id}>{a.detail}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="buzz-table-wrap overflow-x-auto">
        <div className="p-4">
          <h2 className="mb-4 font-semibold">??? KPI</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-neutral-500">
              <th className="px-4 py-2">??</th>
              <th className="px-4 py-2">??</th>
              <th className="px-4 py-2">LINE</th>
              <th className="px-4 py-2">???</th>
              <th className="px-4 py-2">??</th>
              <th className="px-4 py-2">??</th>
            </tr>
          </thead>
          <tbody>
            {kpis.map((k) => (
              <tr key={k.storeId} className="border-b border-neutral-100">
                <td className="px-4 py-2 font-medium">{k.storeName}</td>
                <td className="px-4 py-2">{k.healthScore}</td>
                <td className="px-4 py-2">{k.lineFriends}</td>
                <td className="px-4 py-2">{k.reach.toLocaleString()}</td>
                <td className="px-4 py-2">?{k.revenue.toLocaleString()}</td>
                <td className="px-4 py-2 text-xs text-neutral-500">
                  {k.metaConnected ? 'Meta ' : ''}{k.lineConnected ? 'LINE ' : ''}{k.gbpConnected ? 'GBP' : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {plan === 'enterprise' && (
        <div className="buzz-card-pad space-y-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <Send className="h-4 w-4" />
            ????????
          </h2>
          <input value={templateTitle} onChange={(e) => setTemplateTitle(e.target.value)} placeholder="????" className="buzz-input" />
          <textarea value={templateBody} onChange={(e) => setTemplateBody(e.target.value)} placeholder="??" className="buzz-input h-24 resize-none" />
          <button type="button" onClick={handleBulk} className="buzz-btn-primary">???????????</button>
        </div>
      )}
    </div>
  );
}
