/**
 * Polar EMS Reusable Chart Data Utilities
 * 
 * Standard pipeline functions for:
 * - Numeric sanitization (handling null, undefined, NaN, strings)
 * - Chronological time-series sorting (oldest -> newest)
 * - Timestamp formatting
 * - Telemetry sufficiency evaluation
 */

export interface TelemetryInspectionResult {
  count: number;
  hasData: boolean;
  isSingleObservation: boolean;
  isInsufficientForTrend: boolean;
  earliestTimestamp: string | null;
  latestTimestamp: string | null;
  formattedEarliest: string | null;
  formattedLatest: string | null;
  message: string;
}

/**
 * Safely sanitizes numeric telemetry values.
 * Returns null for missing/null/undefined/NaN values (to avoid silent zero fabrication),
 * or parsed float number if valid.
 */
export function sanitizeNumeric(value: any, fallback: number | null = null): number | null {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(parsed)) {
    return fallback;
  }
  return parsed;
}

/**
 * Ensures strict chronological sorting (oldest -> newest) for any time-series array.
 */
export function sortChronological<T>(
  items: T[],
  getTimestamp: (item: T) => string | Date | number | undefined
): T[] {
  if (!items || !Array.isArray(items)) return [];
  return [...items].sort((a, b) => {
    const rawA = getTimestamp(a);
    const rawB = getTimestamp(b);
    const tA = rawA ? new Date(rawA).getTime() : 0;
    const tB = rawB ? new Date(rawB).getTime() : 0;
    return tA - tB;
  });
}

/**
 * Format timestamp for chart X-axis labels (HH:mm)
 */
export function formatChartTime(ts?: string | Date | number): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * Format timestamp for chart tooltips (Month DD, HH:mm:ss)
 */
export function formatChartDateTime(ts?: string | Date | number): string {
  if (!ts) return 'N/A';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return 'N/A';
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })}`;
}

/**
 * Evaluates whether an array of telemetry observations contains sufficient data points
 * to render a meaningful continuous trend line/area curve (min 2 points required).
 */
export function inspectTelemetryData<T>(
  data: T[] | null | undefined,
  getTimestamp?: (item: T) => string | Date | number | undefined,
  minRequiredForTrend: number = 2
): TelemetryInspectionResult {
  const list = Array.isArray(data) ? data : [];
  const count = list.length;

  if (count === 0) {
    return {
      count: 0,
      hasData: false,
      isSingleObservation: false,
      isInsufficientForTrend: true,
      earliestTimestamp: null,
      latestTimestamp: null,
      formattedEarliest: null,
      formattedLatest: null,
      message: '0 observations available — no historical telemetry recorded in PostgreSQL.',
    };
  }

  let earliest: string | null = null;
  let latest: string | null = null;

  if (getTimestamp && count > 0) {
    const sorted = sortChronological(list, getTimestamp);
    const firstTs = getTimestamp(sorted[0]);
    const lastTs = getTimestamp(sorted[sorted.length - 1]);
    if (firstTs) earliest = new Date(firstTs).toISOString();
    if (lastTs) latest = new Date(lastTs).toISOString();
  }

  const isSingleObservation = count === 1;
  const isInsufficientForTrend = count < minRequiredForTrend;

  const message = isSingleObservation
    ? '1 observation available — insufficient historical telemetry for a trend visualization.'
    : isInsufficientForTrend
    ? `${count} observations available — insufficient historical telemetry for a trend visualization.`
    : `${count} chronological observations verified.`;

  return {
    count,
    hasData: true,
    isSingleObservation,
    isInsufficientForTrend,
    earliestTimestamp: earliest,
    latestTimestamp: latest,
    formattedEarliest: earliest ? formatChartDateTime(earliest) : null,
    formattedLatest: latest ? formatChartDateTime(latest) : null,
    message,
  };
}
