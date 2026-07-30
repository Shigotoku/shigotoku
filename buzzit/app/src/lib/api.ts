export const API_BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

let authTokenGetter: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(fn: () => Promise<string | null>) {
  authTokenGetter = fn;
}

async function authHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...extra };
  if (authTokenGetter) {
    const token = await authTokenGetter();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await authHeaders({
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  });

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = await authHeaders(init?.headers as Record<string, string>);
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

export function bootstrapAuth(email?: string, displayName?: string) {
  return request<{ uid: string; plan: string }>('/v1/auth/bootstrap', {
    method: 'POST',
    body: JSON.stringify({ email, displayName }),
  });
}

export interface DashboardResponse {
  metrics: {
    healthScore: number;
    healthTrend: number;
    reachRating: string;
    clickRating: string;
    funnel: { posts: number; reach: number; clicks: number; lineSignups: number; revenue: number };
    mission: { title: string; description: string };
  };
  plan: string;
}

export function fetchDashboard() {
  return request<DashboardResponse>('/v1/dashboard');
}

export interface AnalyticsResponse {
  metrics: {
    reach: number;
    saveRate: number;
    shareRate: number;
    clickRate: number;
    lineFriends: number;
    estimatedRevenue: number;
  };
  topPosts: Array<{ id: string; title: string; reach: number; revenue: number; clicks?: number; lineSignups?: number; trackingUrl?: string }>;
}

export function fetchAnalytics() {
  return request<AnalyticsResponse>('/v1/analytics');
}

export interface SettingsResponse {
  uid: string;
  plan: string;
  slackWebhookUrl?: string;
  ayrshareProfileKey?: string;
  autoModeEnabled?: boolean;
  slackTeamId?: string;
  lineChannelSecret?: string;
  lineChannelAccessToken?: string;
  lineAdminUserId?: string;
  lineDestinationId?: string;
  defaultDestinationUrl?: string;
  defaultPublishMode?: PublishMode;
  metaConnected?: boolean;
  metaIgUserId?: string;
  metaPageId?: string;
  metaTokenExpiresAt?: string;
  lineWebhookUrl?: string;
  hpbStoreUrl?: string;
  gbpConnected?: boolean;
  gbpLocationName?: string;
  notifyEmail?: string;
  industry?: string;
  extraSnsAccounts?: number;
  xConnected?: boolean;
  xUsername?: string;
  xApiPostsThisMonth?: number;
  xApiMonthlyLimit?: number;
  snsConnections: Array<{ name: string; connected: boolean }>;
  canUseSlack: boolean;
  canUseAutoMode: boolean;
}

export function fetchSettings() {
  return request<SettingsResponse>('/v1/settings');
}

export function fetchSnsConnections() {
  return request<{ snsConnections: Array<{ name: string; connected: boolean }> }>('/v1/sns-connections');
}

export function updateSettings(
  patch: Partial<SettingsResponse> & {
    xApiKey?: string;
    xApiSecret?: string;
    xAccessToken?: string;
    xAccessSecret?: string;
    xDisconnect?: boolean;
  },
) {
  return request<SettingsResponse>('/v1/settings', {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

export function testXApiConnection(body?: {
  xApiKey?: string;
  xApiSecret?: string;
  xAccessToken?: string;
  xAccessSecret?: string;
}) {
  return request<{ ok: boolean; message: string; username?: string }>('/v1/x/selftest', {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
}

export interface RepurposeApiRequest {
  idea: string;
  plan: string;
  mediaUrls?: string[];
}

export interface RepurposeApiResponse {
  results: Array<{
    platform: string;
    label: string;
    content: string;
    carouselSlides?: string[];
  }>;
  usedGemini?: boolean;
  safetyViolations?: string[];
}

export function repurposeViaApi(body: RepurposeApiRequest) {
  return request<RepurposeApiResponse>('/v1/repurpose', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export type PublishMode =
  | 'notify'
  | 'approval'
  | 'meta'
  | 'line'
  | 'gbp'
  | 'ayrshare'
  | 'x_free'
  | 'auto';

export interface VoiceDraftResponse {
  transcript: string;
  drafts: Array<{
    kind: string;
    platform?: string;
    label: string;
    content: string;
    carouselSlides?: string[];
  }>;
  usedGemini: boolean;
}

export function voiceDraft(body: { audioBase64: string; mimeType: string; hint?: string }) {
  return request<VoiceDraftResponse>('/v1/voice-draft', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export interface LineAccountCost {
  plan: 'light' | 'standard';
  planLabel: string;
  baseFee: number;
  messageCount: number;
  overageMessages: number;
  messageFee: number;
  lineTotal: number;
}

export interface StackCost {
  toolPlan: string;
  toolFee: number;
  line: LineAccountCost;
  total: number;
}

export interface LineCostEstimate {
  pricePerMessage: number;
  friendCount: number;
  monthlyMessages: number;
  estimatedRecipients: number;
  estimatedCost: number;
  estimatedSegmentReach: number;
  estimatedSegmentCost: number;
  savedPercent: number;
  lineAccount: LineAccountCost;
  comparison: {
    lstepStandard: StackCost;
    lineCrmPro: StackCost;
    buzzitPro: StackCost;
    buzzitGrowth: StackCost;
    savingsLineCrmVsLstepStandard: number;
    savingsGrowthVsLstepPro: number;
  };
  segmentComparison: {
    segmentMessages: number;
    lstepStandardTotal: number;
    lineCrmProTotal: number;
  };
  presetComparisons: Array<{
    monthlyMessages: number;
    lineTotal: number;
    lstepCrmFee: number;
    lineCrmFee: number;
    lstepTotal: number;
    lineCrmProTotal: number;
    savings: number;
  }>;
}

export function fetchLineCostEstimate(monthlyMessages?: number) {
  const qs =
    monthlyMessages != null && monthlyMessages > 0
      ? `?monthlyMessages=${encodeURIComponent(String(monthlyMessages))}`
      : '';
  return request<LineCostEstimate>(`/v1/line/cost-estimate${qs}`);
}

export interface CustomerTag {
  id: string;
  name: string;
  color: string;
  friendCount: number;
}

export function fetchCustomerTags() {
  return request<{ tags: CustomerTag[] }>('/v1/line/tags');
}

export interface HpbConversion {
  postId: string;
  title: string;
  reservations: number;
  estimatedRevenue: number;
}

export function fetchHpbConversions() {
  return request<{ conversions: HpbConversion[] }>('/v1/hpb/conversions');
}

export function startGbpOAuth() {
  return request<{ url: string }>('/v1/oauth/google/start');
}

// --- LINE CRM (Lstep Replacement) ---
export interface LineSource {
  id: string;
  label: string;
  addFriendUrl: string;
  followsCount: number;
  blocksCount: number;
}

export interface LineSegment {
  id: string;
  name: string;
  estimatedReach: number;
  conditions: unknown[];
}

export interface LineStep {
  id: string;
  name: string;
  status: 'active' | 'paused';
  segmentId?: string;
  messages: unknown[];
}

export interface LineRichMenuRecord {
  id: string;
  name: string;
  lineRichMenuId?: string;
}

export interface LineInsights {
  followers: { count?: number; targetedReaches?: number } | null;
  demographic: unknown | null;
}

export function fetchLineSources() {
  return request<{ sources: LineSource[] }>('/v1/line/sources');
}

export function createLineSource(body: { label: string; addFriendUrl: string }) {
  return request<{ id: string; shortUrl: string }>('/v1/line/sources', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchLineSegments() {
  return request<{ segments: LineSegment[] }>('/v1/line/segments');
}

export function createLineSegment(body: { name: string; conditions: unknown[] }) {
  return request<{ id: string }>('/v1/line/segments', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchLineSteps() {
  return request<{ steps: LineStep[] }>('/v1/line/steps');
}

export function createLineStep(body: { name: string; segmentId?: string; messages: unknown[]; triggers: unknown[] }) {
  return request<{ id: string }>('/v1/line/steps', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchLineRichMenus() {
  return request<{ menus: LineRichMenuRecord[] }>('/v1/line/richmenu');
}

export function fetchLineInsights() {
  return request<LineInsights>('/v1/line/insights');
}

export function createLineTag(body: { name: string; color?: string; ruleType?: 'manual' | 'auto' }) {
  return request<{ id: string }>('/v1/line/tags', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function deleteLineTag(id: string) {
  return request<{ success: boolean }>(`/v1/line/tags/${id}`, { method: 'DELETE' });
}

export function sendLineNarrowcast(body: { segmentId?: string; text: string; userIds: string[] }) {
  return request<{ success: boolean; message: string; requestId?: string }>('/v1/line/narrowcast', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export interface ScheduleApiRequest {
  contents: Array<{ platform: string; label: string; content: string; carouselSlides?: string[] }>;
  scheduledAt: string;
  destinationUrl?: string;
  publishMode?: PublishMode;
  mediaUrls?: string[];
}

export interface ScheduledJob {
  id: string;
  contents: ScheduleApiRequest['contents'];
  scheduledAt: string;
  publishMode: PublishMode;
  status: 'pending_approval' | 'pending' | 'processing' | 'published' | 'notified' | 'failed' | 'draft';
  completedMessage?: string;
  errorMessage?: string;
  createdAt: string;
}

export function scheduleViaApi(body: ScheduleApiRequest) {
  return request<{
    success: boolean;
    jobId: string;
    message: string;
    publishMode: PublishMode;
    trackingLinks?: Array<{ platform: string; trackingUrl: string; postId: string }>;
  }>('/v1/schedule', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchScheduledJobs(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return request<{ jobs: ScheduledJob[] }>(`/v1/scheduled${q}`);
}

export function approveScheduledJob(id: string) {
  return request<{ success: boolean; job: ScheduledJob }>(`/v1/scheduled/${id}/approve`, {
    method: 'POST',
  });
}

export function retryScheduledJob(id: string) {
  return request<{ success: boolean; job: ScheduledJob }>(`/v1/scheduled/${id}/retry`, {
    method: 'POST',
  });
}

export function revertScheduledJobToDraft(id: string) {
  return request<{ success: boolean; job: ScheduledJob }>(`/v1/scheduled/${id}/draft`, {
    method: 'POST',
  });
}

export function updateScheduledJob(
  id: string,
  body: {
    scheduledAt?: string;
    contents?: ScheduleApiRequest['contents'];
    publishMode?: PublishMode;
  },
) {
  return request<{ success: boolean; job: ScheduledJob }>(`/v1/scheduled/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export interface WeeklyReport {
  periodLabel: string;
  healthScore: number;
  funnel: {
    posts: number;
    reach: number;
    clicks: number;
    lineSignups: number;
    revenue: number;
  };
  scheduled: {
    published: number;
    notified: number;
    failed: number;
    pendingApproval: number;
  };
  topPosts: Array<{ title: string; reach: number; revenue: number }>;
  topTrend: { topic: string; hook: string; score: number } | null;
  recommendations: string[];
  nextWeekActions?: string[];
}

export function fetchWeeklyReport() {
  return request<{ report: WeeklyReport }>('/v1/reports/weekly');
}

export function startMetaOAuth() {
  return request<{ url: string }>('/v1/oauth/meta/start');
}

export function createTrackingLink(body: { destinationUrl?: string; title?: string; platform?: string; postId?: string }) {
  return request<{ token: string; trackingUrl: string; postId?: string; utmCampaign: string }>('/v1/tracking/link', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function submitSlackIdea(text: string, author?: string) {
  return request<{ id: string; scriptPreview: string }>('/v1/slack/ideas', {
    method: 'POST',
    body: JSON.stringify({ text, author }),
  });
}

export function fetchSlackIdeas() {
  return request<{ ideas: Array<{ id: string; text: string; author: string; scriptPreview: string; status: string }> }>(
    '/v1/slack/ideas',
  );
}

export function approveSlackIdea(id: string) {
  return request<{
    success: boolean;
    idea: { id: string; text: string; author: string; scriptPreview: string; status: string };
    magicCreatorPath: string;
  }>(`/v1/slack/ideas/${id}/approve`, { method: 'POST' });
}

export interface LineFriend {
  lineUserId: string;
  displayName: string;
  pictureUrl?: string;
  status: string;
  tags: string[];
  sourceId?: string | null;
  score: number;
  followedAt: string;
  lastSeenAt: string;
}

export function fetchLineFriends(params?: { tag?: string; q?: string }) {
  const qs = new URLSearchParams();
  if (params?.tag) qs.set('tag', params.tag);
  if (params?.q) qs.set('q', params.q);
  const q = qs.toString() ? `?${qs}` : '';
  return request<{ friends: LineFriend[] }>(`/v1/line/friends${q}`);
}

export function updateLineFriendTags(lineUserId: string, tags: string[]) {
  return request<{ friend: LineFriend }>(`/v1/line/friends/${encodeURIComponent(lineUserId)}/tags`, {
    method: 'PATCH',
    body: JSON.stringify({ tags }),
  });
}

export function sendLineSegmentMessage(body: { segmentId: string; text: string }) {
  return request<{
    success: boolean;
    message: string;
    recipients: number;
    mode?: string;
  }>('/v1/line/narrowcast', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function estimateLineSegment(segmentId: string) {
  return request<{ estimatedReach: number }>(`/v1/line/segments/${segmentId}/estimate`, {
    method: 'POST',
  });
}

export function runAutoMode() {
  return request<{ mission: { title: string; description: string } }>('/v1/auto-mode/run', {
    method: 'POST',
  });
}

export interface TrendTopic {
  id: string;
  topic: string;
  hook: string;
  platform: string;
  score: number;
  status: string;
  source: string;
}

export function fetchTrends() {
  return request<{ trends: TrendTopic[] }>('/v1/trends');
}

export function refreshTrends() {
  return request<{ trends: TrendTopic[] }>('/v1/trends/refresh', { method: 'POST' });
}

export function useTrend(id: string) {
  return request<{ idea: string; platform: string; trend: TrendTopic }>(`/v1/trends/${id}/use`, {
    method: 'POST',
  });
}

export interface AbVariant {
  label: string;
  content: string;
  trackingUrl?: string;
  clicks: number;
  impressions: number;
}

export interface AbTestRecord {
  id: string;
  idea: string;
  platform: string;
  status: 'running' | 'completed';
  variantA: AbVariant;
  variantB: AbVariant;
  winner?: 'A' | 'B';
  winnerReason?: string;
  createdAt: string;
  completedAt?: string;
}

export function fetchAbTests() {
  return request<{ tests: AbTestRecord[] }>('/v1/ab-tests');
}

export function createAbTest(idea: string, platform: string) {
  return request<AbTestRecord>('/v1/ab-tests', {
    method: 'POST',
    body: JSON.stringify({ idea, platform }),
  });
}

export function evaluateAbTest(id: string) {
  return request<AbTestRecord>(`/v1/ab-tests/${id}/evaluate`, { method: 'POST' });
}

export function evaluateAllAbTests() {
  return request<{ evaluated: number; tests: AbTestRecord[] }>('/v1/ab-tests/evaluate-all', {
    method: 'POST',
  });
}

export function trackMetricEvent(event: 'reach' | 'click' | 'line_signup' | 'revenue', value: number) {
  return request<{ success: boolean }>('/v1/metrics/event', {
    method: 'POST',
    body: JSON.stringify({ event, value }),
  });
}

// --- Stores & billing ---
export interface StoreRecord {
  id: string;
  name: string;
  ownerId: string;
  industry?: string;
  createdAt: string;
}

export interface BillingResponse {
  plan: string;
  storeCount: number;
  memberCount: number;
  pendingInviteCount: number;
  extraSnsAccounts: number;
  extraSnsAccountPrice: number;
  monthlyTotal: number;
  baseMonthly: number;
  additionalStoreDiscount: number;
  maxStores: number;
  maxStaff: number;
  staffLimitLabel: string;
  storeLimitLabel: string;
  stores: Array<{ id: string; name: string }>;
  activeStoreId: string | null;
}

export interface StoreMember {
  userId: string;
  role: 'owner' | 'manager' | 'staff';
  email?: string;
  displayName?: string;
  createdAt: string;
}

export interface StoreInvitation {
  id: string;
  storeId: string;
  email: string;
  role: 'manager' | 'staff';
  token: string;
  invitedBy: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export function fetchStores() {
  return request<{ stores: StoreRecord[]; activeStoreId: string | null; role?: string | null }>('/v1/stores');
}

export function createStore(name: string, industry?: string) {
  return request<StoreRecord>('/v1/stores', {
    method: 'POST',
    body: JSON.stringify({ name, industry }),
  });
}

export function setActiveStore(storeId: string) {
  return request<{ success: boolean; activeStoreId: string }>('/v1/stores/active', {
    method: 'PUT',
    body: JSON.stringify({ storeId }),
  });
}

export function fetchBilling() {
  return request<BillingResponse>('/v1/billing');
}

export function fetchStoreMembers(storeId: string) {
  return request<{ members: StoreMember[]; invitations: StoreInvitation[] }>(
    `/v1/stores/${encodeURIComponent(storeId)}/members`,
  );
}

export function inviteStoreMember(storeId: string, email: string, role: 'manager' | 'staff' = 'staff') {
  return request<{ token: string; inviteUrl: string }>(`/v1/stores/${encodeURIComponent(storeId)}/invitations`, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}

export function revokeStoreInvitation(storeId: string, invitationId: string, token: string) {
  return request<{ success: boolean }>(
    `/v1/stores/${encodeURIComponent(storeId)}/invitations/${encodeURIComponent(invitationId)}`,
    { method: 'DELETE', body: JSON.stringify({ token }) },
  );
}

export function removeStoreMember(storeId: string, userId: string) {
  return request<{ success: boolean }>(
    `/v1/stores/${encodeURIComponent(storeId)}/members/${encodeURIComponent(userId)}`,
    { method: 'DELETE' },
  );
}

export function updateStoreMemberRole(storeId: string, userId: string, role: 'manager' | 'staff') {
  return request<{ success: boolean }>(
    `/v1/stores/${encodeURIComponent(storeId)}/members/${encodeURIComponent(userId)}`,
    { method: 'PATCH', body: JSON.stringify({ role }) },
  );
}

export function transferStoreOwnership(storeId: string, newOwnerId: string) {
  return request<{ success: boolean }>(
    `/v1/stores/${encodeURIComponent(storeId)}/transfer-ownership`,
    { method: 'POST', body: JSON.stringify({ newOwnerId }) },
  );
}

export function fetchInvitationByToken(token: string) {
  return request<{ storeName: string; role: string; expired: boolean }>(
    `/v1/invitations/${encodeURIComponent(token)}`,
  );
}

export function acceptInvitation(token: string) {
  return request<{ storeId: string; role: string }>(
    `/v1/invitations/${encodeURIComponent(token)}/accept`,
    { method: 'POST' },
  );
}

export interface IdeaInboxItem {
  id: string;
  text: string;
  author: string;
  authorRole?: string;
  photoDataUrl?: string | null;
  status: string;
  createdAt: string;
}

export function fetchIdeaInbox() {
  return request<{ ideas: IdeaInboxItem[] }>('/v1/inbox');
}

export function submitIdeaInbox(body: {
  text: string;
  author?: string;
  authorRole?: string;
  photoDataUrl?: string;
}) {
  return request<{ idea: IdeaInboxItem }>('/v1/inbox', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function useIdeaInbox(id: string) {
  return request<{ idea: IdeaInboxItem; magicCreatorPath: string }>(`/v1/inbox/${id}/use`, {
    method: 'POST',
  });
}

export function fetchWinningPatterns() {
  return request<{
    patterns: Array<{ id: string; title: string; hook: string; platform: string; notes?: string; createdAt: string }>;
  }>('/v1/winning-patterns');
}

export function createWinningPattern(body: {
  title: string;
  hook: string;
  platform?: string;
  notes?: string;
}) {
  return request<{ pattern: { id: string } }>('/v1/winning-patterns', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchCoupons() {
  return request<{
    coupons: Array<{
      id: string;
      name: string;
      code: string;
      benefit: string;
      uses: number;
      maxUses?: number | null;
      active: boolean;
    }>;
  }>('/v1/coupons');
}

export function createCoupon(body: { name: string; benefit: string; code?: string; maxUses?: number }) {
  return request<{ coupon: { id: string; code: string } }>('/v1/coupons', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function redeemCoupon(id: string, note?: string) {
  return request<{ success: boolean; message: string; uses?: number }>(`/v1/coupons/${id}/redeem`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export function fetchChatQueue() {
  return request<{
    items: Array<{
      id: string;
      lineUserId: string;
      displayName: string;
      preview: string;
      status: string;
      createdAt: string;
    }>;
  }>('/v1/line/chat-queue');
}

export function resolveChatQueueItem(id: string) {
  return request<{ success: boolean }>(`/v1/line/chat-queue/${id}/resolve`, { method: 'POST' });
}

export function fetchLineFriendDetail(lineUserId: string) {
  return request<{
    friend: LineFriend;
    recentDeliveries: unknown[];
  }>(`/v1/line/friends/${encodeURIComponent(lineUserId)}`);
}

export function fetchConnectionHealth() {
  return request<{
    score: number;
    checks: Array<{
      id: string;
      label: string;
      ok: boolean;
      warn: boolean;
      detail: string;
      ctaPath: string;
    }>;
    alerts: Array<{ id: string; label: string; detail: string; ctaPath: string; ok: boolean; warn: boolean }>;
  }>('/v1/health');
}

export function fetchAuditLogs() {
  return request<{
    logs: Array<{ id: string; action: string; detail: string; createdAt: string }>;
  }>('/v1/audit-logs');
}

export async function downloadExport(format: 'json' | 'csv' = 'json') {
  if (format === 'json') return request<unknown>('/v1/export?format=json');
  const res = await authFetch('/v1/export?format=csv');
  if (!res.ok) throw new Error('CSVエクスポートに失敗しました');
  return res.text();
}

export function fetchRegionalWatch() {
  return request<{ ideas: Array<{ topic: string; hook: string; score: number }> }>('/v1/regional-watch');
}

export function fetchStoresProgress() {
  return request<{
    stores: Array<{
      id: string;
      name: string;
      progress?: {
        metaConnected: boolean;
        lineConnected: boolean;
        hasDestination: boolean;
        lineFriends: number;
        healthScore: number;
      };
    }>;
  }>('/v1/stores/progress');
}

export function draftGbpReviewReply(reviewText: string) {
  return request<{ reply: string; usedGemini: boolean }>('/v1/gbp/review-reply', {
    method: 'POST',
    body: JSON.stringify({ reviewText }),
  });
}

export function previewLineFlex(body: {
  title?: string;
  body?: string;
  ctaLabel?: string;
  ctaUri?: string;
}) {
  return request<{ flex: unknown; quickReply: unknown }>('/v1/line/flex-preview', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchExportJson() {
  return downloadExport('json');
}

export interface XSeries {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  createdAt: string;
  pendingCount?: number;
  approvedCount?: number;
}

export interface XSeriesItem {
  id: string;
  seriesId: string;
  text: string;
  tags?: string;
  title?: string;
  linkUrl?: string;
  imageUrl?: string;
  imageAlt?: string;
  approved: boolean;
  status: string;
  publishedAt?: string;
  tweetId?: string;
  errorMessage?: string;
  createdAt: string;
  sortOrder: number;
}

export interface XScheduleRule {
  id: string;
  seriesId: string;
  seriesName?: string;
  days: string;
  timeHHMM: string;
  take: number;
  enabled: boolean;
  jitterMaxMin: number;
  publishMode: 'x_free' | 'notify';
  createdAt: string;
}

export function fetchXSeries() {
  return request<{ series: XSeries[] }>('/v1/x/series');
}

export function createXSeries(body: { name: string; description?: string }) {
  return request<{ series: XSeries }>('/v1/x/series', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function seedDefaultXSeries() {
  return request<{ series: XSeries[]; rules: XScheduleRule[] }>('/v1/x/series/seed-defaults', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function updateXSeries(id: string, body: Partial<{ name: string; description: string; enabled: boolean }>) {
  return request<{ series: XSeries }>(`/v1/x/series/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteXSeries(id: string) {
  return request<{ success: boolean }>(`/v1/x/series/${id}`, { method: 'DELETE' });
}

export function fetchXSeriesItems(seriesId: string, status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return request<{ items: XSeriesItem[] }>(`/v1/x/series/${seriesId}/items${q}`);
}

export function addXSeriesItems(
  seriesId: string,
  body:
    | { text: string; tags?: string; title?: string; linkUrl?: string; imageUrl?: string; imageAlt?: string; approved?: boolean }
    | {
        items: Array<{
          text: string;
          tags?: string;
          title?: string;
          linkUrl?: string;
          imageUrl?: string;
          imageAlt?: string;
          approved?: boolean;
        }>;
      },
) {
  return request<{ items: XSeriesItem[] }>(`/v1/x/series/${seriesId}/items`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function importXSeriesCsv(seriesId: string, csv: string) {
  return request<{ imported: number; items: XSeriesItem[] }>(`/v1/x/series/${seriesId}/import-csv`, {
    method: 'POST',
    body: JSON.stringify({ csv }),
  });
}

export function updateXSeriesItem(
  seriesId: string,
  itemId: string,
  body: Partial<{
    text: string;
    tags: string;
    title: string;
    linkUrl: string;
    imageUrl: string;
    imageAlt: string;
    approved: boolean;
    status: string;
  }>,
) {
  return request<{ item: XSeriesItem }>(`/v1/x/series/${seriesId}/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteXSeriesItem(seriesId: string, itemId: string) {
  return request<{ success: boolean }>(`/v1/x/series/${seriesId}/items/${itemId}`, { method: 'DELETE' });
}

export function fetchXScheduleRules() {
  return request<{ rules: XScheduleRule[] }>('/v1/x/schedule-rules');
}

export function createXScheduleRule(body: {
  seriesId: string;
  days: string;
  timeHHMM: string;
  take?: number;
  jitterMaxMin?: number;
  publishMode?: 'x_free' | 'notify';
}) {
  return request<{ rule: XScheduleRule }>('/v1/x/schedule-rules', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateXScheduleRule(
  id: string,
  body: Partial<{
    days: string;
    timeHHMM: string;
    take: number;
    enabled: boolean;
    jitterMaxMin: number;
    publishMode: 'x_free' | 'notify';
    seriesId: string;
  }>,
) {
  return request<{ rule: XScheduleRule }>(`/v1/x/schedule-rules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteXScheduleRule(id: string) {
  return request<{ success: boolean }>(`/v1/x/schedule-rules/${id}`, { method: 'DELETE' });
}

export function runXSeriesNow(body: {
  seriesId?: string;
  take?: number;
  mode?: 'x_free' | 'notify';
  forceAllRules?: boolean;
}) {
  return request<{ success: boolean; posted?: number; errors?: number; messages?: string[] }>(
    '/v1/x/series/run-now',
    { method: 'POST', body: JSON.stringify(body) },
  );
}
