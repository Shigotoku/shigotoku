const AYRSHARE_BASE = 'https://app.ayrshare.com/api';

const PLATFORM_MAP: Record<string, string> = {
  reels: 'instagram',
  carousel: 'instagram',
  x_thread: 'twitter',
  line: 'linkedin',
};

export interface ScheduleContent {
  platform: string;
  label: string;
  content: string;
}

export async function scheduleWithAyrshare(
  contents: ScheduleContent[],
  scheduledAt: string,
  profileKey?: string,
): Promise<{ success: boolean; message: string; postIds?: string[] }> {
  const apiKey = process.env.AYRSHARE_API_KEY;
  const when = new Date(scheduledAt);

  if (!apiKey) {
    return {
      success: true,
      message: `${contents.length}件を ${when.toLocaleString('ja-JP')} に予約登録しました（Ayrshareキー未設定のためFirestore保存のみ）`,
    };
  }

  const postIds: string[] = [];

  for (const item of contents) {
    const platform = PLATFORM_MAP[item.platform] ?? 'twitter';
    const body: Record<string, unknown> = {
      post: item.content.slice(0, 3000),
      platforms: [platform],
      scheduleDate: when.toISOString(),
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };
    if (profileKey) headers['Profile-Key'] = profileKey;

    const res = await fetch(`${AYRSHARE_BASE}/post`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Ayrshare error:', errText);
      throw new Error(`Ayrshare投稿失敗: ${platform}`);
    }

    const data = (await res.json()) as { id?: string; postIds?: string[] };
    if (data.id) postIds.push(data.id);
    if (data.postIds) postIds.push(...data.postIds);
  }

  return {
    success: true,
    message: `${contents.length}件の投稿を ${when.toLocaleString('ja-JP')} にAyrshare経由で予約しました`,
    postIds,
  };
}

export async function getAyrshareProfiles(): Promise<Array<{ name: string; connected: boolean }>> {
  const apiKey = process.env.AYRSHARE_API_KEY;
  if (!apiKey) {
    return [
      { name: 'Instagram', connected: false },
      { name: 'X (Twitter)', connected: false },
      { name: 'TikTok', connected: false },
      { name: 'LINE Official', connected: false },
    ];
  }

  try {
    const res = await fetch(`${AYRSHARE_BASE}/profiles`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error('profiles fetch failed');
    const data = (await res.json()) as {
      profiles?: Array<{ platform: string; active?: boolean }>;
    };
    const active = new Set(
      (data.profiles ?? []).filter((p) => p.active).map((p) => p.platform.toLowerCase()),
    );
    return [
      { name: 'Instagram', connected: active.has('instagram') },
      { name: 'X (Twitter)', connected: active.has('twitter') || active.has('x') },
      { name: 'TikTok', connected: active.has('tiktok') },
      { name: 'LINE Official', connected: active.has('line') },
    ];
  } catch {
    return [
      { name: 'Instagram', connected: false },
      { name: 'X (Twitter)', connected: false },
      { name: 'TikTok', connected: false },
      { name: 'LINE Official', connected: false },
    ];
  }
}
