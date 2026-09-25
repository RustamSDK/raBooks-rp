import React, { useState, useMemo, useRef } from 'react';
import { useLedger } from '../../db/repository-context';
import { CanonicalTransaction } from '../../core/models/transaction';
import { formatPaiseToInr } from '../../core/formatters/currency';
import { calculatePartyNetBalance } from '../../core/math/balance';
import { Badge } from '../ui/Badge';
import { PartyAvatar } from '../ui/PartyAvatar';
import { ProviderIcon } from '../ui/ProviderIcon';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  DatePreset,
  DateRange,
  resolvePresetDateRange,
  isDateWithinInterval,
  getDatePresetLabel,
  formatLocalISODate,
} from '../../core/utils/dateRange';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  Printer,
  Ban,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ShieldCheck,
  Scale,
  X,
  Calendar,
  CalendarDays,
  CalendarRange,
  Filter,
  ChevronDown,
  RotateCcw,
  TrendingUp,
  Wallet,
  Phone,
  Zap,
} from 'lucide-react';

gsap.registerPlugin(useGSAP);

interface TransactionLedgerTableProps {
  selectedPartyId: string | null;
  onOpenPrintForTransaction: (txnId: string) => void;
  onSelectParty?: (partyId: string | null) => void;
  onOpenGiveModalForParty?: (partyId: string) => void;
  onOpenTakeModalForParty?: (partyId: string) => void;
  onQuickSettleForParty?: (partyId: string, netBalancePaise: number) => void;
}

