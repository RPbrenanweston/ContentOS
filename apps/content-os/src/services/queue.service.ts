import type {
  PublishingQueue,
  QueueSchedule,
  QueueSlot,
  DayOfWeek,
} from '@/domain';

/**
 * QueueService manages publishing cadences.
 *
 * A queue is a recurring schedule attached to a distribution account.
 * Approved assets auto-fill empty slots. The creator controls cadence;
 * AI suggests optimal times from engagement data.
 */
export class QueueService {
  constructor(private supabase: ReturnType<typeof import('@/infrastructure/supabase/client').createClient>) {}

  /**
   * Create a new publishing queue for a distribution account.
   */
  async createQueue(params: {
    userId: string;
    distributionAccountId: string;
    name?: string;
    timezone?: string;
    schedules: Array<{ dayOfWeek: DayOfWeek; timeOfDay: string }>;
  }): Promise<PublishingQueue> {
    const { data: queue, error: queueError } = await this.supabase
      .from('publishing_queues')
      .insert({
        user_id: params.userId,
        distribution_account_id: params.distributionAccountId,
        name: params.name ?? 'Default',
        timezone: params.timezone ?? 'UTC',
      })
      .select()
      .single();

    if (queueError) throw queueError;

    // Create schedule entries
    if (params.schedules.length > 0) {
      const { error: schedError } = await this.supabase
        .from('queue_schedules')
        .insert(
          params.schedules.map((s) => ({
            publishing_queue_id: queue.id,
            day_of_week: s.dayOfWeek,
            time_of_day: s.timeOfDay,
          }))
        );

      if (schedError) throw schedError;
    }

    return this.mapQueue(queue);
  }

