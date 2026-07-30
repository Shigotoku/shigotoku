export type PublishMode =
  | 'notify'
  | 'approval'
  | 'meta'
  | 'line'
  | 'gbp'
  | 'ayrshare'
  | 'x_free'
  | 'auto';

export type ScheduledJobStatus =
  | 'pending_approval'
  | 'pending'
  | 'processing'
  | 'published'
  | 'notified'
  | 'failed'
  | 'draft';

export interface ScheduleContentItem {
  platform: string;
  label: string;
  content: string;
  carouselSlides?: string[];
}

export interface ScheduledJobRecord {
  id: string;
  uid: string;
  contents: ScheduleContentItem[];
  scheduledAt: string;
  status: ScheduledJobStatus;
  publishMode: PublishMode;
  mediaUrls?: string[];
  destinationUrl?: string;
  trackingLinks?: Array<{ platform: string; trackingUrl: string; postId: string }>;
  errorMessage?: string;
  publishResults?: Array<{ platform: string; success: boolean; message: string; externalId?: string }>;
  createdAt: string;
  updatedAt?: string;
}
