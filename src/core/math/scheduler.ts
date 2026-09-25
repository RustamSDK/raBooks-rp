import { CanonicalTransaction, PaymentSplitAllocation } from '../models/transaction';
import {
  RecurringSchedule,
  RecurringSplitTemplate,
  ScheduleFrequency,
} from '../models/recurring-schedule';
import { validateTransactionInvariants } from '../validation/invariants';

/**
 * Calculates the total days in a given month of a given year (handles leap years).
 */
export function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Formats a Date object to ISO 8601 Date string (YYYY-MM-DD) in UTC or local standard.
 */
export function formatDateToIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses an ISO 8601 Date string (YYYY-MM-DD) into a Date object at midday to avoid DST drift.
 */
export function parseIsoDate(dateStr: string): Date {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  return new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10), 12, 0, 0);
}

/**
 * Deterministically computes the next execution date following a given reference date.
 * Clamps days of month to month limits (e.g. 31st of Jan -> 28th/29th of Feb).
 */
export function calculateNextExecutionDate(
  currentDateStr: string,
  frequency: ScheduleFrequency,
  interval: number = 1,
  dayOfMonth?: number,
  dayOfWeek?: number
): string {
  const curr = parseIsoDate(currentDateStr);
  const safeInterval = Math.max(1, Math.floor(interval));

  if (frequency === 'DAILY') {
    curr.setDate(curr.getDate() + safeInterval);
    return formatDateToIsoDate(curr);
  }

  if (frequency === 'WEEKLY') {
    curr.setDate(curr.getDate() + safeInterval * 7);
    if (dayOfWeek !== undefined && dayOfWeek >= 0 && dayOfWeek <= 6) {
      const currentDay = curr.getDay();
      const diff = dayOfWeek - currentDay;
      curr.setDate(curr.getDate() + diff);
    }
    return formatDateToIsoDate(curr);
  }

  if (frequency === 'MONTHLY') {
    const currentYear = curr.getFullYear();
    const currentMonth = curr.getMonth();
    const targetMonth = currentMonth + safeInterval;
    const targetYear = currentYear + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;

    const maxDays = getDaysInMonth(targetYear, normalizedMonth);
    const targetDay = dayOfMonth !== undefined && dayOfMonth >= 1 ? Math.min(dayOfMonth, maxDays) : Math.min(curr.getDate(), maxDays);

    const nextDate = new Date(targetYear, normalizedMonth, targetDay, 12, 0, 0);
    return formatDateToIsoDate(nextDate);
  }

  // Default fallback
  curr.setDate(curr.getDate() + 1);
  return formatDateToIsoDate(curr);
}

/**
 * Evaluates whether a schedule is currently due for automated execution.
 */
export function isScheduleDue(schedule: RecurringSchedule, asOfDateStr: string): boolean {
  if (schedule.status !== 'ACTIVE') {
    return false;
  }

  // Check if maximum execution quota was already achieved
  if (schedule.maxExecutions !== undefined && schedule.executionCount >= schedule.maxExecutions) {
    return false;
  }

  // Check if expiration date has passed
  if (schedule.endDate && schedule.nextExecutionDate > schedule.endDate) {
    return false;
  }

  // Due if nextExecutionDate <= asOfDateStr
  return schedule.nextExecutionDate <= asOfDateStr;
}

/**
 * Converts recurring split templates into concrete payment split allocations with decoupled rail references.
 */
export function materializePaymentSplits(
  templates: readonly RecurringSplitTemplate[],
  executionDateStr: string,
  scheduleId: string,
  cycleNumber: number
): readonly PaymentSplitAllocation[] {
  const cleanDate = executionDateStr.replace(/-/g, '');
  const schedSuffix = scheduleId.replace(/[^a-zA-Z0-9]/g, '').slice(-4);

  return templates.map((tpl, idx) => {
    const randomHex = Math.floor(1000 + Math.random() * 9000).toString();
    const prefix = tpl.paymentReferencePrefix || (tpl.method === 'UPI' ? 'UPI-AUTOPAY' : tpl.method === 'Bank' ? 'NEFT-AUTO' : 'VOUCH');
    const paymentReferenceId = `${prefix}-${cleanDate}-${schedSuffix}-C${cycleNumber}-${idx + 1}-${randomHex}`;

    return {
      id: `spl-rec-${Date.now()}-${idx + 1}-${randomHex}`,
      method: tpl.method,
      amountPaise: tpl.amountPaise,
      paymentReferenceId,
      initiatedBy: tpl.initiatedBy,
      confirmed: true,
    };
  });
}

/**
 * Constructs a fully reconciled CanonicalTransaction from a recurring schedule.
 * Enforces Law 1 (Integer Math), Law 2 (Split Parity), and Law 3 (Dual-ID Decoupling).
 */
export function generateCanonicalTransactionFromSchedule(
  schedule: RecurringSchedule,
  executionDateStr: string
): CanonicalTransaction {
  const nextCycle = schedule.executionCount + 1;
  const randomHex = Math.floor(100000 + Math.random() * 900000).toString();
  const internalTxnId = `RB-TXN-REC-${randomHex}`;

  const splits = materializePaymentSplits(
    schedule.splits,
    executionDateStr,
    schedule.id,
    nextCycle
  );

  const defaultNote =
    schedule.notes.trim() ||
    `Automated ${schedule.frequency.toLowerCase()} schedule: ${schedule.title} (Cycle ${nextCycle})`;

  const canonicalTxn: CanonicalTransaction = {
    id: internalTxnId,
    tenantId: schedule.tenantId,
    partyId: schedule.partyId,
    type: schedule.type,
    totalAmountPaise: schedule.totalAmountPaise,
    date: executionDateStr,
    notes: defaultNote,
    status: 'Confirmed',
    splits,
    createdAt: new Date().toISOString(),
    createdBy: 'scheduler@rabooks.system',
  };

  const validation = validateTransactionInvariants(canonicalTxn);
  if (!validation.valid) {
    throw new Error(
      `Accounting integrity violation in recurring generation: ${validation.errors.join('; ')}`
    );
  }

  return canonicalTxn;
}

/**
 * Advances the schedule's state after a verified transaction execution.
 * If maximum iterations or end date are reached, transitions status to 'COMPLETED'.
 */
export function advanceScheduleAfterExecution(
  schedule: RecurringSchedule,
  executedDateStr: string
): RecurringSchedule {
  const newCount = schedule.executionCount + 1;
  const isMaxReached = schedule.maxExecutions !== undefined && newCount >= schedule.maxExecutions;

  const nextDate = calculateNextExecutionDate(
    executedDateStr,
    schedule.frequency,
    schedule.interval,
    schedule.dayOfMonth,
    schedule.dayOfWeek
  );

  const isExpired = schedule.endDate !== undefined && nextDate > schedule.endDate;
  const newStatus = isMaxReached || isExpired ? 'COMPLETED' : schedule.status;

  return {
    ...schedule,
    executionCount: newCount,
    lastExecutedDate: executedDateStr,
    nextExecutionDate: nextDate,
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };
}