export const TransactionLedgerTable: React.FC<TransactionLedgerTableProps> = ({
  selectedPartyId,
  onOpenPrintForTransaction,
  onSelectParty,
  onOpenGiveModalForParty,
  onOpenTakeModalForParty,
  onQuickSettleForParty,
}) => {
  const {
    transactions,
    parties,
    voidTransaction,
    deleteTransaction,
    bulkDeleteTransactions,
    saveParty,
  } = useLedger();

  const [typeFilter, setTypeFilter] = useState<'ALL' | 'GIVEN' | 'TAKEN'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Date range filter states
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showDatePickerDrawer, setShowDatePickerDrawer] = useState(false);

  // Single transaction void/delete states
  const [voidConfirmId, setVoidConfirmId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('Mutual commercial agreement');
  const [singleDeleteConfirmId, setSingleDeleteConfirmId] = useState<string | null>(null);
  const [singleDeleteReason, setSingleDeleteReason] = useState('Transaction entry error / Reversal');

  // Bulk selection states
  const [selectedTxnIds, setSelectedTxnIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteReason, setBulkDeleteReason] = useState(
    'Batch ledger reconciliation and obsolete entries cleanup'
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusNotification, setStatusNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const bulkToolbarRef = useRef<HTMLDivElement>(null);

  // GSAP animation for bulk toolbar entrance following gsap-react / gsap-performance skills
  useGSAP(
    () => {
      if (selectedTxnIds.size > 0 && bulkToolbarRef.current) {
        const mm = gsap.matchMedia();
        mm.add(
          {
            reduceMotion: '(prefers-reduced-motion: reduce)',
            normalMotion: '(prefers-reduced-motion: no-preference)',
          },
          (context) => {
            const { reduceMotion } = context.conditions as { reduceMotion: boolean };
            if (reduceMotion) {
              gsap.set(bulkToolbarRef.current, { opacity: 1, y: 0 });
              return;
            }
            gsap.fromTo(
              bulkToolbarRef.current,
              { opacity: 0, y: -8 },
              { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out', clearProps: 'transform' }
            );
          }
        );
        return () => mm.revert();
      }
    },
    { dependencies: [selectedTxnIds.size > 0] }
  );

  // Active concrete date range resolution
  const activeDateRange: DateRange | null = useMemo(() => {
    if (datePreset === 'ALL') return null;
    if (datePreset === 'CUSTOM') {
      if (!customStartDate && !customEndDate) return null;
      return {
        startDate: customStartDate || '1970-01-01',
        endDate: customEndDate || '2099-12-31',
      };
    }
    return resolvePresetDateRange(datePreset);
  }, [datePreset, customStartDate, customEndDate]);

  // Handle Preset selection
  const handleSelectPreset = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'CUSTOM' && preset !== 'ALL') {
      const resolved = resolvePresetDateRange(preset);
      if (resolved) {
        setCustomStartDate(resolved.startDate);
        setCustomEndDate(resolved.endDate);
      }
    } else if (preset === 'ALL') {
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  const handleResetDateFilter = () => {
    setDatePreset('ALL');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (selectedPartyId && t.partyId !== selectedPartyId) return false;
      if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;
      
      // Date Range Filtering
      if (activeDateRange) {
        if (!isDateWithinInterval(t.date, activeDateRange.startDate, activeDateRange.endDate)) {
          return false;
        }
      }

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const p = parties.find((item) => item.id === t.partyId);
        const matchesParty = p ? p.name.toLowerCase().includes(q) : false;
        const matchesId = t.id.toLowerCase().includes(q);
        const matchesNotes = t.notes ? t.notes.toLowerCase().includes(q) : false;
        const matchesSplits = t.splits.some(
          (s) =>
            s.method.toLowerCase().includes(q) ||
            (s.paymentReferenceId && s.paymentReferenceId.toLowerCase().includes(q)) ||
            (s.provider && s.provider.toLowerCase().includes(q))
        );
        if (!matchesParty && !matchesId && !matchesNotes && !matchesSplits) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, selectedPartyId, typeFilter, activeDateRange, searchTerm, parties]);

  // Compute period metrics for filtered view
  const periodMetrics = useMemo(() => {
    let periodTakenPaise = 0;
    let periodGivenPaise = 0;
    let confirmedCount = 0;
    let voidedCount = 0;

    for (const t of filteredTransactions) {
      if (t.status === 'Confirmed') {
        confirmedCount++;
        if (t.type === 'TAKEN') {
          periodTakenPaise += t.totalAmountPaise;
        } else if (t.type === 'GIVEN') {
          periodGivenPaise += t.totalAmountPaise;
        }
      } else if (t.status === 'Voided') {
        voidedCount++;
      }
    }

    const netPeriodPaise = periodGivenPaise - periodTakenPaise;

    return {
      periodTakenPaise,
      periodGivenPaise,
      netPeriodPaise,
      confirmedCount,
      voidedCount,
    };
  }, [filteredTransactions]);

  // Compute running balance chronologically (from earliest to latest, then displayed)
  const runningBalances = useMemo(() => {
    const map = new Map<string, number>();
    const sortedAsc = [...transactions]
      .filter((t) => !selectedPartyId || t.partyId === selectedPartyId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    for (const t of sortedAsc) {
      if (t.status === 'Confirmed') {
        if (t.type === 'GIVEN') {
          running += t.totalAmountPaise;
        } else if (t.type === 'TAKEN') {
          running -= t.totalAmountPaise;
        }
      }
      map.set(t.id, running);
    }
    return map;
  }, [transactions, selectedPartyId]);

  const selectedParty = parties.find((p) => p.id === selectedPartyId);

  // Account Snapshot aggregates for the selected counterparty
  const partySnapshot = useMemo(() => {
    if (!selectedParty) return null;

    const partyTxns = transactions.filter((t) => t.partyId === selectedParty.id);
    const balanceData = calculatePartyNetBalance(partyTxns);

    let givenCount = 0;
    let takenCount = 0;
    let voidedCount = 0;
    let lastTxnDate: string | null = null;

    for (const t of partyTxns) {
      if (t.status === 'Confirmed') {
        if (t.type === 'GIVEN') givenCount++;
        if (t.type === 'TAKEN') takenCount++;
        if (!lastTxnDate || new Date(t.date).getTime() > new Date(lastTxnDate).getTime()) {
          lastTxnDate = t.date;
        }
      } else if (t.status === 'Voided') {
        voidedCount++;
      }
    }

    const netPaise = balanceData.netBalancePaise;
    const isReceivable = netPaise > 0;
    const isPayable = netPaise < 0;
    const isSettled = netPaise === 0;

    return {
      totalGivenPaise: balanceData.totalDisbursedPaise,
      totalTakenPaise: balanceData.totalCollectedPaise,
      netPositionPaise: netPaise,
      absNetPositionPaise: Math.abs(netPaise),
      isReceivable,
      isPayable,
      isSettled,
      givenCount,
      takenCount,
      totalConfirmedCount: givenCount + takenCount,
      voidedCount,
      lastTxnDate,
    };
  }, [selectedParty, transactions]);
  const selectedTransactions = useMemo(() => {
    return transactions.filter((t) => selectedTxnIds.has(t.id));
  }, [transactions, selectedTxnIds]);

  // Bulk selection aggregates
  const selectedStats = useMemo(() => {
    let totalPaise = 0;
    let givenPaise = 0;
    let takenPaise = 0;
    let givenCount = 0;
    let takenCount = 0;
    const partyMap = new Map<string, number>();

    for (const t of selectedTransactions) {
      totalPaise += t.totalAmountPaise;
      partyMap.set(t.partyId, (partyMap.get(t.partyId) || 0) + 1);
      if (t.type === 'GIVEN') {
        givenPaise += t.totalAmountPaise;
        givenCount++;
      } else {
        takenPaise += t.totalAmountPaise;
        takenCount++;
      }
    }

    return {
      count: selectedTransactions.length,
      totalPaise,
      givenPaise,
      takenPaise,
      givenCount,
      takenCount,
      affectedPartiesCount: partyMap.size,
      partyBreakdown: Array.from(partyMap.entries()).map(([pid, count]) => {
        const p = parties.find((item) => item.id === pid);
        return {
          name: p ? p.name : pid,
          count,
        };
      }),
    };
  }, [selectedTransactions, parties]);

  // Selection toggle handlers
  const isAllSelected = useMemo(() => {
    if (filteredTransactions.length === 0) return false;
    return filteredTransactions.every((t) => selectedTxnIds.has(t.id));
  }, [filteredTransactions, selectedTxnIds]);

  const isSomeSelected = useMemo(() => {
    if (isAllSelected || filteredTransactions.length === 0) return false;
    return filteredTransactions.some((t) => selectedTxnIds.has(t.id));
  }, [filteredTransactions, selectedTxnIds, isAllSelected]);

  const handleToggleSelect = (txnId: string) => {
    setSelectedTxnIds((prev) => {
      const next = new Set(prev);
      if (next.has(txnId)) {
        next.delete(txnId);
      } else {
        next.add(txnId);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTxnIds((prev) => {
        const next = new Set(prev);
        filteredTransactions.forEach((t) => next.delete(t.id));
        return next;
      });
    } else {
      setSelectedTxnIds((prev) => {
        const next = new Set(prev);
        filteredTransactions.forEach((t) => next.add(t.id));
        return next;
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedTxnIds(new Set());
  };

  // Void confirmation
  const handleConfirmVoid = async () => {
    if (!voidConfirmId) return;
    await voidTransaction(voidConfirmId, voidReason);
    setVoidConfirmId(null);
    setStatusNotification({
      type: 'success',
      message: `Transaction ${voidConfirmId} has been successfully voided.`,
    });
    setTimeout(() => setStatusNotification(null), 5000);
  };

  // Single transaction delete
  const handleConfirmSingleDelete = async () => {
    if (!singleDeleteConfirmId) return;
    setIsDeleting(true);
    try {
      await deleteTransaction(singleDeleteConfirmId, singleDeleteReason);
      setSelectedTxnIds((prev) => {
        const next = new Set(prev);
        next.delete(singleDeleteConfirmId);
        return next;
      });
      setStatusNotification({
        type: 'success',
        message: `Transaction ${singleDeleteConfirmId} deleted. Double-entry integrity and balances recomputed.`,
      });
      setSingleDeleteConfirmId(null);
      setTimeout(() => setStatusNotification(null), 5000);
    } catch (err: any) {
      setStatusNotification({
        type: 'error',
        message: `Deletion failed: ${err.message || 'IndexedDB write error'}`,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk delete execution
  const handleConfirmBulkDelete = async () => {
    if (selectedTxnIds.size === 0) return;
    setIsDeleting(true);
    try {
      const idsToDelete = Array.from(selectedTxnIds);
      const result = await bulkDeleteTransactions(idsToDelete, bulkDeleteReason);
      
      if (result.errors.length > 0) {
        setStatusNotification({
          type: 'error',
          message: `Processed ${result.successCount} of ${idsToDelete.length} transactions. Encountered ${result.errors.length} errors: ${result.errors[0]}`,
        });
      } else {
        setStatusNotification({
          type: 'success',
          message: `Successfully removed ${result.successCount} transactions totaling ${formatPaiseToInr(selectedStats.totalPaise)}. Double-entry balance integrity recomputed.`,
        });
      }
      setSelectedTxnIds(new Set());
      setIsBulkDeleteModalOpen(false);
      setTimeout(() => setStatusNotification(null), 6000);
    } catch (err: any) {
      setStatusNotification({
        type: 'error',
        message: `Bulk deletion failed: ${err.message || 'Database error occurred'}`,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex flex-col h-full">
      {/* Table Header Bar */}
      <div className="p-3.5 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {selectedParty && (
            <PartyAvatar
              name={selectedParty.name}
              photoUrl={selectedParty.photoUrl}
              size="lg"
              editable
              actionPlacement="bottom"
              onPhotoChange={async (newUrl) => {
                await saveParty({
                  ...selectedParty,
                  photoUrl: newUrl,
                  updatedAt: new Date().toISOString(),
                });
              }}
              onPhotoRemove={
                selectedParty.photoUrl
                  ? async () => {
                      await saveParty({
                        ...selectedParty,
                        photoUrl: undefined,
                        updatedAt: new Date().toISOString(),
                      });
                    }
                  : undefined
              }
            />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 tracking-tight uppercase">
                Financial Journal & Running Balance
              </h3>
              <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold">
                {filteredTransactions.length} Transactions
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {selectedParty
                ? `Filtered to: ${selectedParty.name} (${selectedParty.relation})`
                : 'Full Enterprise Double-Entry Ledger (Consolidated)'}
            </p>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setTypeFilter('ALL')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                typeFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('TAKEN')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                typeFilter === 'TAKEN'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Taken (Inflow)
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('GIVEN')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                typeFilter === 'GIVEN'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Given (Outflow)
            </button>
          </div>

          {/* Quick Search */}
          <input
            type="text"
            placeholder="Search txn ID, UTR, ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400 w-44"
          />
        </div>
      </div>

      {/* Account Snapshot Hero Card (Party-Specific Standing at a Glance) */}
      {selectedParty && partySnapshot && (
        <div className="p-4 bg-linear-to-b from-slate-900 via-slate-900 to-slate-950 text-white border-b border-slate-800 space-y-3.5">
          {/* Top Row: Party Profile & Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <PartyAvatar
                name={selectedParty.name}
                photoUrl={selectedParty.photoUrl}
                size="lg"
                editable
                actionPlacement="bottom"
                onPhotoChange={async (newUrl) => {
                  await saveParty({
                    ...selectedParty,
                    photoUrl: newUrl,
                    updatedAt: new Date().toISOString(),
                  });
                }}
                onPhotoRemove={
                  selectedParty.photoUrl
                    ? async () => {
                        await saveParty({
                          ...selectedParty,
                          photoUrl: undefined,
                          updatedAt: new Date().toISOString(),
                        });
                      }
                    : undefined
                }
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    {selectedParty.name}
                  </h2>
                  <span className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded">
                    {selectedParty.relation}
                  </span>
                  {selectedParty.overdue && (
                    <span className="text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                      Overdue
                    </span>
                  )}
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      selectedParty.trustScore === 'green'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : selectedParty.trustScore === 'amber'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    Trust: {selectedParty.trustScore.toUpperCase()}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1 font-mono">
                  {selectedParty.phone && <span>📞 {selectedParty.phone}</span>}
                  {selectedParty.upiId && <span>⚡ {selectedParty.upiId}</span>}
                  {selectedParty.ratePercentMonthly > 0 && (
                    <span>📈 {selectedParty.ratePercentMonthly}% / mo interest</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
              {onQuickSettleForParty && !partySnapshot.isSettled && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => onQuickSettleForParty(selectedParty.id, partySnapshot.netPositionPaise)}
                  icon={<Zap className="w-3.5 h-3.5 text-amber-300" />}
                  className="bg-linear-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-semibold shadow-xs"
                  title={`Trigger guided settlement transaction to bring balance to zero`}
                >
                  Quick Settle ({formatPaiseToInr(partySnapshot.absNetPositionPaise)})
                </Button>
              )}
              {onOpenGiveModalForParty && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => onOpenGiveModalForParty(selectedParty.id)}
                  icon={<ArrowUpRight className="w-3.5 h-3.5" />}
                >
                  + Give (Outflow)
                </Button>
              )}
              {onOpenTakeModalForParty && (
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  onClick={() => onOpenTakeModalForParty(selectedParty.id)}
                  icon={<ArrowDownLeft className="w-3.5 h-3.5" />}
                >
                  + Take (Inflow)
                </Button>
              )}
              {onSelectParty && (
                <button
                  type="button"
                  onClick={() => onSelectParty(null)}
                  className="p-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Clear Party Filter to View All Transactions"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Show All Ledgers</span>
                </button>
              )}
            </div>
          </div>

          {/* Account Snapshot Metrics Grid: Total Given, Total Taken, Net Position */}
          {/* Account Snapshot Metrics Grid: Total Given (Receivables), Total Taken (Payables), Net Position */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Total Given (Receivables / Capital Outflow) */}
            <button
              type="button"
              onClick={() => setTypeFilter(typeFilter === 'GIVEN' ? 'ALL' : 'GIVEN')}
              className={`rounded-xl p-3.5 flex flex-col justify-between text-left transition-all cursor-pointer relative ${
                typeFilter === 'GIVEN'
                  ? 'bg-rose-950/40 border-2 border-rose-500 shadow-md ring-2 ring-rose-500/20'
                  : 'bg-slate-800/90 border border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 shadow-xs'
              }`}
              title="Click to filter ledger to Receivables (Given / Outflows)"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Total Given (Receivables)
                  </span>
                  {typeFilter === 'GIVEN' && (
                    <span className="text-[9px] font-bold uppercase bg-rose-500 text-white px-1.5 py-0.2 rounded">
                      Active
                    </span>
                  )}
                </div>
                <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-lg sm:text-xl font-bold font-mono text-rose-400">
                  {formatPaiseToInr(partySnapshot.totalGivenPaise)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
                  <span>{partySnapshot.givenCount} capital disbursements</span>
                  <span className="text-[10px] font-medium text-rose-300 hover:underline">
                    {typeFilter === 'GIVEN' ? 'Showing' : 'Click to view'}
                  </span>
                </div>
              </div>
            </button>

            {/* 2. Total Taken (Payables / Capital Inflow) */}
            <button
              type="button"
              onClick={() => setTypeFilter(typeFilter === 'TAKEN' ? 'ALL' : 'TAKEN')}
              className={`rounded-xl p-3.5 flex flex-col justify-between text-left transition-all cursor-pointer relative ${
                typeFilter === 'TAKEN'
                  ? 'bg-emerald-950/40 border-2 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : 'bg-slate-800/90 border border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 shadow-xs'
              }`}
              title="Click to filter ledger to Payables (Taken / Inflows)"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Total Taken (Payables)
                  </span>
                  {typeFilter === 'TAKEN' && (
                    <span className="text-[9px] font-bold uppercase bg-emerald-500 text-white px-1.5 py-0.2 rounded">
                      Active
                    </span>
                  )}
                </div>
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400">
                  {formatPaiseToInr(partySnapshot.totalTakenPaise)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
                  <span>{partySnapshot.takenCount} collections / repayments</span>
                  <span className="text-[10px] font-medium text-emerald-300 hover:underline">
                    {typeFilter === 'TAKEN' ? 'Showing' : 'Click to view'}
                  </span>
                </div>
              </div>
            </button>

            {/* 3. Net Position (Receivable / Payable Standing) */}
            <button
              type="button"
              onClick={() => setTypeFilter('ALL')}
              className={`rounded-xl p-3.5 flex flex-col justify-between text-left transition-all cursor-pointer border shadow-xs ${
                typeFilter === 'ALL'
                  ? 'ring-2 ring-slate-400/30'
                  : ''
              } ${
                partySnapshot.isReceivable
                  ? 'bg-emerald-950/40 border-emerald-500/50'
                  : partySnapshot.isPayable
                  ? 'bg-rose-950/40 border-rose-500/50'
                  : 'bg-slate-800/90 border-slate-700/80'
              }`}
              title="Click to view all journal entries (Consolidated)"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Net Standing
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    partySnapshot.isReceivable
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : partySnapshot.isPayable
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {partySnapshot.isReceivable
                    ? 'You Will Receive'
                    : partySnapshot.isPayable
                    ? 'You Will Pay'
                    : 'Settled (Zero)'}
                </span>
              </div>
              <div className="mt-2">
                <div
                  className={`text-lg sm:text-xl font-bold font-mono ${
                    partySnapshot.isReceivable
                      ? 'text-emerald-400'
                      : partySnapshot.isPayable
                      ? 'text-rose-400'
                      : 'text-slate-200'
                  }`}
                >
                  {formatPaiseToInr(partySnapshot.absNetPositionPaise)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
                  <span>
                    {partySnapshot.isReceivable
                      ? 'Net Receivable Balance'
                      : partySnapshot.isPayable
                      ? 'Net Payable Obligation'
                      : 'Account in Perfect Balance'}
                  </span>
                  {partySnapshot.lastTxnDate && (
                    <span className="font-mono text-[10px] text-slate-500">
                      Last: {partySnapshot.lastTxnDate}
                    </span>
                  )}
                </div>

                {onQuickSettleForParty && (
                  <div className="mt-2.5 pt-2 border-t border-slate-700/60">
                    {!partySnapshot.isSettled ? (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickSettleForParty(selectedParty.id, partySnapshot.netPositionPaise);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            onQuickSettleForParty(selectedParty.id, partySnapshot.netPositionPaise);
                          }
                        }}
                        className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs select-none ${
                          partySnapshot.isReceivable
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
                            : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40'
                        }`}
                        title={`Record settlement transaction to clear standing position to zero`}
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                        <span>
                          {partySnapshot.isReceivable
                            ? `Quick Settle: Collect ${formatPaiseToInr(partySnapshot.absNetPositionPaise)}`
                            : `Quick Settle: Pay ${formatPaiseToInr(partySnapshot.absNetPositionPaise)}`}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-emerald-400 py-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Account Fully Settled (Zero Balance)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </button>
          </div>

          {/* Dedicated Visual Toggle Strip: Receivables vs Payables vs All */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-indigo-400" />
                Ledger View Toggle:
              </span>
              <div className="inline-flex p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-xs select-none">
                <button
                  type="button"
                  onClick={() => setTypeFilter('ALL')}
                  className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    typeFilter === 'ALL'
                      ? 'bg-slate-800 text-white shadow-xs font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>All Entries</span>
                  <span className="text-[10px] font-mono bg-slate-700/60 px-1.5 py-0.2 rounded text-slate-300">
                    {partySnapshot.totalConfirmedCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTypeFilter('GIVEN')}
                  className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    typeFilter === 'GIVEN'
                      ? 'bg-rose-600 text-white shadow-xs font-semibold'
                      : 'text-slate-400 hover:text-rose-300'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-300" />
                  <span>Receivables (Given)</span>
                  <span className="text-[10px] font-mono bg-rose-950/90 text-rose-200 px-1.5 py-0.2 rounded border border-rose-800/60">
                    {partySnapshot.givenCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTypeFilter('TAKEN')}
                  className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    typeFilter === 'TAKEN'
                      ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                      : 'text-slate-400 hover:text-emerald-300'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Payables (Taken)</span>
                  <span className="text-[10px] font-mono bg-emerald-950/90 text-emerald-200 px-1.5 py-0.2 rounded border border-emerald-800/60">
                    {partySnapshot.takenCount}
                  </span>
                </button>
              </div>
            </div>

            {/* Quick Status / Reset Pill */}
            <div className="flex items-center gap-2 text-[11px] font-mono">
              {typeFilter === 'GIVEN' && (
                <span className="text-rose-300 bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/25 flex items-center gap-1.5">
                  <ArrowUpRight className="w-3 h-3 text-rose-400" />
                  Isolated: {partySnapshot.givenCount} Receivables entries ({formatPaiseToInr(partySnapshot.totalGivenPaise)})
                </span>
              )}
              {typeFilter === 'TAKEN' && (
                <span className="text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/25 flex items-center gap-1.5">
                  <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                  Isolated: {partySnapshot.takenCount} Payables entries ({formatPaiseToInr(partySnapshot.totalTakenPaise)})
                </span>
              )}
              {typeFilter === 'ALL' && (
                <span className="text-slate-400">
                  Consolidated Journal • {partySnapshot.totalConfirmedCount} confirmed entries
                </span>
              )}

              {typeFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setTypeFilter('ALL')}
                  className="text-indigo-400 hover:text-indigo-300 underline font-sans text-xs cursor-pointer"
                >
                  Show all
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Date Range Filtering Toolbar */}
      <div className="px-3.5 py-2.5 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1.5 text-slate-600 font-semibold mr-1">
            <CalendarRange className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Date Range:</span>
          </div>

          {/* Quick preset buttons */}
          <div className="flex flex-wrap items-center gap-1">
            {(
              [
                { key: 'ALL', label: 'All Dates' },
                { key: 'TODAY', label: 'Today' },
                { key: 'THIS_WEEK', label: 'This Week' },
                { key: 'LAST_7_DAYS', label: 'Last 7 Days' },
                { key: 'THIS_MONTH', label: 'This Month' },
                { key: 'LAST_MONTH', label: 'Last Month' },
                { key: 'THIS_FY', label: 'This FY' },
                { key: 'CUSTOM', label: 'Custom Range' },
              ] as const
            ).map((item) => {
              const isSelected = datePreset === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    handleSelectPreset(item.key);
                    if (item.key === 'CUSTOM') {
                      setShowDatePickerDrawer(true);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Date interval toggle / indicator button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDatePickerDrawer((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
              showDatePickerDrawer || datePreset === 'CUSTOM'
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
            title="Configure custom start and end date interval"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>
              {activeDateRange
                ? `${activeDateRange.startDate} to ${activeDateRange.endDate}`
                : 'Custom Interval'}
            </span>
            <ChevronDown
              className={`w-3 h-3 transition-transform duration-200 ${
                showDatePickerDrawer ? 'rotate-180 text-indigo-600' : 'text-slate-400'
              }`}
            />
          </button>

          {datePreset !== 'ALL' && (
            <button
              type="button"
              onClick={handleResetDateFilter}
              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded text-[11px] font-medium transition-colors cursor-pointer"
              title="Reset date filter to show all transactions"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Custom Date Range Drawer */}
      {showDatePickerDrawer && (
        <div className="px-4 py-3 bg-indigo-50/50 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold text-slate-700">From Date:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  setDatePreset('CUSTOM');
                }}
                className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold text-slate-700">To Date:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  setDatePreset('CUSTOM');
                }}
                className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Quick interval shortcuts */}
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-slate-500 font-medium">Quick Jumps:</span>
              <button
                type="button"
                onClick={() => handleSelectPreset('TODAY')}
                className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('LAST_7_DAYS')}
                className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('THIS_MONTH')}
                className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('THIS_QUARTER')}
                className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Quarter
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('THIS_FY')}
                className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                FY
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDateFilter}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 text-[11px] font-medium cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setShowDatePickerDrawer(false)}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[11px] font-semibold cursor-pointer shadow-2xs"
            >
              Apply Filter
            </button>
          </div>
        </div>
      )}

      {/* Active Date Period Summary Metrics Banner */}
      {datePreset !== 'ALL' && activeDateRange && (
        <div className="px-4 py-2 bg-indigo-50/70 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-indigo-600" />
              <span className="font-bold text-slate-900">
                {getDatePresetLabel(datePreset)}:
              </span>
              <span className="font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-indigo-200 font-semibold text-[11px]">
                {activeDateRange.startDate} &rarr; {activeDateRange.endDate}
              </span>
            </div>

            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="text-slate-600">
                Period Inflow (Taken):{' '}
                <strong className="text-emerald-700">
                  {formatPaiseToInr(periodMetrics.periodTakenPaise)}
                </strong>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600">
                Period Outflow (Given):{' '}
                <strong className="text-rose-700">
                  {formatPaiseToInr(periodMetrics.periodGivenPaise)}
                </strong>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600">
                Net Period Movement:{' '}
                <strong
                  className={
                    periodMetrics.netPeriodPaise >= 0
                      ? 'text-emerald-700'
                      : 'text-rose-700'
                  }
                >
                  {periodMetrics.netPeriodPaise >= 0 ? '+ ' : '- '}
                  {formatPaiseToInr(Math.abs(periodMetrics.netPeriodPaise))}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-medium">
              {filteredTransactions.length} of {transactions.length} txns
            </span>
            <button
              type="button"
              onClick={handleResetDateFilter}
              className="text-indigo-600 hover:text-indigo-900 font-semibold text-[11px] underline cursor-pointer"
            >
              Clear Date Filter
            </button>
          </div>
        </div>
      )}

      {/* Notification Banner */}
      {statusNotification && (
        <div
          className={`p-3 text-xs flex items-center justify-between gap-2 border-b ${
            statusNotification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusNotification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{statusNotification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusNotification(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer font-bold px-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Bulk Action Sticky Toolbar */}
      {selectedTxnIds.size > 0 && (
        <div
          ref={bulkToolbarRef}
          className="bg-slate-900 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-indigo-600 text-white font-bold text-[11px]">
                {selectedTxnIds.size}
              </span>
              <span className="font-semibold text-slate-100">
                {selectedTxnIds.size === 1
                  ? '1 transaction selected'
                  : `${selectedTxnIds.size} transactions selected`}
              </span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-slate-400">Total Volume:</span>
              <span className="font-bold text-white">
                {formatPaiseToInr(selectedStats.totalPaise)}
              </span>
              {selectedStats.givenCount > 0 && (
                <span className="text-emerald-400 font-sans">
                  ({selectedStats.givenCount} Given: {formatPaiseToInr(selectedStats.givenPaise)})
                </span>
              )}
              {selectedStats.takenCount > 0 && (
                <span className="text-rose-400 font-sans">
                  ({selectedStats.takenCount} Taken: {formatPaiseToInr(selectedStats.takenPaise)})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded font-medium transition-colors cursor-pointer"
            >
              Clear Selection
            </button>
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded font-medium shadow-2xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bulk Delete ({selectedTxnIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Table Body */}
      <div className="overflow-x-auto grow max-h-[580px] overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10 backdrop-blur-xs">
            <tr>
              {/* Checkbox Column */}
              <th className="py-2.5 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeSelected;
                  }}
                  onChange={handleToggleSelectAll}
                  aria-label="Select all transactions in current view"
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                />
              </th>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Transaction ID</th>
              {!selectedPartyId && <th className="py-2.5 px-3">Party</th>}
              <th className="py-2.5 px-3">Movement</th>
              <th className="py-2.5 px-3">Purpose</th>
              <th className="py-2.5 px-3">Payment Method & Reference</th>
              <th className="py-2.5 px-3 text-right">Amount</th>
              <th className="py-2.5 px-3 text-right">Running Balance</th>
              <th className="py-2.5 px-3 text-center">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td
                  colSpan={selectedPartyId ? 9 : 10}
                  className="py-12 text-center text-slate-400 font-sans"
                >
                  <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  No transactions recorded in this view.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((txn) => {
                const party = parties.find((p) => p.id === txn.partyId);
                const runningBal = runningBalances.get(txn.id) ?? 0;
                const isVoided = txn.status === 'Voided';
                const isSelected = selectedTxnIds.has(txn.id);

                return (
                  <tr
                    key={txn.id}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-indigo-50/70 border-l-2 border-indigo-600'
                        : isVoided
                        ? 'bg-slate-50/80 opacity-60 line-through'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(txn.id)}
                        aria-label={`Select transaction ${txn.id}`}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                      />
                    </td>

                    {/* Date */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-700 font-medium">
                      {txn.date}
                    </td>

                    {/* Internal Canonical ID */}
                    <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                      {txn.id}
                    </td>

                    {/* Counterparty with Circular Avatar */}
                    {!selectedPartyId && (
                      <td className="py-2.5 px-3 font-sans max-w-[170px] truncate font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          <PartyAvatar
                            name={party ? party.name : txn.partyId}
                            size="sm"
                            photoUrl={party?.photoUrl}
                          />
                          <span className="truncate">{party ? party.name : txn.partyId}</span>
                        </div>
                      </td>
                    )}

                    {/* Movement Type: 🟢 TAKEN / 🔴 GIVEN */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-sans font-bold ${
                          txn.type === 'TAKEN'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {txn.type === 'TAKEN' ? (
                          <ArrowDownLeft className="size-3 text-emerald-600" />
                        ) : (
                          <ArrowUpRight className="size-3 text-rose-600" />
                        )}
                        {txn.type === 'TAKEN' ? 'TAKEN 🟢' : 'GIVEN 🔴'}
                      </span>
                    </td>

                    {/* Purpose */}
                    <td className="py-2.5 px-3 font-sans whitespace-nowrap">
                      <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {txn.purpose || (txn.type === 'TAKEN' ? 'Received' : 'Disbursed')}
                      </span>
                    </td>

                    {/* Payment details with ProviderIcon & UTR */}
                    <td className="py-2.5 px-3 font-sans">
                      <div className="flex flex-wrap gap-1.5 items-center max-w-xs">
                        {txn.splits.map((s, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-[11px]"
                            title={s.paymentReferenceId ? `Reference/UTR: ${s.paymentReferenceId}` : undefined}
                          >
                            <ProviderIcon
                              provider={s.provider || txn.provider}
                              method={s.method}
                              size="sm"
                              showLabel
                            />
                            {s.paymentReferenceId && (
                              <span className="font-mono text-[10px] text-slate-500 bg-white px-1 rounded border border-slate-200">
                                {s.paymentReferenceId}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                      {txn.notes && (
                        <div className="text-[10px] text-slate-500 mt-1 truncate max-w-xs">
                          {txn.notes}
                        </div>
                      )}
                    </td>

                    {/* Amount */}
                    <td
                      className={`py-2.5 px-3 text-right font-bold whitespace-nowrap font-mono tabular-nums ${
                        txn.type === 'TAKEN' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {txn.type === 'TAKEN' ? '+ ' : '- '}
                      {formatPaiseToInr(txn.totalAmountPaise)}
                    </td>

                    {/* Running Position */}
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-900 whitespace-nowrap font-mono tabular-nums">
                      {formatPaiseToInr(runningBal)}
                    </td>

                    {/* Action buttons */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 font-sans">
                        <button
                          type="button"
                          onClick={() => onOpenPrintForTransaction(txn.id)}
                          className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                          title="Print official transaction receipt"
                          aria-label={`Print receipt for transaction ${txn.id}`}
                        >
                          <Printer className="size-4" />
                        </button>

                        {!isVoided && (
                          <button
                            type="button"
                            onClick={() => setVoidConfirmId(txn.id)}
                            className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                            title="Void transaction (keep record with zeroed impact)"
                            aria-label={`Void transaction ${txn.id}`}
                          >
                            <Ban className="size-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSingleDeleteConfirmId(txn.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Delete transaction from ledger"
                          aria-label={`Delete transaction ${txn.id}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Void confirmation banner */}
      {voidConfirmId && (
        <div className="p-3 bg-amber-50 border-t border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-amber-950">
          <div>
            <span className="font-bold">Confirm Void Transaction:</span> Voiding #{voidConfirmId} preserves the journal record while neutralizing balance impact.
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Reason for voiding..."
              className="text-xs bg-white border border-amber-300 rounded px-2 py-1 text-slate-800"
            />
            <button
              type="button"
              onClick={handleConfirmVoid}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium cursor-pointer"
            >
              Confirm Void
            </button>
            <button
              type="button"
              onClick={() => setVoidConfirmId(null)}
              className="px-2 py-1 bg-white border border-slate-300 rounded text-slate-600 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Single delete confirmation modal */}
      {singleDeleteConfirmId && (
        <Modal
          isOpen={!!singleDeleteConfirmId}
          onClose={() => setSingleDeleteConfirmId(null)}
          title="Delete Transaction & Rebalance Ledger"
          subtitle={`Journal Entry ${singleDeleteConfirmId}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900">Irrevocable Ledger Removal</p>
                <p className="text-rose-800 text-[11px] mt-0.5">
                  Are you certain you wish to delete transaction{' '}
                  <span className="font-mono font-bold">{singleDeleteConfirmId}</span>? Both the
                  disbursement/collection leg and all split payment rail allocations will be
                  completely purged to maintain double-entry parity.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Formal Reason for Deletion (Logged to Non-Repudiation Audit Log)
              </label>
              <input
                type="text"
                value={singleDeleteReason}
                onChange={(e) => setSingleDeleteReason(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2 focus:ring-1 focus:ring-rose-500 focus:outline-none"
                placeholder="State corporate reason..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSingleDeleteConfirmId(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmSingleDelete}
                loading={isDeleting}
                icon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Confirm Deletion
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Delete Verification Modal */}
      {isBulkDeleteModalOpen && (
        <Modal
          isOpen={isBulkDeleteModalOpen}
          onClose={() => !isDeleting && setIsBulkDeleteModalOpen(false)}
          title="Bulk Delete Transactions"
          subtitle="Double-Entry Integrity & Balance Realignment"
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs text-slate-700">
            {/* Warning Banner */}
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-rose-950 text-xs">
                  Permanent Removal of {selectedStats.count} Ledger Transactions
                </h4>
                <p className="text-rose-800 text-[11px] mt-1 leading-relaxed">
                  You are about to delete <span className="font-bold">{selectedStats.count}</span>{' '}
                  selected transactions totaling{' '}
                  <span className="font-bold font-mono">
                    {formatPaiseToInr(selectedStats.totalPaise)}
                  </span>
                  . This operation removes all associated split payment rails and will
                  automatically recalculate counterparty running balances.
                </p>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                  Selected Count
                </span>
                <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block">
                  {selectedStats.count}
                </span>
                <span className="text-[10px] text-slate-400">Transactions</span>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                  Gross Value
                </span>
                <span className="text-sm font-bold font-mono text-slate-900 mt-0.5 block truncate">
                  {formatPaiseToInr(selectedStats.totalPaise)}
                </span>
                <span className="text-[10px] text-slate-400">{selectedStats.totalPaise} paise</span>
              </div>

              <div className="p-2.5 bg-rose-50/50 border border-rose-200/60 rounded-lg">
                <span className="text-[10px] text-rose-800 uppercase tracking-wider block font-semibold">
                  Given (Disbursed / Outflow)
                </span>
                <span className="text-sm font-bold font-mono text-rose-700 mt-0.5 block truncate">
                  {formatPaiseToInr(selectedStats.givenPaise)}
                </span>
                <span className="text-[10px] text-rose-600">{selectedStats.givenCount} entries</span>
              </div>

              <div className="p-2.5 bg-emerald-50/50 border border-emerald-200/60 rounded-lg">
                <span className="text-[10px] text-emerald-800 uppercase tracking-wider block font-semibold">
                  Taken (Collected / Inflow)
                </span>
                <span className="text-sm font-bold font-mono text-emerald-700 mt-0.5 block truncate">
                  {formatPaiseToInr(selectedStats.takenPaise)}
                </span>
                <span className="text-[10px] text-emerald-600">{selectedStats.takenCount} entries</span>
              </div>
            </div>

            {/* Double-Entry Integrity Guarantee Card */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Double-Entry Balance & Journal Audit Verification</span>
              </div>
              <ul className="text-[11px] text-slate-600 space-y-1 list-disc list-inside">
                <li>
                  <span className="font-semibold text-slate-800">Orphan Prevention:</span> All debit and
                  credit split legs (Cash, Bank, UPI, Cheque) will be cleanly removed in tandem,
                  ensuring no unallocated fragments remain.
                </li>
                <li>
                  <span className="font-semibold text-slate-800">Mathematical Invariant:</span>{' '}
                  Counterparty balances recalculate in integer base units (Law 1 Zero Floating-Point
                  Math) to guarantee zero parity error.
                </li>
                <li>
                  <span className="font-semibold text-slate-800">Immutable Audit Trail:</span> An
                  itemized record containing all deleted transaction IDs will be logged to
                  non-repudiation audit storage (Law 8).
                </li>
              </ul>
            </div>

            {/* Affected Counterparties Summary */}
            {selectedStats.partyBreakdown.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Affected Counterparties ({selectedStats.affectedPartiesCount}):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  {selectedStats.partyBreakdown.map((pb, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-white border border-slate-200 text-slate-700 font-medium"
                    >
                      <span>{pb.name}</span>
                      <span className="font-mono text-slate-400">({pb.count} txns)</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Formal Corporate Reason Input */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Formal Reason for Bulk Deletion (Audited)
              </label>
              <input
                type="text"
                value={bulkDeleteReason}
                onChange={(e) => setBulkDeleteReason(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2 focus:ring-1 focus:ring-rose-500 focus:outline-none"
                placeholder="State formal corporate reason..."
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium">
                {selectedStats.count} entries selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleConfirmBulkDelete}
                  loading={isDeleting}
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  Confirm Permanent Bulk Deletion
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
