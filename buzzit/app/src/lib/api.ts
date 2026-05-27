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
  snsConnections: Array<{ name: string; connected: boolean }>;
  canUseSlack: boolean;
  canUseAutoMode: boolean;
}

export function fetchSettings() {
  return request<SettingsResponse>('/v1/settings');
}

export function updateSettings(patch: Partial<SettingsResponse>) {
  return request<SettingsResponse>('/v1/settings', {
    method: 'PUT',
    body: JSON.stringify(patch),
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

export type PublishMode = 'notify' | 'approval' | 'meta' | 'line' | 'gbp' | 'ayrshare' | 'auto';

export interface VoiceDraftResponse {
  transcript: string;
  drafts: Array<{ kind: 'instagram' | 'line' | 'caption' | 'slack'; label: string; content: string }>;
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
  status: 'pending_approval' | 'pending' | 'processing' | 'published' | 'notified' | 'failed';
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
  return request<{ success: boolean }>(`/v1/slack/ideas/${id}/approve`, { method: 'POST' });
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
  return request<{ stores: StoreRecord[]; activeStoreId: string | null }>('/v1/stores');
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