  /**
   * Get all queues for a user with their schedules.
   */
  async getQueues(userId: string): Promise<PublishingQueue[]> {
    const { data, error } = await this.supabase
      .from('publishing_queues')
      .select(`
        *,
        queue_schedules (*),
        distribution_accounts (account_name, platform)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map((q: Record<string, unknown>) => this.mapQueue(q));
  }

  /**
   * Preview upcoming N slots across all active queues.
   * Materializes slots from schedules for the next N occurrences.
   */
  async previewSlots(params: {
    userId: string;
    count?: number;
  }): Promise<QueueSlot[]> {
    const count = params.count ?? 20;

    // Get existing materialized slots
    const { data: existing, error } = await this.supabase
      .from('queue_slots')
      .select(`
        *,
        derived_assets (id, title, body, asset_type, platform_hint)
      `)
      .eq('publishing_queue_id', await this.getUserQueueIds(params.userId))
      .in('status', ['empty', 'filled'])
      .gte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(count);

    if (error) throw error;
    return (existing ?? []).map((s: Record<string, unknown>) => this.mapSlot(s));
  }

  /**
   * Materialize queue slots for the next N days.
   * Called on a schedule (e.g., daily cron) to create concrete
   * slot instances from recurring schedules.
   */
  async materializeSlots(params: {
    queueId: string;
    daysAhead?: number;
  }): Promise<number> {
    const daysAhead = params.daysAhead ?? 14;

    // Get queue with schedules
    const { data: queue, error: qErr } = await this.supabase
      .from('publishing_queues')
      .select('*, queue_schedules (*)')
      .eq('id', params.queueId)
      .single();

    if (qErr || !queue) throw qErr ?? new Error('Queue not found');
    if (!queue.is_active) return 0;

    const schedules = queue.queue_schedules ?? [];
    if (schedules.length === 0) return 0;

    // Generate dates for next N days
    const now = new Date();
    const slots: Array<{
      publishing_queue_id: string;
      queue_schedule_id: string;
      scheduled_for: string;
      status: string;
    }> = [];

    const dayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };

    for (let d = 0; d < daysAhead; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() + d);
      const dayIndex = date.getDay();

      for (const sched of schedules) {
        if (!sched.is_active) continue;
        if (dayMap[sched.day_of_week] !== dayIndex) continue;

        const [hours, minutes] = sched.time_of_day.split(':').map(Number);
        const slotTime = new Date(date);
        slotTime.setHours(hours, minutes, 0, 0);

        // Skip past times
        if (slotTime <= now) continue;

        slots.push({
          publishing_queue_id: params.queueId,
          queue_schedule_id: sched.id,
          scheduled_for: slotTime.toISOString(),
          status: 'empty',
        });
      }
    }

    if (slots.length === 0) return 0;

    // Upsert to avoid duplicates
    const { error: insertErr } = await this.supabase
      .from('queue_slots')
      .upsert(slots, {
        onConflict: 'publishing_queue_id,scheduled_for',
        ignoreDuplicates: true,
      });

    if (insertErr) throw insertErr;
    return slots.length;
  }

  /**
   * Fill empty slots with approved assets.
   * Oldest unfilled slot gets the oldest approved asset.
   */
  async autoFillSlots(params: {
    queueId: string;
    limit?: number;
  }): Promise<number> {
    const limit = params.limit ?? 10;

    // Get empty slots ordered by date
    const { data: emptySlots, error: slotErr } = await this.supabase
      .from('queue_slots')
      .select('*')
      .eq('publishing_queue_id', params.queueId)
      .eq('status', 'empty')
      .gte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(limit);

    if (slotErr) throw slotErr;
    if (!emptySlots?.length) return 0;

    // Get queue to find platform
    const { data: queue } = await this.supabase
      .from('publishing_queues')
      .select('distribution_accounts (platform)')
      .eq('id', params.queueId)
      .single();

    const platform = (queue as Record<string, Record<string, string>>)?.distribution_accounts?.platform;

    // Get approved assets for this platform not already in a slot
    const { data: assets, error: assetErr } = await this.supabase
      .from('derived_assets')
      .select('id')
      .eq('status', 'approved')
      .eq('platform_hint', platform)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (assetErr) throw assetErr;
    if (!assets?.length) return 0;

    // Fill slots
    let filled = 0;
    for (let i = 0; i < Math.min(emptySlots.length, assets.length); i++) {
      const { error: updateErr } = await this.supabase
        .from('queue_slots')
        .update({
          derived_asset_id: assets[i].id,
          status: 'filled',
        })
        .eq('id', emptySlots[i].id);

      if (!updateErr) filled++;
    }

    return filled;
  }

  /**
   * Retry a failed distribution job.
   */
  async retryJob(jobId: string): Promise<void> {
    const { error } = await this.supabase
      .from('distribution_jobs')
      .update({
        status: 'pending',
        error_message: null,
        retry_count: this.supabase.rpc('increment_retry', { job_id: jobId }),
      })
      .eq('id', jobId);

    if (error) throw error;
  }

  private async getUserQueueIds(userId: string): Promise<string[]> {
    const { data } = await this.supabase
      .from('publishing_queues')
      .select('id')
      .eq('user_id', userId);

    return (data ?? []).map((q: { id: string }) => q.id);
  }

  private mapQueue(raw: Record<string, unknown>): PublishingQueue {
    const account = raw.distribution_accounts as Record<string, string> | undefined;
    return {
      id: raw.id as string,
      userId: raw.user_id as string,
      distributionAccountId: raw.distribution_account_id as string,
      name: raw.name as string,
      timezone: raw.timezone as string,
      isActive: raw.is_active as boolean,
      metadata: (raw.metadata ?? {}) as Record<string, unknown>,
      createdAt: raw.created_at as string,
      updatedAt: raw.updated_at as string,
      schedules: Array.isArray(raw.queue_schedules)
        ? raw.queue_schedules.map(this.mapSchedule)
        : undefined,
      accountName: account?.account_name,
      platform: account?.platform,
    };
  }

  private mapSchedule(raw: Record<string, unknown>): QueueSchedule {
    return {
      id: raw.id as string,
      publishingQueueId: raw.publishing_queue_id as string,
      dayOfWeek: raw.day_of_week as DayOfWeek,
      timeOfDay: raw.time_of_day as string,
      isActive: raw.is_active as boolean,
      createdAt: raw.created_at as string,
    };
  }

  private mapSlot(raw: Record<string, unknown>): QueueSlot {
    return {
      id: raw.id as string,
      publishingQueueId: raw.publishing_queue_id as string,
      queueScheduleId: raw.queue_schedule_id as string | undefined,
      derivedAssetId: raw.derived_asset_id as string | undefined,
      scheduledFor: raw.scheduled_for as string,
      status: raw.status as QueueSlot['status'],
      distributionJobId: raw.distribution_job_id as string | undefined,
      metadata: (raw.metadata ?? {}) as Record<string, unknown>,
      createdAt: raw.created_at as string,
      updatedAt: raw.updated_at as string,
      asset: raw.derived_assets as QueueSlot['asset'],
    };
  }
}
