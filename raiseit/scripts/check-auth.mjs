// 接続確認: サービスアカウントで Search Console / GA4 に入れるかを確かめる。
// 使い方: npm run check:auth
import { loadEnv, requireEnv, authClient } from './lib.mjs';

loadEnv();

async function checkGsc() {
  const site = requireEnv('GSC_SITE_URL');
  const client = await authClient(['https://www.googleapis.com/auth/webmasters.readonly']).getClient();
  const res = await client.request({ url: 'https://www.googleapis.com/webmasters/v3/sites' });
  const sites = (res.data.siteEntry ?? []).map((s) => `${s.siteUrl} (${s.permissionLevel})`);
  console.log('[Search Console] 閲覧できるサイト:', sites.length ? sites.join(', ') : '（なし）');
  console.log(
    sites.some((s) => s.startsWith(site))
      ? `  OK: ${site} にアクセスできます`
      : `  NG: ${site} が見えません。Search Console の「ユーザーと権限」にサービスアカウントを追加してください`,
  );
}

async function checkGa4() {
  const id = process.env.GA4_PROPERTY_ID;
  if (!id) {
    console.log('[GA4] GA4_PROPERTY_ID が未設定のためスキップ');
    return;
  }
  const client = await authClient(['https://www.googleapis.com/auth/analytics.readonly']).getClient();
  const res = await client.request({
    url: `https://analyticsdata.googleapis.com/v1beta/properties/${id}:runReport`,
    method: 'POST',
    data: {
      dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }],
      metrics: [{ name: 'screenPageViews' }],
    },
  });
  console.log(`[GA4] OK: 直近7日の閲覧数 = ${res.data.rows?.[0]?.metricValues?.[0]?.value ?? 0}`);
}

for (const [name, fn] of [['Search Console', checkGsc], ['GA4', checkGa4]]) {
  try {
    await fn();
  } catch (e) {
    console.error(`[${name}] エラー:`, e?.response?.data?.error?.message ?? e.message);
    process.exitCode = 1;
  }
}
