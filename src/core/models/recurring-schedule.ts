import { MovementType, PaymentRail } from './transaction';

export type ScheduleFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type ScheduleStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface RecurringSplitTemplate {
  readonly id: string;
  readonly method: PaymentRail;
  readonly amountPaise: number; // Stored as integer paise strictly
  readonly paymentReferencePrefix?: string; // Optional prefix, e.g. "AUTO-REC-"
  readonly initiatedBy: 'Lender' | 'Debtor';
}

export interface RecurringSchedule {
  readonly id: string; // Internal Schedule ID: 'RB-SCHED-XXXXXX'
  readonly tenantId: string;
  readonly partyId: string;
  readonly title: string; // Corporate purpose, e.g. "Monthly Commercial Lease Installment"
  readonly type: MovementType; // 'TAKEN' (Collection/Inflow) | 'GIVEN' (Disbursement/Outflow)
  readonly frequency: ScheduleFrequency;
  readonly interval: number; // e.g. 1 (every 1 day/week/month), 2 (bi-weekly)
  readonly dayOfWeek?: number; // 0=Sun, 1=Mon, ..., 6=Sat (for WEEKLY)
  readonly dayOfMonth?: number; // 1 to 31 (for MONTHLY)
  readonly totalAmountPaise: number; // Integer paise strictly (Law 1)
  readonly splits: readonly RecurringSplitTemplate[]; // Reconciled splits (Law 2)
  readonly startDate: string; // ISO 8601 Date: YYYY-MM-DD
  readonly endDate?: string; // ISO 8601 Date: YYYY-MM-DD (optional cutoff)
  readonly nextExecutionDate: string; // ISO 8601 Date: YYYY-MM-DD
  readonly lastExecutedDate?: string; // ISO 8601 Date: YYYY-MM-DD
  readonly executionCount: number;
  readonly maxExecutions?: number; // Optional execution cycle limit
  readonly status: ScheduleStatus;
  readonly notes: string;
  readonly autoProcess: boolean; // Whether the engine auto-creates ledger transactions
  readonly createdAt: string; // ISO 8601 Timestamp
  readonly updatedAt: string; // ISO 8601 Timestamp
  readonly createdBy: string; // Actor identifier
}

export interface RecurringExecutionReport {
  readonly scheduleId: string;
  readonly transactionId: string;
  readonly executionDate: string;
  readonly amountPaise: number;
  readonly success: boolean;
  readonly error?: string;
}

export interface RecurringBatchProcessResult {
  readonly processedCount: number;
  readonly generatedTransactions: readonly RecurringExecutionReport[];
  readonly timestamp: string;
}
