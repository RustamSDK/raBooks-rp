import { CanonicalTransaction } from '../core/models/transaction';
import { EmiRestructuringPlan } from '../core/models/emi-plan';
import { CounterpartyEntity } from '../core/models/counterparty';
import { SecurityAuditRecord } from '../core/models/audit-log';
import {
  RecurringSchedule,
  RecurringBatchProcessResult,
  RecurringExecutionReport,
} from '../core/models/recurring-schedule';

export type DatabaseDriverType = 'indexeddb' | 'postgres' | 'mongodb' | 'sheets';

export interface DatabaseDriverConfig {
  type: DatabaseDriverType;
  name: string;
  status: 'connected' | 'simulated' | 'disconnected';
  connectionString?: string;
  webhookUrl?: string;
}

export interface LedgerRepository {
  initialize(): Promise<void>;

  // Counterparty Operations
  getParties(tenantId: string): Promise<CounterpartyEntity[]>;
  getPartyById(tenantId: string, id: string): Promise<CounterpartyEntity | null>;
  saveParty(party: CounterpartyEntity): Promise<void>;
  deleteParty(tenantId: string, id: string): Promise<void>;

  // Transaction Operations
  getTransactions(tenantId: string): Promise<CanonicalTransaction[]>;
  getTransactionsByParty(tenantId: string, partyId: string): Promise<CanonicalTransaction[]>;
  recordTransaction(transaction: CanonicalTransaction): Promise<void>;
  deleteTransaction(tenantId: string, transactionId: string): Promise<void>;

  // EMI Debt Restructuring
  getEmiPlans(tenantId: string): Promise<EmiRestructuringPlan[]>;
  saveEmiPlan(plan: EmiRestructuringPlan): Promise<void>;
  updateInstallmentStatus(
    tenantId: string,
    planId: string,
    installmentNumber: number,
    status: 'Paid',
    metadata: { paidVia: string; lateFeeChargedPaise: number }
  ): Promise<void>;

  // Recurring Transaction Scheduling Operations
  getRecurringSchedules(tenantId: string): Promise<RecurringSchedule[]>;
  getRecurringScheduleById(tenantId: string, id: string): Promise<RecurringSchedule | null>;
  saveRecurringSchedule(schedule: RecurringSchedule): Promise<void>;
  deleteRecurringSchedule(tenantId: string, id: string): Promise<void>;
  executeRecurringScheduleNow(tenantId: string, scheduleId: string, asOfDate?: string): Promise<RecurringExecutionReport>;
  processDueRecurringSchedules(tenantId: string, asOfDate?: string): Promise<RecurringBatchProcessResult>;

  // Non-Repudiation Audit Logs
  getAuditLogs(tenantId: string): Promise<SecurityAuditRecord[]>;
  appendAuditLog(entry: SecurityAuditRecord): Promise<void>;

  // Snapshot & Data Migration
  exportCompleteSnapshot(tenantId: string): Promise<Record<string, unknown>>;
  restoreSnapshot(tenantId: string, data: Record<string, unknown>): Promise<void>;
  exportEncryptedBackup(tenantId: string, passphrase: string, passwordHint?: string): Promise<string>;
  restoreEncryptedBackup(
    tenantId: string,
    encryptedJsonStr: string,
    passphrase: string
  ): Promise<{ partyCount: number; transactionCount: number }>;
  resetToSampleData(tenantId: string): Promise<void>;
}
