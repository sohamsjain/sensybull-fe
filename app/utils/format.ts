// app/utils/format.ts

/**
 * Formats a unix timestamp (seconds) into a relative time string.
 */
export function formatTimestamp(timestamp: number): string {
  // Handle both seconds and milliseconds timestamps
  const timestampMs = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const now = Date.now();
  const diffMs = now - timestampMs;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  const date = new Date(timestampMs);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Formats a unix timestamp into a detailed relative string.
 * E.g., "3 minutes ago", "2 hours ago".
 */
export function formatTimestampDetailed(timestamp: number): string {
  const timestampMs = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const now = Date.now();
  const diffMs = now - timestampMs;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;

  const date = new Date(timestampMs);
  return date.toLocaleDateString();
}

/**
 * Formats a price value as a dollar string.
 */
export function formatPrice(price?: number | null): string {
  if (!price || price <= 0) return '--';
  return `$${price.toFixed(2)}`;
}

/**
 * Formats a unix timestamp (seconds) for chart axis labels.
 */
export function formatChartDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
