import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { PartySelectDropdown } from '../actions/PartySelectDropdown';
import { useLedger } from '../../db/repository-context';
import {
  RecurringSchedule,
  RecurringSplitTemplate,
  ScheduleFrequency,
} from '../../core/models/recurring-schedule';
import { MovementType, PaymentRail } from '../../core/models/transaction';
import { parseRupeesToPaise, formatPaiseToInr } from '../../core/formatters/currency';
import { validateSplitAllocations } from '../../core/math/balance';
import { calculateNextExecutionDate, formatDateToIsoDate } from '../../core/math/scheduler';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Trash2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface CreateRecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPartyId?: string;
}

export const CreateRecurringModal: React.FC<CreateRecurringModalProps> = ({
  isOpen,
  onClose,
  defaultPartyId,
}) => {
  const { parties, saveRecurringSchedule, tenantId } = useLedger();

  const [title, setTitle] = useState('');
  const [partyId, setPartyId] = useState(defaultPartyId || (parties[0]?.id ?? ''));
  const [type, setType] = useState<MovementType>('TAKEN');
  const [frequency, setFrequency] = useState<ScheduleFrequency>('MONTHLY');
  const [interval, setInterval] = useState<number>(1);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [dayOfWeek, setDayOfWeek] = useState<number>(1); // Monday
  const [totalRupeesInput, setTotalRupeesInput] = useState('');
  const [startDate, setStartDate] = useState(formatDateToIsoDate(new Date()));
  const [endDate, setEndDate] = useState('');
  const [maxExecutionsInput, setMaxExecutionsInput] = useState('');
  const [autoProcess, setAutoProcess] = useState(true);
  const [notes, setNotes] = useState('');

  const [splits, setSplits] = useState<
    Array<{ id: string; method: PaymentRail; amountRupees: string; referencePrefix: string }>
  >([
    {
      id: `tpl-1`,
      method: 'UPI',
      amountRupees: '',
      referencePrefix: 'AUTOPAY',
    },
  ]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalPaise = parseRupeesToPaise(totalRupeesInput);
  const splitTemplates: RecurringSplitTemplate[] = splits.map((s) => ({
    id: s.id,
    method: s.method,
    amountPaise: parseRupeesToPaise(s.amountRupees),
    paymentReferencePrefix: s.referencePrefix.trim() || undefined,
    initiatedBy: type === 'TAKEN' ? 'Debtor' : 'Lender',
  }));

  const splitValidation = validateSplitAllocations(totalPaise, splitTemplates);
  const isReconciled = splitValidation.isValid && totalPaise > 0 && partyId !== '' && title.trim() !== '';

  const handleTotalAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setTotalRupeesInput(raw);
    if (splits.length === 1) {
      setSplits([{ ...splits[0], amountRupees: raw }]);
    }
  };

  const addSplitRow = () => {
    const allocatedPaise = splitTemplates.reduce((sum, s) => sum + s.amountPaise, 0);
    const remainingPaise = Math.max(0, totalPaise - allocatedPaise);
    const remainingRupees = remainingPaise > 0 ? (remainingPaise / 100).toString() : '';

    setSplits([
      ...splits,
      {
        id: `tpl-${Date.now()}`,
        method: 'Bank',
        amountRupees: remainingRupees,
        referencePrefix: 'AUTOPAY',
      },
    ]);
  };

  const removeSplitRow = (idx: number) => {
    if (splits.length <= 1) return;
    setSplits(splits.filter((_, i) => i !== idx));
  };

  const updateSplit = (idx: number, field: string, val: string) => {
    setSplits(
      splits.map((s, i) => {
        if (i !== idx) return s;
        return { ...s, [field]: val };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!partyId) {
      setErrorMsg('Please select a valid counterparty entity.');
      return;
    }

    if (!title.trim()) {
      setErrorMsg('Please enter a descriptive corporate title for this schedule.');
      return;
    }

    if (totalPaise <= 0) {
      setErrorMsg('Total schedule amount must be greater than zero.');
      return;
    }

    if (!splitValidation.isValid) {
      setErrorMsg(
        `Split reconciliation failed (Law 2): Discrepancy is ${formatPaiseToInr(
          splitValidation.deltaPaise
        )}.`
      );
      return;
    }

    const randomHex = Math.floor(100000 + Math.random() * 900000).toString();
    const scheduleId = `RB-SCHED-${randomHex}`;

    const nextExecutionDate = calculateNextExecutionDate(
      startDate,
      frequency,
      interval,
      frequency === 'MONTHLY' ? dayOfMonth : undefined,
      frequency === 'WEEKLY' ? dayOfWeek : undefined
    );

    const maxExecutions = maxExecutionsInput ? parseInt(maxExecutionsInput, 10) : undefined;

    const newSchedule: RecurringSchedule = {
      id: scheduleId,
      tenantId,
      partyId,
      title: title.trim(),
      type,
      frequency,
      interval: Math.max(1, interval),
      dayOfMonth: frequency === 'MONTHLY' ? dayOfMonth : undefined,
      dayOfWeek: frequency === 'WEEKLY' ? dayOfWeek : undefined,
      totalAmountPaise: totalPaise,
      splits: splitTemplates,
      startDate,
      endDate: endDate.trim() || undefined,
      nextExecutionDate: startDate <= formatDateToIsoDate(new Date()) ? startDate : nextExecutionDate,
      executionCount: 0,
      maxExecutions,
      status: 'ACTIVE',
      notes: notes.trim(),
      autoProcess,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin@rabooks.internal',
    };

    try {
      await saveRecurringSchedule(newSchedule);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save recurring schedule.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Recurring Schedule"
      subtitle="Automatic transaction entries at set daily, weekly, or monthly intervals"
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span>Entries will be created automatically on due dates</span>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={type === 'TAKEN' ? 'success' : 'danger'}
              disabled={!isReconciled}
              onClick={handleSubmit}
            >
              Save Schedule
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div
            role="alert"
            className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg p-3 flex items-start gap-2"
          >
            <AlertCircle className="size-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Schedule Direction Toggle */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Cashflow Movement Direction
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType('TAKEN')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                type === 'TAKEN'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-200'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ArrowDownLeft className="size-4 text-emerald-600" />
              <span>TAKEN (Payment Collection / Inflow)</span>
            </button>
            <button
              type="button"
              onClick={() => setType('GIVEN')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                type === 'GIVEN'
                  ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-200'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ArrowUpRight className="size-4 text-rose-600" />
              <span>GIVEN (Capital Disbursement / Outflow)</span>
            </button>
          </div>
        </div>

        {/* Schedule Title & Counterparty */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Schedule Title / Purpose"
            placeholder="e.g. Monthly Commercial Warehouse Retainer"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Party / Counterparty <span className="text-rose-500">*</span>
            </label>
            <PartySelectDropdown
              value={partyId}
              onChange={(newPartyId) => setPartyId(newPartyId)}
            />
          </div>
        </div>

        {/* Frequency & Timing Configuration */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
          <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
            <Clock className="size-4 text-indigo-600" />
            <span>Interval Timing & Recurrence Rules</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as ScheduleFrequency)}
                className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Interval (Every N {frequency === 'DAILY' ? 'days' : frequency === 'WEEKLY' ? 'weeks' : 'months'})
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={interval}
                onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value || '1', 10)))}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {frequency === 'MONTHLY' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Day of Month (1 - 31)
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={dayOfMonth}
                  onChange={(e) =>
                    setDayOfMonth(Math.min(31, Math.max(1, parseInt(e.target.value || '1', 10))))
                  }
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}

            {frequency === 'WEEKLY' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Day of Week</label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(parseInt(e.target.value, 10))}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                  <option value={0}>Sunday</option>
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <Input
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              type="date"
              label="End Date (Optional)"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              helper="Leaves ongoing if left blank"
            />
            <Input
              type="number"
              label="Max Cycles Limit"
              placeholder="e.g. 12"
              value={maxExecutionsInput}
              onChange={(e) => setMaxExecutionsInput(e.target.value)}
              helper="Auto-completes after N cycles"
            />
          </div>
        </div>

        {/* Financial Amount & Split Allocation */}
        <div className="space-y-3">
          <Input
            label="Total Per-Cycle Amount (INR)"
            prefixSymbol="₹"
            placeholder="0.00"
            value={totalRupeesInput}
            onChange={handleTotalAmountChange}
            helper={`Base integer units: ${totalPaise.toLocaleString()} paise`}
            required
          />

          {/* Payment Split Rows */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">
                Payment Rail Allocation Templates (Law 2)
              </span>
              <button
                type="button"
                onClick={addSplitRow}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>Add Rail Split</span>
              </button>
            </div>

            <div className="space-y-2">
              {splits.map((s, idx) => (
                <div key={s.id} className="flex items-center gap-2">
                  <select
                    value={s.method}
                    onChange={(e) => updateSplit(idx, 'method', e.target.value)}
                    className="text-xs font-medium bg-white border border-slate-300 rounded-lg p-2 w-28 shrink-0"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Bank">Bank (NEFT/RTGS)</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>

                  <div className="relative grow">
                    <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-slate-400 text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      placeholder="Amount"
                      value={s.amountRupees}
                      onChange={(e) => updateSplit(idx, 'amountRupees', e.target.value)}
                      className="w-full text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-lg pl-6 pr-2 py-2 focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Ref Prefix"
                    value={s.referencePrefix}
                    onChange={(e) => updateSplit(idx, 'referencePrefix', e.target.value)}
                    className="text-xs font-mono bg-white border border-slate-300 rounded-lg px-2 py-2 w-32 shrink-0 hidden sm:block"
                    title="External reference code prefix"
                  />

                  {splits.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSplitRow(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove split leg"
                      aria-label="Remove split row"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Split Parity Indicator */}
            <div
              className={`text-xs font-mono tabular-nums p-2 rounded-lg flex items-center justify-between ${
                splitValidation.isValid
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <span>
                {splitValidation.isValid ? '✓ Split Leg Parity Reconciled' : '⚠️ Split Discrepancy'}
              </span>
              <span>Δ = {formatPaiseToInr(splitValidation.deltaPaise)}</span>
            </div>
          </div>
        </div>

        {/* Auto-Process Option & Notes */}
        <div className="space-y-3 pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoProcess}
              onChange={(e) => setAutoProcess(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 size-4"
            />
            <div>
              <span className="text-xs font-semibold text-slate-800 block">
                Automatic Background Execution
              </span>
              <span className="text-[11px] text-slate-500 block">
                When enabled, the raBooks autonomous scheduler automatically generates and posts canonical journal entries as dates fall due without requiring manual intervention.
              </span>
            </div>
          </label>

          <Input
            label="Internal Ledger Notes (Optional)"
            placeholder="Add legal memo, purpose, or contractual references..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
};
