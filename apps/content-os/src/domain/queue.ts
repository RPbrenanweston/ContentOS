export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type QueueSlotStatus = 'empty' | 'filled' | 'published' | 'skipped';

export interface Profile {
  id: string;
  userId: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  isDefault: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PublishingQueue {
  id: string;
  userId: string;
  distributionAccountId: string;
  name: string;
  timezone: string;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // Joined data
  schedules?: QueueSchedule[];
  accountName?: string;
  platform?: string;
}

export interface QueueSchedule {
  id: string;
  publishingQueueId: string;
  dayOfWeek: DayOfWeek;
  timeOfDay: string; // HH:MM format
  isActive: boolean;
  createdAt: string;
}

export interface QueueSlot {
  id: string;
  publishingQueueId: string;
  queueScheduleId?: string;
  derivedAssetId?: string;
  scheduledFor: string;
  status: QueueSlotStatus;
  distributionJobId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // Joined data
  asset?: {
    id: string;
    title?: string;
    body: string;
    assetType: string;
    platformHint?: string;
  };
}

export interface PublishingLog {
  id: string;
  userId: string;
  distributionJobId?: string;
  eventType: 'attempt' | 'success' | 'failure' | 'retry' | 'unpublish';
  platform: string;
  accountName?: string;
  externalPostId?: string;
  errorMessage?: string;
  createdAt: string;
}
