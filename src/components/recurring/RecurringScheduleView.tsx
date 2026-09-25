import React, { useState, useMemo } from 'react';
import { useLedger } from '../../db/repository-context';
import { RecurringSchedule, ScheduleFrequency, ScheduleStatus } from '../../core/models/recurring-schedule';
import { formatPaiseToInr } from '../../core/formatters/currency';
import { formatDateToIsoDate, isScheduleDue } from '../../core/math/scheduler';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { CreateRecurringModal } from './CreateRecurringModal';
import {
  CalendarClock,
  Plus,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  Layers,
} from 'lucide-react';

export const RecurringScheduleView: React.FC = () => {
  const {
    recurringSchedules,
    parties,
    saveRecurringSchedule,
    deleteRecurringSchedule,
    executeRecurringScheduleNow,
    processDueRecurringSchedules,
    pendingDueSchedulesCount,
    lastAutoProcessResult,
    clearLastAutoProcessResult,
  } = useLedger();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState<'ALL' | ScheduleFrequency>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ScheduleStatus>('ALL');
  const [isProcessing, setIsProcessing] = useState(false);
  const [executingScheduleId, setExecutingScheduleId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const todayStr = useMemo(() => formatDateToIsoDate(new Date()), []);

  // Map counterparties by ID
  const partyMap = useMemo(() => {
    const map = new Map<string, (typeof parties)[0]>();
    parties.forEach((p) => map.set(p.id, p));
    return map;
  }, [parties]);

  // Telemetry KPIs
  const metrics = useMemo(() => {
    let activeCount = 0;
    let totalExecutions = 0;
    let monthlyRunRateInflowPaise = 0;
    let monthlyRunRateOutflowPaise = 0;

    recurringSchedules.forEach((s) => {
      totalExecutions += s.executionCount;
      if (s.status === 'ACTIVE') {
        activeCount++;

        // Normalize frequency to monthly equivalent in integer paise
        let monthlyPaise = 0;
        if (s.frequency === 'DAILY') {
          monthlyPaise = (s.totalAmountPaise * 30) / s.interval;
        } else if (s.frequency === 'WEEKLY') {
          monthlyPaise = Math.round((s.totalAmountPaise * 4.33) / s.interval);
        } else if (s.frequency === 'MONTHLY') {
          monthlyPaise = s.totalAmountPaise / s.interval;
        }

        if (s.type === 'TAKEN') {
          monthlyRunRateInflowPaise += Math.round(monthlyPaise);
        } else {
          monthlyRunRateOutflowPaise += Math.round(monthlyPaise);
        }
      }
    });

    return {
      activeCount,
      totalExecutions,
      monthlyRunRateInflowPaise,
      monthlyRunRateOutflowPaise,
    };
  }, [recurringSchedules]);

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return recurringSchedules.filter((s) => {
      const party = partyMap.get(s.partyId);
      const matchesSearch =
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (party && party.name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesFrequency = frequencyFilter === 'ALL' || s.frequency === frequencyFilter;
      const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;

      return matchesSearch && matchesFrequency && matchesStatus;
    });
  }, [recurringSchedules, partyMap, searchTerm, frequencyFilter, statusFilter]);

  // Execute a specific schedule immediately
  const handleExecuteNow = async (sched: RecurringSchedule) => {
    setExecutingScheduleId(sched.id);
    setActionSuccessMsg(null);
    try {
      const report = await executeRecurringScheduleNow(sched.id);
      if (report.success) {
        setActionSuccessMsg(
          `Successfully executed cycle #${sched.executionCount + 1} for "${sched.title}". Posted transaction ${report.transactionId} (${formatPaiseToInr(report.amountPaise)}).`
        );
      } else {
        alert(`Execution failed: ${report.error}`);
      }
    } catch (err: any) {
      alert(`Error executing schedule: ${err.message}`);
    } finally {
      setExecutingScheduleId(null);
    }
  };

  // Toggle pause/active
  const handleToggleStatus = async (sched: RecurringSchedule) => {
    const nextStatus: ScheduleStatus = sched.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const updated: RecurringSchedule = {
      ...sched,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };
    await saveRecurringSchedule(updated);
  };

  // Process all due schedules
  const handleProcessAllDue = async () => {
    setIsProcessing(true);
    setActionSuccessMsg(null);
    try {
      const result = await processDueRecurringSchedules();
      if (result.processedCount > 0) {
        setActionSuccessMsg(
          `Batch processed ${result.processedCount} due recurring schedules cleanly into canonical journal transactions.`
        );
      } else {
        setActionSuccessMsg('No active schedules are currently due for execution.');
      }
    } catch (err: any) {
      alert(`Failed to process due schedules: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Active Schedules */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs relative flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Active Schedules
            </span>
            <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600 border border-indigo-100">
              <CalendarClock className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
              {metrics.activeCount}
              <span className="text-xs font-normal text-slate-500 ml-1.5">
                / {recurringSchedules.length} total
              </span>
            </div>
            <div className="text-[11px] text-indigo-700 font-medium mt-1">
              Autonomous interval engine
            </div>
          </div>
        </div>

        {/* 2. Monthly Projected Collections (TAKEN) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs relative flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Monthly Inflow Run-Rate
            </span>
            <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100">
              <ArrowDownLeft className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 tracking-tight">
              {formatPaiseToInr(metrics.monthlyRunRateInflowPaise)}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-1">
              Automated repayment collections
            </div>
          </div>
        </div>

        {/* 3. Monthly Projected Outflows (GIVEN) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs relative flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Monthly Outflow Run-Rate
            </span>
            <div className="p-1.5 bg-rose-50 rounded-lg text-rose-600 border border-rose-100">
              <ArrowUpRight className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tabular-nums text-rose-700 tracking-tight">
              {formatPaiseToInr(metrics.monthlyRunRateOutflowPaise)}
            </div>
            <div className="text-[11px] text-rose-700 font-medium mt-1">
              Scheduled supplier disbursements
            </div>
          </div>
        </div>

        {/* 4. Total Executions Completed */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs relative flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Ledger Postings Done
            </span>
            <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600 border border-amber-100">
              <RotateCcw className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
              {metrics.totalExecutions}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              {pendingDueSchedulesCount > 0 ? (
                <span className="text-amber-700 font-semibold">
                  ⚠️ {pendingDueSchedulesCount} schedule(s) due today
                </span>
              ) : (
                'All schedules up to date'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Process Notification Banner */}
      {lastAutoProcessResult && lastAutoProcessResult.processedCount > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            <span>
              <strong className="font-semibold">Autonomous Scheduler Catch-Up:</strong>{' '}
              {lastAutoProcessResult.processedCount} due recurring entries were automatically posted to the financial journal with split reconciliation (Δ=0).
            </span>
          </div>
          <button
            type="button"
            onClick={clearLastAutoProcessResult}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-1 rounded hover:bg-emerald-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Action Success Alert */}
      {actionSuccessMsg && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-indigo-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-indigo-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMsg(null)}
            className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold px-2 py-1 rounded hover:bg-indigo-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Container / Table View */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        {/* Toolbar Header */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-slate-50/60">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="size-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search schedules or party..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-lg pl-8 pr-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 w-52"
              />
            </div>

            {/* Frequency Filter */}
            <select
              value={frequencyFilter}
              onChange={(e) => setFrequencyFilter(e.target.value as any)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Frequencies</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {pendingDueSchedulesCount > 0 && (
              <Button
                type="button"
                variant="amber"
                size="sm"
                icon={<Play className="size-3.5" />}
                loading={isProcessing}
                onClick={handleProcessAllDue}
                className="text-xs"
                aria-label="Process all due recurring transactions"
              >
                Run {pendingDueSchedulesCount} Due Now
              </Button>
            )}

            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={<Plus className="size-3.5" />}
              onClick={() => setIsCreateModalOpen(true)}
              className="text-xs"
              aria-label="Create new recurring transaction schedule"
            >
              Create Schedule
            </Button>
          </div>
        </div>

        {/* Schedules Table */}
        {filteredSchedules.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-3 bg-slate-100 rounded-full text-slate-500 mb-3">
              <CalendarClock className="size-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No recurring schedules found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto text-pretty">
              Set up automated daily, weekly, or monthly entries with split parity guarantees to handle recurring contracts, rent, or salaries.
            </p>
            <div className="mt-4">
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={<Plus className="size-3.5" />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                Create Schedule
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Schedule / Entity</th>
                  <th className="py-2.5 px-3">Cadence & Timing</th>
                  <th className="py-2.5 px-3">Movement & Amount</th>
                  <th className="py-2.5 px-3">Payment Split Rails</th>
                  <th className="py-2.5 px-3">Next Execution</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSchedules.map((s) => {
                  const party = partyMap.get(s.partyId);
                  const isDue = isScheduleDue(s, todayStr);
                  const isExecuting = executingScheduleId === s.id;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Title & Party */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 text-sm">{s.title}</div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                          {party ? `${party.name} (${party.relation})` : s.partyId}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{s.id}</div>
                      </td>

                      {/* Cadence */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          <Clock className="size-3 text-slate-500" />
                          {s.frequency === 'DAILY'
                            ? s.interval === 1
                              ? 'Daily'
                              : `Every ${s.interval} Days`
                            : s.frequency === 'WEEKLY'
                            ? `Weekly (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][s.dayOfWeek ?? 1]})`
                            : `Monthly (Day ${s.dayOfMonth ?? 1})`}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Cycle {s.executionCount}
                          {s.maxExecutions ? ` / ${s.maxExecutions}` : ''} posted
                        </div>
                      </td>

                      {/* Direction & Amount */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.type === 'TAKEN'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {s.type === 'TAKEN' ? (
                            <ArrowDownLeft className="size-3 text-emerald-600" />
                          ) : (
                            <ArrowUpRight className="size-3 text-rose-600" />
                          )}
                          {s.type === 'TAKEN' ? 'TAKEN (INFLOW)' : 'GIVEN (OUTFLOW)'}
                        </span>
                        <div
                          className={`text-sm font-bold font-mono tabular-nums mt-1 ${
                            s.type === 'TAKEN' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {s.type === 'TAKEN' ? '+ ' : '- '}
                          {formatPaiseToInr(s.totalAmountPaise)}
                        </div>
                      </td>

                      {/* Split Rails */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {s.splits.map((spl, idx) => (
                            <Badge key={idx} variant="neutral" size="sm">
                              {spl.method}: {formatPaiseToInr(spl.amountPaise)}
                            </Badge>
                          ))}
                        </div>
                        {s.notes && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs mt-1">
                            {s.notes}
                          </div>
                        )}
                      </td>

                      {/* Next Execution */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-mono font-medium text-slate-800">
                          {s.nextExecutionDate}
                        </div>
                        {isDue && (
                          <span className="inline-block mt-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            Due for Execution
                          </span>
                        )}
                        {!isDue && s.status === 'ACTIVE' && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {s.autoProcess ? 'Auto-runs on date' : 'Manual run'}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            s.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : s.status === 'PAUSED'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {s.status === 'ACTIVE' && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              icon={<Play className="size-3 text-emerald-600" />}
                              loading={isExecuting}
                              onClick={() => handleExecuteNow(s)}
                              className="text-[11px] h-7 px-2"
                              title="Execute schedule cycle immediately"
                              aria-label={`Execute schedule ${s.title} now`}
                            >
                              Run Now
                            </Button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(s)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title={s.status === 'ACTIVE' ? 'Pause schedule' : 'Resume schedule'}
                            aria-label={`${s.status === 'ACTIVE' ? 'Pause' : 'Resume'} schedule ${s.title}`}
                          >
                            {s.status === 'ACTIVE' ? (
                              <Pause className="size-3.5 text-amber-600" />
                            ) : (
                              <Play className="size-3.5 text-emerald-600" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete recurring schedule "${s.title}"?`)) {
                                deleteRecurringSchedule(s.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete recurring schedule"
                            aria-label={`Delete schedule ${s.title}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Recurring Schedule Modal */}
      <CreateRecurringModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};
