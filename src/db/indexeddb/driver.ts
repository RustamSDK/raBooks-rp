import { LedgerRepository } from '../interface';
import { CounterpartyEntity } from '../../core/models/counterparty';
import { CanonicalTransaction } from '../../core/models/transaction';
import { EmiRestructuringPlan } from '../../core/models/emi-plan';
import { SecurityAuditRecord } from '../../core/models/audit-log';
import {
  RecurringSchedule,
  RecurringBatchProcessResult,
  RecurringExecutionReport,
} from '../../core/models/recurring-schedule';
import {
  isScheduleDue,
  generateCanonicalTransactionFromSchedule,
  advanceScheduleAfterExecution,
  formatDateToIsoDate,
} from '../../core/math/scheduler';
import {
  createEncryptedLedgerBackup,
  decryptLedgerBackup,
  EncryptedBackupEnvelope,
} from '../../core/crypto/backup-crypto';
import {
  DEFAULT_TENANT_ID,
  INITIAL_COUNTERPARTIES,
  INITIAL_TRANSACTIONS,
  INITIAL_EMI_PLANS,
  INITIAL_AUDIT_LOGS,
  INITIAL_RECURRING_SCHEDULES,
} from '../sample-data';

const DB_NAME = 'raBooks_DB_v3';
const DB_VERSION = 2; // Incremented for recurring_schedules store

