import { formatTimestamp, formatTimestampDetailed, formatPrice, formatChartDate } from '../format';

describe('formatTimestamp', () => {
  it('returns "Just now" for recent timestamps', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(formatTimestamp(now)).toBe('Just now');
  });

  it('returns minutes ago for timestamps within an hour', () => {
    const thirtyMinsAgo = Math.floor(Date.now() / 1000) - 30 * 60;
    expect(formatTimestamp(thirtyMinsAgo)).toBe('30m ago');
  });

  it('returns hours ago for timestamps within a day', () => {
    const fiveHoursAgo = Math.floor(Date.now() / 1000) - 5 * 60 * 60;
    expect(formatTimestamp(fiveHoursAgo)).toBe('5h ago');
  });

  it('returns days ago for timestamps within a week', () => {
    const threeDaysAgo = Math.floor(Date.now() / 1000) - 3 * 24 * 60 * 60;
    expect(formatTimestamp(threeDaysAgo)).toBe('3d ago');
  });

  it('returns date for older timestamps', () => {
    const twoWeeksAgo = Math.floor(Date.now() / 1000) - 14 * 24 * 60 * 60;
    const result = formatTimestamp(twoWeeksAgo);
    expect(result).toMatch(/\w+ \d+/); // e.g. "Mar 2"
  });
});

describe('formatTimestampDetailed', () => {
  it('returns "Just now" for recent timestamps', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(formatTimestampDetailed(now)).toBe('Just now');
  });

  it('returns verbose minutes', () => {
    const oneMinAgo = Math.floor(Date.now() / 1000) - 60;
    expect(formatTimestampDetailed(oneMinAgo)).toBe('1 minute ago');
  });

  it('returns verbose hours', () => {
    const twoHoursAgo = Math.floor(Date.now() / 1000) - 2 * 60 * 60;
    expect(formatTimestampDetailed(twoHoursAgo)).toBe('2 hours ago');
  });
});

describe('formatPrice', () => {
  it('returns formatted price for valid numbers', () => {
    expect(formatPrice(123.456)).toBe('$123.46');
  });

  it('returns -- for null/undefined', () => {
    expect(formatPrice(null)).toBe('--');
    expect(formatPrice(undefined)).toBe('--');
  });

  it('returns -- for zero', () => {
    expect(formatPrice(0)).toBe('--');
  });
});

describe('formatChartDate', () => {
  it('formats a unix timestamp to short date', () => {
    // Jan 15, 2025 UTC
    const timestamp = 1736899200;
    const result = formatChartDate(timestamp);
    expect(result).toMatch(/Jan \d+/);
  });
});
