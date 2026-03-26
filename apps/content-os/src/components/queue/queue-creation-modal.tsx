// @crumb queue-creation-modal
// UI | queue management | modal form | account selection | schedule builder
// why: Allow users to create a publishing queue tied to a distribution account—name, platform filter, account multi-select, timezone, and a recurring schedule
// in:[open: bool, onClose callback, onSuccess callback] out:[POST /api/queue on submit] err:[fetch failure, validation error, API error]
// hazard: Account list is fetched fresh on every modal open—no caching; slow connections show empty list until resolved
// hazard: Timezone list from Intl.supportedValuesOf('timeZone') varies by browser/OS—exotic timezones may not be recognized by the server
// edge:../../app/api/queue/route.ts -> CALLS [POST /api/queue]
// edge:../../app/api/distribution/accounts/route.ts -> READS [GET /api/distribution/accounts]
// edge:../../domain/distribution.ts -> READS [DistributionAccount]
// edge:../../domain/enums.ts -> READS [Platform]
// prompt: Add optimistic update for queue list after creation. Validate timezone client-side before submit.

'use client';

import { useEffect, useState } from 'react';
import type { DistributionAccount } from '@/domain';
import type { Platform } from '@/domain';

interface QueueCreationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PLATFORMS: Platform[] = [
  'linkedin',
  'x',
  'youtube',
  'tiktok',
  'instagram',
  'newsletter',
  'bluesky',
  'threads',
  'reddit',
];

const TIMEZONES: string[] = (() => {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo'];
  }
})();

type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

const ALL_DAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const WEEKDAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
];

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

type Frequency = 'daily' | 'weekdays' | 'custom';

interface TimeSlot {
  id: string;
  hour: string;
  minute: string;
}

interface ScheduleEntry {
  dayOfWeek: DayOfWeek;
  timeOfDay: string; // HH:MM
}

function buildScheduleEntries(
  frequency: Frequency,
  customDays: Set<DayOfWeek>,
  timeSlots: TimeSlot[],
): ScheduleEntry[] {
  const activeDays =
    frequency === 'daily'
      ? ALL_DAYS
      : frequency === 'weekdays'
        ? WEEKDAYS
        : Array.from(customDays);

  const validSlots = timeSlots.filter(
    (s) => s.hour !== '' && s.minute !== '',
  );

  const entries: ScheduleEntry[] = [];
  for (const day of activeDays) {
    for (const slot of validSlots) {
      entries.push({
        dayOfWeek: day,
        timeOfDay: `${slot.hour.padStart(2, '0')}:${slot.minute.padStart(2, '0')}`,
      });
    }
  }
  return entries;
}

let slotCounter = 0;
function nextSlotId() {
  return `slot-${++slotCounter}`;
}