export class IndexedDbLedgerRepository implements LedgerRepository {
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private isSeeding = false;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized && this.db) {
      return;
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      // Fallback if indexedDB is not available in certain execution contexts
      if (typeof window === 'undefined' || !window.indexedDB) {
        console.warn('IndexedDB is not available in this environment.');
        this.isInitialized = true;
        resolve();
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('parties')) {
          const partyStore = db.createObjectStore('parties', { keyPath: 'id' });
          partyStore.createIndex('tenantId', 'tenantId', { unique: false });
          partyStore.createIndex('phone', 'phone', { unique: false });
        }

        if (!db.objectStoreNames.contains('transactions')) {
          const txnStore = db.createObjectStore('transactions', { keyPath: 'id' });
          txnStore.createIndex('tenantId', 'tenantId', { unique: false });
          txnStore.createIndex('partyId', 'partyId', { unique: false });
          txnStore.createIndex('date', 'date', { unique: false });
        }

        if (!db.objectStoreNames.contains('emi_plans')) {
          const emiStore = db.createObjectStore('emi_plans', { keyPath: 'id' });
          emiStore.createIndex('tenantId', 'tenantId', { unique: false });
          emiStore.createIndex('partyId', 'partyId', { unique: false });
        }

        if (!db.objectStoreNames.contains('recurring_schedules')) {
          const schedStore = db.createObjectStore('recurring_schedules', { keyPath: 'id' });
          schedStore.createIndex('tenantId', 'tenantId', { unique: false });
          schedStore.createIndex('partyId', 'partyId', { unique: false });
          schedStore.createIndex('status', 'status', { unique: false });
          schedStore.createIndex('nextExecutionDate', 'nextExecutionDate', { unique: false });
        }

        if (!db.objectStoreNames.contains('audit_log')) {
          const auditStore = db.createObjectStore('audit_log', {
            keyPath: 'id',
            autoIncrement: true,
          });
          auditStore.createIndex('tenantId', 'tenantId', { unique: false });
          auditStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = async (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.isInitialized = true;

        // Check if database needs initial seeding
        const partiesCount = await this.countStore('parties');
        if (partiesCount === 0) {
          await this.seedInitialData();
        } else {
          // If upgraded from version 1, ensure recurring schedules exist
          const schedCount = await this.countStore('recurring_schedules');
          if (schedCount === 0) {
            for (const sched of INITIAL_RECURRING_SCHEDULES) {
              await this.saveRecurringSchedule(sched);
            }
          }
        }

        resolve();
      };

      request.onerror = () => {
        this.initPromise = null;
        reject(request.error);
      };
    });
  }

  private async countStore(storeName: string): Promise<number> {
    return new Promise((resolve) => {
      if (!this.db) return resolve(0);
      try {
        if (!this.db.objectStoreNames.contains(storeName)) return resolve(0);
        const tx = this.db.transaction(storeName, 'readonly');
        const countReq = tx.objectStore(storeName).count();
        countReq.onsuccess = () => resolve(countReq.result);
        countReq.onerror = () => resolve(0);
      } catch {
        resolve(0);
      }
    });
  }

  private async seedInitialData(): Promise<void> {
    if (!this.db || this.isSeeding) return;
    this.isSeeding = true;

    try {
      for (const party of INITIAL_COUNTERPARTIES) {
        await this.saveParty(party);
      }
      for (const txn of INITIAL_TRANSACTIONS) {
        await this.recordTransaction(txn);
      }
      for (const emi of INITIAL_EMI_PLANS) {
        await this.saveEmiPlan(emi);
      }
      for (const sched of INITIAL_RECURRING_SCHEDULES) {
        await this.saveRecurringSchedule(sched);
      }
      for (const log of INITIAL_AUDIT_LOGS) {
        await this.appendAuditLog(log);
      }
    } finally {
      this.isSeeding = false;
    }
  }

  async getParties(tenantId: string): Promise<CounterpartyEntity[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve([]);
      const tx = this.db.transaction('parties', 'readonly');
      const store = tx.objectStore('parties');
      const request = store.getAll();

      request.onsuccess = () => {
        const all = (request.result as CounterpartyEntity[]) || [];
        resolve(all.filter((p) => p.tenantId === tenantId));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getPartyById(tenantId: string, id: string): Promise<CounterpartyEntity | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve(null);
      const tx = this.db.transaction('parties', 'readonly');
      const store = tx.objectStore('parties');
      const request = store.get(id);

      request.onsuccess = () => {
        const party = request.result as CounterpartyEntity | undefined;
        if (party && party.tenantId === tenantId) {
          resolve(party);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveParty(party: CounterpartyEntity): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve();
      const tx = this.db.transaction('parties', 'readwrite');
      const store = tx.objectStore('parties');
      const request = store.put(party);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteParty(tenantId: string, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve();
      const tx = this.db.transaction('parties', 'readwrite');
      const store = tx.objectStore('parties');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getTransactions(tenantId: string): Promise<CanonicalTransaction[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve([]);
      const tx = this.db.transaction('transactions', 'readonly');
      const store = tx.objectStore('transactions');
      const request = store.getAll();

      request.onsuccess = () => {
        const all = (request.result as CanonicalTransaction[]) || [];
        const filtered = all.filter((t) => t.tenantId === tenantId);
        // Sort descending by date, then createdAt
        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        resolve(filtered);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getTransactionsByParty(tenantId: string, partyId: string): Promise<CanonicalTransaction[]> {
    const txns = await this.getTransactions(tenantId);
    return txns.filter((t) => t.partyId === partyId);
  }

  async recordTransaction(transaction: CanonicalTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve();
      const tx = this.db.transaction('transactions', 'readwrite');
      const store = tx.objectStore('transactions');
      const request = store.put(transaction);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteTransaction(tenantId: string, transactionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve();
      const tx = this.db.transaction('transactions', 'readwrite');
      const store = tx.objectStore('transactions');
      const request = store.delete(transactionId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getEmiPlans(tenantId: string): Promise<EmiRestructuringPlan[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve([]);
      const tx = this.db.transaction('emi_plans', 'readonly');
      const store = tx.objectStore('emi_plans');
      const request = store.getAll();

      request.onsuccess = () => {
        const all = (request.result as EmiRestructuringPlan[]) || [];
        resolve(all.filter((p) => p.tenantId === tenantId));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveEmiPlan(plan: EmiRestructuringPlan): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve();
      const tx = this.db.transaction('emi_plans', 'readwrite');
      const store = tx.objectStore('emi_plans');
      const request = store.put(plan);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateInstallmentStatus(
    tenantId: string,
    planId: string,
    installmentNumber: number,
    status: 'Paid',
    metadata: { paidVia: string; lateFeeChargedPaise: number }
  ): Promise<void> {
    const plans = await this.getEmiPlans(tenantId);
    const plan = plans.find((p) => p.id === planId);
    if (!plan) throw new Error(`ERR_PLAN_NOT_FOUND: EMI Plan ${planId} does not exist.`);

    const updatedInstallments = plan.installments.map((inst) => {
      if (inst.number === installmentNumber) {
        return {
          ...inst,
          status,
          paidDate: new Date().toISOString().split('T')[0],
          paidVia: metadata.paidVia,
          lateFeeChargedPaise: metadata.lateFeeChargedPaise,
        };
      }
      return inst;
    });

    const allPaid = updatedInstallments.every((i) => i.status === 'Paid');
    const updatedPlan: EmiRestructuringPlan = {
      ...plan,
      status: allPaid ? 'Settled' : 'Active',
      installments: updatedInstallments,
    };

    await this.saveEmiPlan(updatedPlan);
  }

  // Recurring Schedule Operations
  async getRecurringSchedules(tenantId: string): Promise<RecurringSchedule[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve([]);
      if (!this.db.objectStoreNames.contains('recurring_schedules')) return resolve([]);
      const tx = this.db.transaction('recurring_schedules', 'readonly');
      const store = tx.objectStore('recurring_schedules');
      const request = store.getAll();

      request.onsuccess = () => {
        const all = (request.result as RecurringSchedule[]) || [];
        resolve(all.filter((s) => s.tenantId === tenantId));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getRecurringScheduleById(tenantId: string, id: string): Promise<RecurringSchedule | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve(null);
      if (!this.db.objectStoreNames.contains('recurring_schedules')) return resolve(null);
      const tx = this.db.transaction('recurring_schedules', 'readonly');
      const store = tx.objectStore('recurring_schedules');
      const request = store.get(id);

      request.onsuccess = () => {
        const schedule = request.result as RecurringSchedule | undefined;
        if (schedule && schedule.tenantId === tenantId) {
          resolve(schedule);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveRecurringSchedule(schedule: RecurringSchedule): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve();
      const tx = this.db.transaction('recurring_schedules', 'readwrite');
      const store = tx.objectStore('recurring_schedules');
      const request = store.put(schedule);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteRecurringSchedule(tenantId: string, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve();
      const tx = this.db.transaction('recurring_schedules', 'readwrite');
      const store = tx.objectStore('recurring_schedules');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Executes a specific recurring schedule immediately on demand, creating a canonical transaction,
   * advancing the schedule date, and appending an immutable audit trail entry.
   */
  async executeRecurringScheduleNow(
    tenantId: string,
    scheduleId: string,
    asOfDate?: string
  ): Promise<RecurringExecutionReport> {
    const schedule = await this.getRecurringScheduleById(tenantId, scheduleId);
    if (!schedule) {
      throw new Error(`ERR_SCHEDULE_NOT_FOUND: Recurring schedule ${scheduleId} was not found.`);
    }

    const executionDate = asOfDate || schedule.nextExecutionDate;

    try {
      const canonicalTxn = generateCanonicalTransactionFromSchedule(schedule, executionDate);
      await this.recordTransaction(canonicalTxn);

      const advancedSchedule = advanceScheduleAfterExecution(schedule, executionDate);
      await this.saveRecurringSchedule(advancedSchedule);

      await this.appendAuditLog({
        tenantId,
        timestamp: new Date().toISOString(),
        actor: 'scheduler@rabooks.system',
        action: 'EXECUTE_RECURRING_TRANSACTION',
        target: canonicalTxn.id,
        details: `Automated ${schedule.frequency} execution for schedule "${schedule.title}" (${schedule.id}). Created transaction ${canonicalTxn.id} (₹${(canonicalTxn.totalAmountPaise / 100).toFixed(2)}). Next due: ${advancedSchedule.nextExecutionDate}.`,
      });

      return {
        scheduleId: schedule.id,
        transactionId: canonicalTxn.id,
        executionDate,
        amountPaise: canonicalTxn.totalAmountPaise,
        success: true,
      };
    } catch (err: any) {
      return {
        scheduleId: schedule.id,
        transactionId: '',
        executionDate,
        amountPaise: schedule.totalAmountPaise,
        success: false,
        error: err.message || 'Unknown error during recurring execution',
      };
    }
  }

  /**
   * Batch processes all active recurring schedules that are due as of the target date.
   */
  async processDueRecurringSchedules(
    tenantId: string,
    asOfDate?: string
  ): Promise<RecurringBatchProcessResult> {
    const todayStr = asOfDate || formatDateToIsoDate(new Date());
    const schedules = await this.getRecurringSchedules(tenantId);
    const activeDueSchedules = schedules.filter(
      (s) => s.status === 'ACTIVE' && isScheduleDue(s, todayStr)
    );

    const reports: RecurringExecutionReport[] = [];

    for (const sched of activeDueSchedules) {
      // Execute each due cycle
      const report = await this.executeRecurringScheduleNow(tenantId, sched.id, sched.nextExecutionDate);
      reports.push(report);
    }

    return {
      processedCount: reports.filter((r) => r.success).length,
      generatedTransactions: reports,
      timestamp: new Date().toISOString(),
    };
  }

  async getAuditLogs(tenantId: string): Promise<SecurityAuditRecord[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve([]);
      const tx = this.db.transaction('audit_log', 'readonly');
      const store = tx.objectStore('audit_log');
      const request = store.getAll();

      request.onsuccess = () => {
        const all = (request.result as SecurityAuditRecord[]) || [];
        const filtered = all.filter((l) => l.tenantId === tenantId);
        filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        resolve(filtered);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async appendAuditLog(entry: SecurityAuditRecord): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve();
      const tx = this.db.transaction('audit_log', 'readwrite');
      const store = tx.objectStore('audit_log');
      const request = store.add(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async exportCompleteSnapshot(tenantId: string): Promise<Record<string, unknown>> {
    const parties = await this.getParties(tenantId);
    const transactions = await this.getTransactions(tenantId);
    const emiPlans = await this.getEmiPlans(tenantId);
    const recurringSchedules = await this.getRecurringSchedules(tenantId);
    const auditLogs = await this.getAuditLogs(tenantId);

    return {
      version: '4.0.0-INDUSTRIAL-ENTERPRISE',
      tenantId,
      exportedAt: new Date().toISOString(),
      parties,
      transactions,
      emiPlans,
      recurringSchedules,
      auditLogs,
    };
  }

  async exportEncryptedBackup(
    tenantId: string,
    passphrase: string,
    passwordHint?: string
  ): Promise<string> {
    const rawSnapshot = await this.exportCompleteSnapshot(tenantId);
    const envelope = await createEncryptedLedgerBackup(rawSnapshot, passphrase, passwordHint);

    await this.appendAuditLog({
      tenantId,
      timestamp: new Date().toISOString(),
      actor: 'user@rabooks.internal',
      action: 'EXPORT_ENCRYPTED_BACKUP',
      target: 'COLD_STORAGE_BACKUP',
      details: `Generated AES-256-GCM encrypted cold storage backup archive containing ${(rawSnapshot.parties as any[]).length} parties and ${(rawSnapshot.transactions as any[]).length} transactions.`,
    });

    return JSON.stringify(envelope, null, 2);
  }

  async restoreEncryptedBackup(
    tenantId: string,
    encryptedJsonStr: string,
    passphrase: string
  ): Promise<{ partyCount: number; transactionCount: number }> {
    let envelope: EncryptedBackupEnvelope;
    try {
      envelope = JSON.parse(encryptedJsonStr);
    } catch {
      throw new Error('Invalid JSON format. Please supply a valid raBooks backup file.');
    }

    const decryptedData = await decryptLedgerBackup(envelope, passphrase);
    await this.restoreSnapshot(tenantId, decryptedData);

    const parties = Array.isArray(decryptedData.parties) ? decryptedData.parties.length : 0;
    const txns = Array.isArray(decryptedData.transactions) ? decryptedData.transactions.length : 0;

    await this.appendAuditLog({
      tenantId,
      timestamp: new Date().toISOString(),
      actor: 'user@rabooks.internal',
      action: 'RESTORE_ENCRYPTED_BACKUP',
      target: 'COLD_STORAGE_RESTORE',
      details: `Successfully authenticated, decrypted, and restored ledger state from encrypted cold storage backup (${parties} parties, ${txns} transactions).`,
    });

    return {
      partyCount: parties,
      transactionCount: txns,
    };
  }

  async restoreSnapshot(tenantId: string, data: Record<string, unknown>): Promise<void> {
    if (!this.db) return;

    // Clear existing
    await this.clearStore('parties');
    await this.clearStore('transactions');
    await this.clearStore('emi_plans');
    await this.clearStore('recurring_schedules');
    await this.clearStore('audit_log');

    const parties = (data.parties as CounterpartyEntity[]) || [];
    const transactions = (data.transactions as CanonicalTransaction[]) || [];
    const emiPlans = (data.emiPlans as EmiRestructuringPlan[]) || [];
    const recurringSchedules = (data.recurringSchedules as RecurringSchedule[]) || [];
    const auditLogs = (data.auditLogs as SecurityAuditRecord[]) || [];

    for (const p of parties) await this.saveParty(p);
    for (const t of transactions) await this.recordTransaction(t);
    for (const e of emiPlans) await this.saveEmiPlan(e);
    for (const s of recurringSchedules) await this.saveRecurringSchedule(s);
    for (const a of auditLogs) await this.appendAuditLog(a);

    await this.appendAuditLog({
      tenantId,
      timestamp: new Date().toISOString(),
      actor: 'admin@rabooks.internal',
      action: 'SNAPSHOT_RESTORE',
      target: 'raBooks_DB_v3',
      details: `Restored snapshot containing ${parties.length} parties, ${transactions.length} transactions, ${emiPlans.length} EMI plans, and ${recurringSchedules.length} recurring schedules.`,
    });
  }

  async resetToSampleData(tenantId: string): Promise<void> {
    await this.clearStore('parties');
    await this.clearStore('transactions');
    await this.clearStore('emi_plans');
    await this.clearStore('recurring_schedules');
    await this.clearStore('audit_log');
    await this.seedInitialData();

    await this.appendAuditLog({
      tenantId,
      timestamp: new Date().toISOString(),
      actor: 'admin@rabooks.internal',
      action: 'DATABASE_RESET',
      target: 'raBooks_DB_v3',
      details: 'Reset system database to institutional seed fixtures.',
    });
  }

  private async clearStore(storeName: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.db) return resolve();
      try {
        if (!this.db.objectStoreNames.contains(storeName)) return resolve();
        const tx = this.db.transaction(storeName, 'readwrite');
        const req = tx.objectStore(storeName).clear();
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}
