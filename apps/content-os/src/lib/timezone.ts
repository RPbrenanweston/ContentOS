// @crumb timezone-dst-safe
// LIB | scheduling | timezone-utils
// why: DST-safe timezone validation and next-occurrence computation; prevents double-post or skipped-post bugs at DST transitions
// in:[tz string, timeOfDay string "HH:MM", dayOfWeek 0-6] out:[boolean | Date]
// edge: USED_BY services/queue.service.ts (createQueue, materializeSlots)
// prompt: Test DST boundary dates (e.g., spring-forward 2am, fall-back 2am); verify wall-clock semantics for all IANA zones

/**
 * Validate that a timezone string is a valid IANA timezone identifier.
 * Uses the Intl API which natively understands the IANA timezone database.
 */
export function isValidTimezone(tz: string): boolean {
  if (!tz || typeof tz !== 'string') return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Compute the next wall-clock occurrence of a given time-of-day on a given
 * day-of-week in the target timezone. Handles DST transitions correctly by
 * using Intl.DateTimeFormat to interpret wall-clock time rather than UTC math.
 *
 * @param timeOfDay - "HH:MM" (24-hour), e.g. "09:00"
 * @param timezone  - IANA timezone string, e.g. "America/New_York"
 * @param dayOfWeek - 0=Sunday, 1=Monday, ..., 6=Saturday
 * @returns The next Date (in UTC) representing that wall-clock occurrence
 */
export function getNextOccurrence(
  timeOfDay: string,
  timezone: string,
  dayOfWeek: number,
): Date {
  const [hoursStr, minutesStr] = timeOfDay.split(':');
  const targetHours = parseInt(hoursStr, 10);
  const targetMinutes = parseInt(minutesStr, 10);

  // Format used to extract wall-clock parts from a UTC instant in the target tz
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const targetWeekday = weekdays[dayOfWeek];

  // Start from the current UTC instant, try up to 8 days ahead
  const now = new Date();
  for (let daysAhead = 0; daysAhead <= 7; daysAhead++) {
    const candidate = new Date(now);
    candidate.setUTCDate(candidate.getUTCDate() + daysAhead);
    // Zero out sub-minute precision so the comparison is clean
    candidate.setUTCSeconds(0, 0);

    // Extract wall-clock parts in the target timezone
    const parts = formatter.formatToParts(candidate);
    const partMap: Record<string, string> = {};
    for (const p of parts) {
      partMap[p.type] = p.value;
    }

    if (partMap.weekday !== targetWeekday) continue;

    // Build a candidate date at the target wall-clock time by constructing an
    // ISO string that Intl would interpret as the right local time, then
    // binary-searching for the correct UTC value.
    const year = parseInt(partMap.year, 10);
    const month = parseInt(partMap.month, 10) - 1; // 0-indexed
    const day = parseInt(partMap.day, 10);

    // Use Date.UTC plus timezone offset estimation via a known reference point
    const utcCandidate = localToUTC(year, month, day, targetHours, targetMinutes, timezone);
    if (utcCandidate > now) {
      return utcCandidate;
    }
  }

  // Should not reach here under normal circumstances
  throw new Error(`Could not compute next occurrence for ${timeOfDay} ${timezone} day=${dayOfWeek}`);
}

/**
 * Convert a local wall-clock date/time in the given timezone to a UTC Date.
 * Uses binary search (bisection) to find the UTC instant whose wall-clock
 * representation in `timezone` matches the requested local time.
 * This naturally handles DST gaps and folds correctly.
 */
function localToUTC(
  year: number,
  month: number, // 0-indexed
  day: number,
  hours: number,
  minutes: number,
  timezone: string,
): Date {
  // Initial estimate: assume UTC offset of 0 and then correct
  const estimate = new Date(Date.UTC(year, month, day, hours, minutes, 0, 0));

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // Binary search for the UTC ms that yields the target wall-clock time
  // Search window: ±14 hours around the estimate (covers all possible UTC offsets)
  const WINDOW_MS = 14 * 60 * 60 * 1000;
  let lo = estimate.getTime() - WINDOW_MS;
  let hi = estimate.getTime() + WINDOW_MS;

  const targetTotalMinutes = hours * 60 + minutes;

  for (let i = 0; i < 50; i++) {
    const mid = Math.floor((lo + hi) / 2);
    const midDate = new Date(mid);
    const parts = formatter.formatToParts(midDate);
    const partMap: Record<string, string> = {};
    for (const p of parts) {
      partMap[p.type] = p.value;
    }

    const localHour = parseInt(partMap.hour, 10);
    const localMinute = parseInt(partMap.minute, 10);
    const localDay = parseInt(partMap.day, 10);
    const localMonth = parseInt(partMap.month, 10) - 1;
    const localYear = parseInt(partMap.year, 10);

    const localTotalMinutes = localHour * 60 + localMinute;

    // Check if both date and time match
    const dateMatches =
      localYear === year && localMonth === month && localDay === day;
    const timeMatches = localTotalMinutes === targetTotalMinutes;

    if (dateMatches && timeMatches) {
      // Snap to the exact minute boundary
      return new Date(mid - (mid % 60000));
    }

    // Compute how far off we are in total minutes (including day offset)
    const dateDiffMinutes =
      (Date.UTC(localYear, localMonth, localDay) - Date.UTC(year, month, day)) /
      60000;
    const totalOffsetMinutes = dateDiffMinutes + localTotalMinutes - targetTotalMinutes;

    if (totalOffsetMinutes < 0) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  // Return the best estimate if binary search didn't converge exactly
  return new Date(Math.floor((lo + hi) / 2));
}
