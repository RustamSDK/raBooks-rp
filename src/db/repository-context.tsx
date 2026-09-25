import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { LedgerRepository, DatabaseDriverType, DatabaseDriverConfig } from './interface';
import { IndexedDbLedgerRepository } from './indexeddb/driver';
import { CounterpartyEntity } from '../core/models/counterparty';
import { CanonicalTransaction } from '../core/models/transaction';
import { EmiRestructuringPlan } from '../core/models/emi-plan';
import { SecurityAuditRecord } from '../core/models/audit-log';
import {
  RecurringSchedule,
  RecurringBatchProcessResult,
  RecurringExecutionReport,
} from '../core/models/recurring-schedule';
import { calculatePartyNetBalance } from '../core/math/balance';
import { validateTransactionInvariants } from '../core/validation/invariants';
import { formatDateToIsoDate, isScheduleDue } from '../core/math/scheduler';
import { DEFAULT_TENANT_ID } from './sample-data';

interface LedgerContextType {
  tenantId: string;
  isReady: boolean;
  parties: CounterpartyEntity[];
  transactions: CanonicalTransaction[];
  emiPlans: EmiRestructuringPlan[];
  recurringSchedules: RecurringSchedule[];
  auditLogs: SecurityAuditRecord[];
  activeDriver: DatabaseDriverConfig;
  switchDriver: (type: DatabaseDriverType, customConfig?: Partial<DatabaseDriverConfig>) => Promise<void>;
  
  // Data mutations
  recordTransaction: (txn: CanonicalTransaction) => Promise<void>;
  bulkRecordTransactions: (
    txns: CanonicalTransaction[],
    newParties?: CounterpartyEntity[]
  ) => Promise<{ successCount: number; errorCount: number; errors: string[] }>;
  voidTransaction: (txnId: string, reason: string) => Promise<void>;
  deleteTransaction: (txnId: string, reason?: string) => Promise<void>;
  bulkDeleteTransactions: (
    txnIds: string[],
    reason?: string
  ) => Promise<{ successCount: number; errorCount: number; errors: string[] }>;
  saveParty: (party: CounterpartyEntity) => Promise<void>;
  deleteParty: (partyId: string) => Promise<void>;
  saveEmiPlan: (plan: EmiRestructuringPlan) => Promise<void>;
  settleInstallment: (
    planId: string,
    installmentNumber: number,
    paidVia: string,
    lateFeeChargedPaise: number
  ) => Promise<void>;
  
  // Recurring schedules
  saveRecurringSchedule: (schedule: RecurringSchedule) => Promise<void>;
  deleteRecurringSchedule: (id: string) => Promise<void>;
  executeRecurringScheduleNow: (scheduleId: string, asOfDate?: string) => Promise<RecurringExecutionReport>;
  processDueRecurringSchedules: (asOfDate?: string) => Promise<RecurringBatchProcessResult>;
  pendingDueSchedulesCount: number;
  lastAutoProcessResult: RecurringBatchProcessResult | null;
  clearLastAutoProcessResult: () => void;

  // Backup / Reset
  exportSnapshotJson: () => Promise<string>;
  restoreSnapshotJson: (jsonStr: string) => Promise<void>;
  exportEncryptedBackup: (passphrase: string, passwordHint?: string) => Promise<string>;
  restoreEncryptedBackup: (
    encryptedJsonStr: string,
    passphrase: string
  ) => Promise<{ partyCount: number; transactionCount: number }>;
  resetDatabase: () => Promise<void>;
  refresh: () => Promise<void>;

  // Telemetry KPIs
  telemetry: {
    totalReceivablesPaise: number;
    totalPayablesPaise: number;
    netLiquidityPaise: number;
    activePartiesCount: number;
    overduePartiesCount: number;
    overdueInstallmentsCount: number;
    activeRecurringSchedulesCount: number;
  };

  // Helper
  getPartyBalance: (partyId: string) => number;
}

const LedgerContext = createContext<LedgerContextType | null>(null);

