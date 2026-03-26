/**
 * @crumb
 * id: queue-scheduling-entity
 * AREA: DAT
 * why: Define PublishingQueue, QueueSchedule, QueueSlot, and PublishingLog—coordinate recurring publication with asset-to-slot assignment and audit trail
 * in: PublishingQueue {userId, distributionAccountId, timezone, isActive}; QueueSchedule {publishingQueueId, dayOfWeek, timeOfDay}; QueueSlot {publishingQueueId, queueScheduleId?, derivedAssetId?, scheduledFor, status}
 * out: PublishingQueue {id, schedules?: QueueSchedule[], accountName?, platform?}; QueueSlot {id, scheduledFor, status, asset?: {id, title?, body, assetType}}; PublishingLog {id, userId, distributionJobId?, eventType, platform, externalPostId?, errorMessage?}
 * err: No errors typed—timezone validation deferred; DST transitions not handled; QueueSlotStatus enum allows invalid transitions
 * hazard: timeOfDay string (HH:MM format) unsanitized—malformed strings ("25:99") accepted, causing scheduling failures at materialization time
 * hazard: timezone string accepts any value (e.g., "Invalid/Timezone")—DST-aware slot calculation will fail silently for edge cases (spring forward, fall back)
 * edge: CREATED_BY queue.service.ts (materializeSlots() populates QueueSlot; autoFillSlots() assigns derived assets)
 * edge: CALLS distribution.service.ts (publish() consumes filled slots, creates DistributionJob)
 * edge: LOGS publishing attempts via PublishingLog for audit trail
 * prompt: Test DST transition boundaries (spring forward, fall back); validate timeOfDay format strictly; test QueueSlotStatus transitions (empty→filled→published or empty→skipped); verify timezone validation against IANA database
 */

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
