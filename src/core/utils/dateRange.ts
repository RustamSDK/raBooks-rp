/**
 * Date Range Utilities for Double-Entry Ledger and Journal Filtering
 * Follows ISO 8601 YYYY-MM-DD standard for deterministic local date comparisons.
 */

export type DatePreset =
  | 'ALL'
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_WEEK'
  | 'LAST_WEEK'
  | 'LAST_7_DAYS'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_QUARTER'
  | 'THIS_FY'
  | 'CUSTOM';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

/**
 * Formats a JavaScript Date object into standard local ISO YYYY-MM-DD string.
 */
export function formatLocalISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Resolves standard preset ranges into concrete start and end YYYY-MM-DD strings.
 */
export function resolvePresetDateRange(preset: DatePreset, now: Date = new Date()): DateRange | null {
  if (preset === 'ALL') {
    return null;
  }

  const todayStr = formatLocalISODate(now);

  switch (preset) {
    case 'TODAY': {
      return { startDate: todayStr, endDate: todayStr };
    }

    case 'YESTERDAY': {
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const yStr = formatLocalISODate(yesterday);
      return { startDate: yStr, endDate: yStr };
    }

    case 'THIS_WEEK': {
      // Monday as week start
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
      return {
        startDate: formatLocalISODate(monday),
        endDate: formatLocalISODate(sunday),
      };
    }

    case 'LAST_WEEK': {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1 - day) - 7;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
      return {
        startDate: formatLocalISODate(monday),
        endDate: formatLocalISODate(sunday),
      };
    }

    case 'LAST_7_DAYS': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      return {
        startDate: formatLocalISODate(start),
        endDate: todayStr,
      };
    }

    case 'THIS_MONTH': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        startDate: formatLocalISODate(firstDay),
        endDate: formatLocalISODate(lastDay),
      };
    }

    case 'LAST_MONTH': {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        startDate: formatLocalISODate(firstDay),
        endDate: formatLocalISODate(lastDay),
      };
    }

    case 'THIS_QUARTER': {
      const currentMonth = now.getMonth(); // 0-11
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      const firstDay = new Date(now.getFullYear(), quarterStartMonth, 1);
      const lastDay = new Date(now.getFullYear(), quarterStartMonth + 3, 0);
      return {
        startDate: formatLocalISODate(firstDay),
        endDate: formatLocalISODate(lastDay),
      };
    }

    case 'THIS_FY': {
      // Indian Financial Year: April 1 to March 31
      const year = now.getFullYear();
      const month = now.getMonth(); // 0 = Jan, 3 = Apr
      let fyStartYear = year;
      if (month < 3) {
        fyStartYear = year - 1;
      }
      const firstDay = new Date(fyStartYear, 3, 1);
      const lastDay = new Date(fyStartYear + 1, 2, 31);
      return {
        startDate: formatLocalISODate(firstDay),
        endDate: formatLocalISODate(lastDay),
      };
    }

    default:
      return null;
  }
}

/**
 * Checks whether a given transaction date string (YYYY-MM-DD) falls within the range inclusive.
 */
export function isDateWithinInterval(
  txnDateStr: string,
  startDate?: string | null,
  endDate?: string | null
): boolean {
  if (!txnDateStr) return true;
  // Normalize comparison by taking first 10 characters (YYYY-MM-DD)
  const normalizedTxnDate = txnDateStr.slice(0, 10);

  if (startDate && normalizedTxnDate < startDate) {
    return false;
  }
  if (endDate && normalizedTxnDate > endDate) {
    return false;
  }
  return true;
}

/**
 * User-friendly preset label formatter.
 */
export function getDatePresetLabel(preset: DatePreset): string {
  switch (preset) {
    case 'ALL':
      return 'All Dates';
    case 'TODAY':
      return 'Today';
    case 'YESTERDAY':
      return 'Yesterday';
    case 'THIS_WEEK':
      return 'This Week';
    case 'LAST_WEEK':
      return 'Last Week';
    case 'LAST_7_DAYS':
      return 'Last 7 Days';
    case 'THIS_MONTH':
      return 'This Month';
    case 'LAST_MONTH':
      return 'Last Month';
    case 'THIS_QUARTER':
      return 'This Quarter';
    case 'THIS_FY':
      return 'Financial Year (FY)';
    case 'CUSTOM':
      return 'Custom Interval';
    default:
      return preset;
  }
}
