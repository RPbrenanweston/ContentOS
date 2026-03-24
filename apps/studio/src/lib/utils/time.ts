// @crumb time-utils
// DOM | time-formatting | ffmpeg-timecode-conversion
// why: Format video timestamps for display (HH:MM:SS:FF timecode for editing, MM:SS for playback) and compute clip boundaries with padding
// in:[seconds number] out:[formatted string or {startTimeSeconds endTimeSeconds} object] err:[Negative input, NaN values, division by zero]
// hazard: formatTimecode hardcodes 30fps; clips recorded at 60fps will show wrong frame numbers
// hazard: clampTimeWindow uses magic number paddingSeconds=10 with no way to override per-platform (TikTok might want different padding)
// edge:../services/output.service.ts -> RELATES (clampTimeWindow could be used in processClipExtraction before FFmpeg extraction)
// edge:../../types/domain.ts -> RELATES (Breadcrumb.startTimeSeconds endTimeSeconds are clamped values from clampTimeWindow)
// prompt: Add fps parameter to formatTimecode; make paddingSeconds context-aware (per-platform); handle edge case where duration is null

/**
 * Format seconds as HH:MM:SS:FF timecode
 * FF = frame number assuming 30fps (0-29)
 */
export function formatTimecode(seconds: number): string {
  const totalSeconds = Math.max(0, seconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const f = Math.floor((totalSeconds % 1) * 30);

  return [
    String(h).padStart(2, '0'),
    String(m).padStart(2, '0'),
    String(s).padStart(2, '0'),
    String(f).padStart(2, '0'),
  ].join(':');
}

/**
 * Format seconds as MM:SS for compact display
 */
export function formatCompact(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Clamp a breadcrumb time window with ±10s padding
 */
export function clampTimeWindow(
  timestampSeconds: number,
  durationSeconds: number | null,
  paddingSeconds = 10
): { startTimeSeconds: number; endTimeSeconds: number } {
  const start = Math.max(0, timestampSeconds - paddingSeconds);
  const end = durationSeconds != null
    ? Math.min(durationSeconds, timestampSeconds + paddingSeconds)
    : timestampSeconds + paddingSeconds;

  return { startTimeSeconds: start, endTimeSeconds: end };
}