export function QueueCreationModal({ open, onClose, onSuccess }: QueueCreationModalProps) {
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<Platform | ''>('');
  const [accounts, setAccounts] = useState<DistributionAccount[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [timezone, setTimezone] = useState('UTC');
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Schedule state
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [customDays, setCustomDays] = useState<Set<DayOfWeek>>(new Set());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    { id: nextSlotId(), hour: '09', minute: '00' },
  ]);

  // Fetch accounts when modal opens
  useEffect(() => {
    if (!open) return;

    setLoadingAccounts(true);
    setError(null);

    fetch('/api/distribution/accounts')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load accounts');
        return r.json();
      })
      .then((d) => setAccounts(d.accounts ?? []))
      .catch(() => setError('Could not load distribution accounts. Please try again.'))
      .finally(() => setLoadingAccounts(false));
  }, [open]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setName('');
      setPlatform('');
      setSelectedAccountIds(new Set());
      setTimezone('UTC');
      setError(null);
      setSubmitting(false);
      setFrequency('daily');
      setCustomDays(new Set());
      setTimeSlots([{ id: nextSlotId(), hour: '09', minute: '00' }]);
    }
  }, [open]);

  // Filter accounts by selected platform
  const filteredAccounts = platform
    ? accounts.filter((a) => a.platform === platform && a.isActive)
    : accounts.filter((a) => a.isActive);

  // Deselect accounts that are no longer visible when platform changes
  const handlePlatformChange = (newPlatform: Platform | '') => {
    setPlatform(newPlatform);
    if (newPlatform) {
      setSelectedAccountIds((prev) => {
        const validIds = new Set(
          accounts
            .filter((a) => a.platform === newPlatform && a.isActive)
            .map((a) => a.id)
        );
        const next = new Set<string>();
        for (const id of prev) {
          if (validIds.has(id)) next.add(id);
        }
        return next;
      });
    }
  };

  const toggleAccount = (id: string) => {
    setSelectedAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCustomDay = (day: DayOfWeek) => {
    setCustomDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const addTimeSlot = () => {
    setTimeSlots((prev) => [
      ...prev,
      { id: nextSlotId(), hour: '12', minute: '00' },
    ]);
  };

  const removeTimeSlot = (id: string) => {
    setTimeSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const updateTimeSlot = (id: string, field: 'hour' | 'minute', value: string) => {
    setTimeSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  // Build scheduled entries from current state
  const scheduleEntries = buildScheduleEntries(frequency, customDays, timeSlots);

  // Active days for display and validation
  const activeDaysForDisplay =
    frequency === 'daily'
      ? ALL_DAYS
      : frequency === 'weekdays'
        ? WEEKDAYS
        : Array.from(customDays);

  const validTimeSlots = timeSlots.filter((s) => s.hour !== '' && s.minute !== '');
  const scheduleValid =
    activeDaysForDisplay.length > 0 && validTimeSlots.length > 0;

  const canSubmit =
    name.trim() !== '' &&
    selectedAccountIds.size > 0 &&
    scheduleValid &&
    !submitting;

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Queue name is required.');
      return;
    }
    if (selectedAccountIds.size === 0) {
      setError('Select at least one distribution account.');
      return;
    }
    if (!scheduleValid) {
      setError('Add at least one day and time to the schedule.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const accountId = Array.from(selectedAccountIds)[0];

      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distributionAccountId: accountId,
          name: name.trim(),
          timezone,
          schedule: scheduleEntries,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }

      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create queue. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ pointerEvents: 'none' }}
      >
        <div
          className="w-full max-w-lg rounded-xl shadow-xl flex flex-col"
          style={{
            backgroundColor: 'var(--theme-card-bg)',
            border: '1px solid var(--theme-card-border)',
            pointerEvents: 'auto',
            maxHeight: '92vh',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid var(--theme-border)' }}
          >
            <h2 className="text-base font-semibold" style={{ color: 'var(--theme-foreground)' }}>
              New Queue
            </h2>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
              style={{ color: 'var(--theme-muted)' }}
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="queue-name"
                className="block text-xs font-medium"
                style={{ color: 'var(--theme-foreground)' }}
              >
                Queue Name
              </label>
              <input
                id="queue-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. LinkedIn Morning"
                className="w-full text-sm px-3 py-2 rounded-lg outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--theme-surface)',
                  border: '1px solid var(--theme-border)',
                  color: 'var(--theme-foreground)',
                }}
                disabled={submitting}
              />
            </div>

            {/* Platform filter */}
            <div className="space-y-1.5">
              <label
                htmlFor="queue-platform"
                className="block text-xs font-medium"
                style={{ color: 'var(--theme-foreground)' }}
              >
                Platform
              </label>
              <select
                id="queue-platform"
                value={platform}
                onChange={(e) => handlePlatformChange(e.target.value as Platform | '')}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--theme-surface)',
                  border: '1px solid var(--theme-border)',
                  color: platform ? 'var(--theme-foreground)' : 'var(--theme-muted)',
                }}
                disabled={submitting}
              >
                <option value="">All platforms</option>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p} style={{ color: 'var(--theme-foreground)' }}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Account multi-select */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: 'var(--theme-foreground)' }}>
                Distribution Accounts
                {selectedAccountIds.size > 0 && (
                  <span className="ml-2 text-xs font-normal" style={{ color: 'var(--theme-muted)' }}>
                    {selectedAccountIds.size} selected
                  </span>
                )}
              </label>

              {loadingAccounts ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-10 rounded-lg animate-pulse"
                      style={{ backgroundColor: 'var(--theme-surface)' }}
                    />
                  ))}
                </div>
              ) : filteredAccounts.length === 0 ? (
                <div
                  className="py-6 text-center text-sm rounded-lg"
                  style={{
                    backgroundColor: 'var(--theme-surface)',
                    border: '1px dashed var(--theme-border)',
                    color: 'var(--theme-muted)',
                  }}
                >
                  {platform
                    ? `No active ${platform} accounts connected.`
                    : 'No active accounts connected.'}
                </div>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {filteredAccounts.map((account) => {
                    const isSelected = selectedAccountIds.has(account.id);
                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => toggleAccount(account.id)}
                        disabled={submitting}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                        style={{
                          backgroundColor: isSelected ? 'var(--theme-surface)' : 'transparent',
                          border: `1px solid ${isSelected ? 'var(--theme-btn-primary-bg)' : 'var(--theme-border)'}`,
                        }}
                      >
                        {/* Checkbox indicator */}
                        <div
                          className="w-4 h-4 flex items-center justify-center rounded shrink-0 transition-colors"
                          style={{
                            backgroundColor: isSelected ? 'var(--theme-btn-primary-bg)' : 'transparent',
                            border: `1px solid ${isSelected ? 'var(--theme-btn-primary-bg)' : 'var(--theme-border)'}`,
                          }}
                        >
                          {isSelected && (
                            <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="none" stroke="var(--theme-btn-primary-text)" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>

                        {/* Platform badge */}
                        <span
                          className="text-xs font-medium px-1.5 py-0.5 rounded shrink-0 capitalize"
                          style={{
                            backgroundColor: 'var(--theme-tag-bg)',
                            color: 'var(--theme-tag-text)',
                          }}
                        >
                          {account.platform}
                        </span>

                        {/* Account name */}
                        <span
                          className="text-sm truncate"
                          style={{ color: 'var(--theme-foreground)' }}
                        >
                          {account.accountName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Timezone */}
            <div className="space-y-1.5">
              <label
                htmlFor="queue-timezone"
                className="block text-xs font-medium"
                style={{ color: 'var(--theme-foreground)' }}
              >
                Timezone
              </label>
              <select
                id="queue-timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                style={{
                  backgroundColor: 'var(--theme-surface)',
                  border: '1px solid var(--theme-border)',
                  color: 'var(--theme-foreground)',
                }}
                disabled={submitting}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            {/* ── Schedule Builder ── */}
            <div
              className="rounded-lg p-4 space-y-4"
              style={{
                backgroundColor: 'var(--theme-surface)',
                border: '1px solid var(--theme-border)',
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-muted)' }}>
                Posting Schedule
              </p>

              {/* Frequency selector */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium" style={{ color: 'var(--theme-foreground)' }}>
                  Frequency
                </p>
                <div className="flex gap-2">
                  {(['daily', 'weekdays', 'custom'] as Frequency[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFrequency(f)}
                      disabled={submitting}
                      className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize"
                      style={{
                        backgroundColor:
                          frequency === f
                            ? 'var(--theme-btn-primary-bg)'
                            : 'var(--theme-card-bg)',
                        color:
                          frequency === f
                            ? 'var(--theme-btn-primary-text)'
                            : 'var(--theme-foreground)',
                        border: `1px solid ${frequency === f ? 'var(--theme-btn-primary-bg)' : 'var(--theme-border)'}`,
                      }}
                    >
                      {f === 'weekdays' ? 'Mon–Fri' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom day checkboxes — only when Custom selected */}
              {frequency === 'custom' && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium" style={{ color: 'var(--theme-foreground)' }}>
                    Days
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {ALL_DAYS.map((day) => {
                      const active = customDays.has(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleCustomDay(day)}
                          disabled={submitting}
                          className="w-10 h-8 rounded-md text-xs font-medium transition-colors"
                          style={{
                            backgroundColor: active
                              ? 'var(--theme-btn-primary-bg)'
                              : 'var(--theme-card-bg)',
                            color: active
                              ? 'var(--theme-btn-primary-text)'
                              : 'var(--theme-foreground)',
                            border: `1px solid ${active ? 'var(--theme-btn-primary-bg)' : 'var(--theme-border)'}`,
                          }}
                        >
                          {DAY_LABELS[day]}
                        </button>
                      );
                    })}
                  </div>
                  {customDays.size === 0 && (
                    <p className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                      Select at least one day.
                    </p>
                  )}
                </div>
              )}

              {/* Time slots */}
              <div className="space-y-2">
                <p className="text-xs font-medium" style={{ color: 'var(--theme-foreground)' }}>
                  Posting Times
                </p>
                <div className="space-y-2">
                  {timeSlots.map((slot) => (
                    <div key={slot.id} className="flex items-center gap-2">
                      {/* Hour */}
                      <select
                        value={slot.hour}
                        onChange={(e) => updateTimeSlot(slot.id, 'hour', e.target.value)}
                        disabled={submitting}
                        className="text-sm px-2 py-1.5 rounded-md outline-none"
                        style={{
                          backgroundColor: 'var(--theme-card-bg)',
                          border: '1px solid var(--theme-border)',
                          color: 'var(--theme-foreground)',
                          minWidth: '4rem',
                        }}
                        aria-label="Hour"
                      >
                        {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(
                          (h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ),
                        )}
                      </select>
                      <span style={{ color: 'var(--theme-muted)' }} className="text-sm font-medium">
                        :
                      </span>
                      {/* Minute */}
                      <select
                        value={slot.minute}
                        onChange={(e) => updateTimeSlot(slot.id, 'minute', e.target.value)}
                        disabled={submitting}
                        className="text-sm px-2 py-1.5 rounded-md outline-none"
                        style={{
                          backgroundColor: 'var(--theme-card-bg)',
                          border: '1px solid var(--theme-border)',
                          color: 'var(--theme-foreground)',
                          minWidth: '4rem',
                        }}
                        aria-label="Minute"
                      >
                        {['00', '15', '30', '45'].map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => removeTimeSlot(slot.id)}
                        disabled={submitting || timeSlots.length === 1}
                        className="w-6 h-6 flex items-center justify-center rounded-md transition-colors disabled:opacity-30"
                        style={{ color: 'var(--theme-muted)' }}
                        aria-label="Remove time slot"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addTimeSlot}
                  disabled={submitting}
                  className="flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-70"
                  style={{ color: 'var(--theme-btn-primary-bg)' }}
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add time
                </button>
              </div>

              {/* Week preview grid */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium" style={{ color: 'var(--theme-foreground)' }}>
                  Weekly Preview
                </p>
                <div
                  className="rounded-lg overflow-hidden"
                  style={{ border: '1px solid var(--theme-border)' }}
                >
                  <div className="grid grid-cols-7">
                    {ALL_DAYS.map((day) => {
                      const isActive =
                        frequency === 'daily' ||
                        (frequency === 'weekdays' && WEEKDAYS.includes(day)) ||
                        (frequency === 'custom' && customDays.has(day));
                      const dayEntries = scheduleEntries.filter(
                        (e) => e.dayOfWeek === day,
                      );
                      return (
                        <div
                          key={day}
                          className="flex flex-col items-center py-2 px-1 gap-1"
                          style={{
                            borderRight: day !== 'sunday' ? '1px solid var(--theme-border)' : undefined,
                            backgroundColor: isActive
                              ? 'color-mix(in srgb, var(--theme-btn-primary-bg) 8%, transparent)'
                              : 'transparent',
                          }}
                        >
                          <span
                            className="text-xs font-medium"
                            style={{
                              color: isActive
                                ? 'var(--theme-btn-primary-bg)'
                                : 'var(--theme-muted)',
                            }}
                          >
                            {DAY_LABELS[day]}
                          </span>
                          <div className="flex flex-col gap-0.5 items-center">
                            {isActive && dayEntries.length > 0
                              ? dayEntries.map((entry) => (
                                  <div
                                    key={entry.timeOfDay}
                                    className="rounded-full"
                                    style={{
                                      width: 6,
                                      height: 6,
                                      backgroundColor: 'var(--theme-btn-primary-bg)',
                                    }}
                                    title={entry.timeOfDay}
                                  />
                                ))
                              : isActive && (
                                  <div
                                    className="rounded-full opacity-30"
                                    style={{
                                      width: 6,
                                      height: 6,
                                      backgroundColor: 'var(--theme-btn-primary-bg)',
                                    }}
                                  />
                                )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Time labels row */}
                  {validTimeSlots.length > 0 && (
                    <div
                      className="px-3 py-1.5 flex flex-wrap gap-1.5"
                      style={{ borderTop: '1px solid var(--theme-border)' }}
                    >
                      {validTimeSlots.map((slot) => (
                        <span
                          key={slot.id}
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: 'color-mix(in srgb, var(--theme-btn-primary-bg) 12%, transparent)',
                            color: 'var(--theme-btn-primary-bg)',
                          }}
                        >
                          {slot.hour.padStart(2, '0')}:{slot.minute.padStart(2, '0')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {scheduleEntries.length > 0 && (
                  <p className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                    {scheduleEntries.length} posting{scheduleEntries.length === 1 ? ' slot' : ' slots'} per week
                  </p>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="text-sm px-3 py-2.5 rounded-lg"
                style={{
                  backgroundColor: 'var(--theme-surface)',
                  border: '1px solid var(--theme-border)',
                  color: 'var(--theme-muted)',
                }}
              >
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-3 px-6 py-4"
            style={{ borderTop: '1px solid var(--theme-border)' }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{
                border: '1px solid var(--theme-border)',
                color: 'var(--theme-foreground)',
                backgroundColor: 'transparent',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: 'var(--theme-btn-primary-bg)',
                color: 'var(--theme-btn-primary-text)',
              }}
            >
              {submitting ? 'Creating...' : 'Create Queue'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