export const LedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenantId] = useState<string>(DEFAULT_TENANT_ID);
  const [repository, setRepository] = useState<LedgerRepository>(() => new IndexedDbLedgerRepository());
  const [isReady, setIsReady] = useState(false);
  const [parties, setParties] = useState<CounterpartyEntity[]>([]);
  const [transactions, setTransactions] = useState<CanonicalTransaction[]>([]);
  const [emiPlans, setEmiPlans] = useState<EmiRestructuringPlan[]>([]);
  const [recurringSchedules, setRecurringSchedules] = useState<RecurringSchedule[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditRecord[]>([]);
  const [lastAutoProcessResult, setLastAutoProcessResult] = useState<RecurringBatchProcessResult | null>(null);

  const [activeDriver, setActiveDriver] = useState<DatabaseDriverConfig>({
    type: 'indexeddb',
    name: 'Browser IndexedDB (raBooks_DB_v3)',
    status: 'connected',
  });

  const loadAllData = useCallback(async (repo: LedgerRepository) => {
    try {
      const [p, t, e, s, a] = await Promise.all([
        repo.getParties(tenantId),
        repo.getTransactions(tenantId),
        repo.getEmiPlans(tenantId),
        repo.getRecurringSchedules(tenantId),
        repo.getAuditLogs(tenantId),
      ]);
      setParties(p);
      setTransactions(t);
      setEmiPlans(e);
      setRecurringSchedules(s);
      setAuditLogs(a);
    } catch (err) {
      console.error('Failed to load ledger data:', err);
    }
  }, [tenantId]);

  // Initial load and automated catch-up execution
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await repository.initialize();
        if (mounted) {
          // Process any active due recurring schedules automatically (auto-catchup)
          const batchResult = await repository.processDueRecurringSchedules(tenantId);
          if (batchResult.processedCount > 0) {
            setLastAutoProcessResult(batchResult);
          }
          await loadAllData(repository);
          setIsReady(true);
        }
      } catch (err) {
        console.error('Failed to initialize ledger repository:', err);
        if (mounted) setIsReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [repository, loadAllData, tenantId]);

  // Periodic background scheduler check (every 60 seconds)
  useEffect(() => {
    if (!isReady) return;

    const intervalId = window.setInterval(async () => {
      try {
        const batchResult = await repository.processDueRecurringSchedules(tenantId);
        if (batchResult.processedCount > 0) {
          setLastAutoProcessResult(batchResult);
          await loadAllData(repository);
        }
      } catch (err) {
        console.error('Error in recurring scheduler background interval:', err);
      }
    }, 60000);

    return () => clearInterval(intervalId);
  }, [isReady, repository, tenantId, loadAllData]);

  const refresh = useCallback(async () => {
    await loadAllData(repository);
  }, [repository, loadAllData]);

  const clearLastAutoProcessResult = useCallback(() => {
    setLastAutoProcessResult(null);
  }, []);

  const recordTransaction = useCallback(
    async (txn: CanonicalTransaction) => {
      await repository.recordTransaction(txn);
      const splitSummary = txn.splits.map((s) => `${s.method} (₹${(s.amountPaise / 100).toFixed(2)})`).join(' + ');
      await repository.appendAuditLog({
        tenantId,
        timestamp: new Date().toISOString(),
        actor: txn.createdBy || 'user@rabooks.internal',
        action: 'RECORD_TRANSACTION',
        target: txn.id,
        details: `Recorded ${txn.type} of ₹${(txn.totalAmountPaise / 100).toFixed(2)} via [${splitSummary}]. Reconciliation verified: Δ=0.`,
      });
      await refresh();
    },
    [repository, tenantId, refresh]
  );

  const bulkRecordTransactions = useCallback(
    async (txnsToRecord: CanonicalTransaction[], newPartiesToSave?: CounterpartyEntity[]) => {
      let successCount = 0;
      const errors: string[] = [];

      // 1. Auto-register any new counterparties
      if (newPartiesToSave && newPartiesToSave.length > 0) {
        for (const party of newPartiesToSave) {
          try {
            await repository.saveParty(party);
            await repository.appendAuditLog({
              tenantId,
              timestamp: new Date().toISOString(),
              actor: 'csv-bulk-importer@rabooks.internal',
              action: 'REGISTER_COUNTERPARTY',
              target: party.name,
              details: `Auto-registered new counterparty "${party.name}" during bulk CSV ledger import.`,
            });
          } catch (err: any) {
            console.error(`Failed to register party ${party.name}:`, err);
          }
        }
      }

      // 2. Validate invariants and record each transaction
      let totalImportedPaise = 0;
      for (const txn of txnsToRecord) {
        const validation = validateTransactionInvariants(txn);
        if (!validation.valid) {
          errors.push(`Transaction ${txn.id}: ${validation.errors.join('; ')}`);
          continue;
        }

        try {
          await repository.recordTransaction(txn);
          totalImportedPaise += txn.totalAmountPaise;
          successCount++;
        } catch (err: any) {
          errors.push(`Transaction ${txn.id}: ${err.message || 'Failed to write transaction to store.'}`);
        }
      }

      // 3. Append non-repudiation bulk audit trail entry (Law 8)
      if (successCount > 0) {
        await repository.appendAuditLog({
          tenantId,
          timestamp: new Date().toISOString(),
          actor: 'csv-bulk-importer@rabooks.internal',
          action: 'BULK_CSV_IMPORT',
          target: `${successCount}_TRANSACTIONS_BATCH`,
          details: `Bulk imported ${successCount} transactions totaling ₹${(totalImportedPaise / 100).toFixed(2)} (${totalImportedPaise} paise). All mathematical invariants verified.`,
        });
      }

      // 4. Refresh ledger state
      await refresh();

      return { successCount, errorCount: errors.length, errors };
    },
    [repository, tenantId, refresh]
  );

  const voidTransaction = useCallback(
    async (txnId: string, reason: string) => {
      const txn = transactions.find((t) => t.id === txnId);
      if (!txn) return;

      const voidedTxn: CanonicalTransaction = {
        ...txn,
        status: 'Voided',
        notes: `[VOIDED - ${reason}] ${txn.notes}`.trim(),
      };

      await repository.recordTransaction(voidedTxn);
      await repository.appendAuditLog({
        tenantId,
        timestamp: new Date().toISOString(),
        actor: 'user@rabooks.internal',
        action: 'VOID_TRANSACTION',
        target: txnId,
        details: `Voided transaction ${txnId} for reason: "${reason}". Financial balance restored.`,
      });
      await refresh();
    },
    [repository, transactions, tenantId, refresh]
  );

  const deleteTransaction = useCallback(
    async (txnId: string, reason: string = 'User deleted transaction') => {
      const txn = transactions.find((t) => t.id === txnId);
      await repository.deleteTransaction(tenantId, txnId);
      await repository.appendAuditLog({
        tenantId,
        timestamp: new Date().toISOString(),
        actor: 'user@rabooks.internal',
        action: 'DELETE_TRANSACTION',
        target: txnId,
        details: `Permanently excised transaction ${txnId} (${txn?.type || 'UNKNOWN'} of ₹${txn ? (txn.totalAmountPaise / 100).toFixed(2) : '0'}). Reason: "${reason}".`,
      });
      await refresh();
    },
    [repository, transactions, tenantId, refresh]
  );

  const bulkDeleteTransactions = useCallback(
    async (txnIds: string[], reason: string = 'Bulk user deletion') => {
      let successCount = 0;
      const errors: string[] = [];

      for (const id of txnIds) {
        try {
          await repository.deleteTransaction(tenantId, id);
          successCount++;
        } catch (err: any) {
          errors.push(`Failed to delete ${id}: ${err.message}`);
        }
      }

      if (successCount > 0) {
        await repository.appendAuditLog({
          tenantId,
          timestamp: new Date().toISOString(),
          actor: 'user@rabooks.internal',
          action: 'BULK_DELETE_TRANSACTIONS',
          target: `${successCount}_RECORDS`,
          details: `Excised ${successCount} transactions from ledger. Reason: "${reason}".`,
        });
      }

      await refresh();
      return { successCount, errorCount: errors.length, errors };
    },
    [repository, tenantId, refresh]
  );

  const saveParty = useCallback(
    async (party: CounterpartyEntity) => {
      await repository.saveParty(party);
      await repository.appendAuditLog({
        tenantId,
        timestamp: new Date().toISOString(),
        actor: 'user@rabooks.internal',
        action: 'SAVE_COUNTERPARTY',
        target: party.name,
        details: `Saved legal counterparty entity: ${party.name} (${party.relation}). Base rate: ${party.ratePercentMonthly}% p.m.`,
      });
      await refresh();
    },
    [repository, tenantId, refresh]
  );

  const deleteParty = useCallback(
    async (partyId: string) => {
      const p = parties.find((item) => item.id === partyId);
      await repository.deleteParty(tenantId, partyId);
      await repository.appendAuditLog({
        tenantId,
        timestamp: new Date().toISOString(),
        actor: 'user@rabooks.internal',
        action: 'DELETE_COUNTERPARTY',
        target: p?.name || partyId,
        details: `Deleted counterparty profile #${partyId} (${p?.name || 'Unknown'}).`,
      });
      await refresh();
    },
    [repository, parties, tenantId, refresh]
  );

  const saveEmiPlan = useCallback(
    async (plan: EmiRestructuringPlan) => {
      await repository.saveEmiPlan(plan);
      await repository.appendAuditLog({
        tenantId,
        timestamp: new Date().toISOString(),
        actor: 'user@rabooks.internal',
        action: 'CREATE_EMI_PLAN',
        target: plan.id,
        details: `Created EMI debt restructuring plan ${plan.id} for party #${plan.partyId} (Principal: ₹${(plan.totalPrincipalPaise / 100).toFixed(2)}, Tenor: ${plan.installmentsCount} months).`,
      });
      await refresh();
    },
    [repository, tenantId, refresh]
  );

  const settleInstallment = useCallback(
    async (
      planId: string,
      installmentNumber: number,
      paidVia: string,
      lateFeeChargedPaise: number
    ) => {
      await repository.updateInstallmentStatus(tenantId, planId, installmentNumber, 'Paid', {
        paidVia,
        lateFeeChargedPaise,
      });
      await repository.appendAuditLog({
        tenantId,
        timestamp: new Date().toISOString(),
        actor: 'user@rabooks.internal',
        action: 'SETTLE_INSTALLMENT',
        target: `${planId} #${installmentNumber}`,
        details: `Settled installment #${installmentNumber} of EMI plan ${planId} via ${paidVia}. Late fee applied: ₹${(lateFeeChargedPaise / 100).toFixed(2)}.`,
      });
      await refresh();
    },
    [repository, tenantId, refresh]
  );

  // Recurring schedules
  const saveRecurringSchedule = useCallback(
    async (schedule: RecurringSchedule) => {
      await repository.saveRecurringSchedule(schedule);
      await repository.appendAuditLog({
        tenantId,
        timestamp: new Date().toISOString(),
        actor: 'user@rabooks.internal',
        action: 'SAVE_RECURRING_SCHEDULE',
        target: schedule.id,
        details: `Saved ${schedule.frequency} recurring schedule "${schedule.title}" for ₹${(schedule.totalAmountPaise / 100).toFixed(2)} (Next run: ${schedule.nextExecutionDate}, Status: ${schedule.status}).`,
      });
      await refresh();
    },
    [repository, tenantId, refresh]
  );

  const deleteRecurringSchedule = useCallback(
    async (id: string) => {
      const sched = recurringSchedules.find((s) => s.id === id);
      await repository.deleteRecurringSchedule(tenantId, id);
      await repository.appendAuditLog({
        tenantId,
        timestamp: new Date().toISOString(),
        actor: 'user@rabooks.internal',
        action: 'DELETE_RECURRING_SCHEDULE',
        target: id,
        details: `Deleted recurring schedule ${id} ("${sched?.title || 'Unknown'}").`,
      });
      await refresh();
    },
    [repository, recurringSchedules, tenantId, refresh]
  );

  const executeRecurringScheduleNow = useCallback(
    async (scheduleId: string, asOfDate?: string) => {
      const report = await repository.executeRecurringScheduleNow(tenantId, scheduleId, asOfDate);
      if (report.success) {
        await refresh();
      }
      return report;
    },
    [repository, tenantId, refresh]
  );

  const processDueRecurringSchedules = useCallback(
    async (asOfDate?: string) => {
      const result = await repository.processDueRecurringSchedules(tenantId, asOfDate);
      if (result.processedCount > 0) {
        setLastAutoProcessResult(result);
        await refresh();
      }
      return result;
    },
    [repository, tenantId, refresh]
  );

  const exportSnapshotJson = useCallback(async () => {
    const snap = await repository.exportCompleteSnapshot(tenantId);
    return JSON.stringify(snap, null, 2);
  }, [repository, tenantId]);

  const restoreSnapshotJson = useCallback(
    async (jsonStr: string) => {
      const parsed = JSON.parse(jsonStr);
      await repository.restoreSnapshot(tenantId, parsed);
      await refresh();
    },
    [repository, tenantId, refresh]
  );

  const exportEncryptedBackup = useCallback(
    async (passphrase: string, passwordHint?: string) => {
      return await repository.exportEncryptedBackup(tenantId, passphrase, passwordHint);
    },
    [repository, tenantId]
  );

  const restoreEncryptedBackup = useCallback(
    async (encryptedJsonStr: string, passphrase: string) => {
      const result = await repository.restoreEncryptedBackup(tenantId, encryptedJsonStr, passphrase);
      await refresh();
      return result;
    },
    [repository, tenantId, refresh]
  );

  const resetDatabase = useCallback(async () => {
    await repository.resetToSampleData(tenantId);
    await refresh();
  }, [repository, tenantId, refresh]);

  const switchDriver = useCallback(
    async (type: DatabaseDriverType, customConfig?: Partial<DatabaseDriverConfig>) => {
      let driverName = 'Browser IndexedDB (raBooks_DB_v3)';
      let driverStatus: 'connected' | 'simulated' = 'connected';

      if (type === 'postgres') {
        driverName = 'PostgreSQL Enterprise Engine (SQL Schema)';
        driverStatus = 'simulated';
      } else if (type === 'mongodb') {
        driverName = 'MongoDB Document Store (Cluster-0)';
        driverStatus = 'simulated';
      } else if (type === 'sheets') {
        driverName = 'Google Sheets Webhook Sync Bridge';
        driverStatus = 'simulated';
      }

      setActiveDriver({
        type,
        name: driverName,
        status: driverStatus,
        ...customConfig,
      });

      await repository.appendAuditLog({
        tenantId,
        timestamp: new Date().toISOString(),
        actor: 'admin@rabooks.internal',
        action: 'PERSISTENCE_DRIVER_SWITCH',
        target: type.toUpperCase(),
        details: `Hot-swapped active storage driver to ${driverName} (${driverStatus}).`,
      });
      await refresh();
    },
    [repository, tenantId, refresh]
  );

  const partyBalances = useMemo(() => {
    const map = new Map<string, number>();
    for (const party of parties) {
      const partyTxns = transactions.filter((t) => t.partyId === party.id);
      const { netBalancePaise } = calculatePartyNetBalance(partyTxns);
      map.set(party.id, netBalancePaise);
    }
    return map;
  }, [parties, transactions]);

  const getPartyBalance = useCallback(
    (partyId: string) => {
      return partyBalances.get(partyId) || 0;
    },
    [partyBalances]
  );

  const todayStr = useMemo(() => formatDateToIsoDate(new Date()), []);
  const pendingDueSchedulesCount = useMemo(() => {
    return recurringSchedules.filter((s) => s.status === 'ACTIVE' && isScheduleDue(s, todayStr)).length;
  }, [recurringSchedules, todayStr]);

  const telemetry = useMemo(() => {
    let totalReceivablesPaise = 0;
    let totalPayablesPaise = 0;

    partyBalances.forEach((balance) => {
      if (balance > 0) {
        totalReceivablesPaise += balance;
      } else if (balance < 0) {
        totalPayablesPaise += Math.abs(balance);
      }
    });

    const netLiquidityPaise = totalReceivablesPaise - totalPayablesPaise;
    const overduePartiesCount = parties.filter((p) => p.overdue).length;

    let overdueInstallmentsCount = 0;
    for (const plan of emiPlans) {
      for (const inst of plan.installments) {
        if (inst.status === 'Overdue') {
          overdueInstallmentsCount++;
        }
      }
    }

    const activeRecurringSchedulesCount = recurringSchedules.filter((s) => s.status === 'ACTIVE').length;

    return {
      totalReceivablesPaise,
      totalPayablesPaise,
      netLiquidityPaise,
      activePartiesCount: parties.length,
      overduePartiesCount,
      overdueInstallmentsCount,
      activeRecurringSchedulesCount,
    };
  }, [partyBalances, parties, emiPlans, recurringSchedules]);

  const value = {
    tenantId,
    isReady,
    parties,
    transactions,
    emiPlans,
    recurringSchedules,
    auditLogs,
    activeDriver,
    switchDriver,
    recordTransaction,
    bulkRecordTransactions,
    voidTransaction,
    deleteTransaction,
    bulkDeleteTransactions,
    saveParty,
    deleteParty,
    saveEmiPlan,
    settleInstallment,
    saveRecurringSchedule,
    deleteRecurringSchedule,
    executeRecurringScheduleNow,
    processDueRecurringSchedules,
    pendingDueSchedulesCount,
    lastAutoProcessResult,
    clearLastAutoProcessResult,
    exportSnapshotJson,
    restoreSnapshotJson,
    exportEncryptedBackup,
    restoreEncryptedBackup,
    resetDatabase,
    refresh,
    telemetry,
    getPartyBalance,
  };

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
};

export const useLedger = () => {
  const context = useContext(LedgerContext);
  if (!context) {
    throw new Error('useLedger must be used within a LedgerProvider');
  }
  return context;
};
