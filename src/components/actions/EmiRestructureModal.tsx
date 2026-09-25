import React, { useState, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { PartySelectDropdown } from './PartySelectDropdown';
import { useLedger } from '../../db/repository-context';
import { EmiRestructuringPlan, InterestMode, LatePenaltyPolicy } from '../../core/models/emi-plan';
import { generateDeterministicAmortization } from '../../core/math/amortization';
import { parseRupeesToPaise, formatPaiseToInr } from '../../core/formatters/currency';
import { validateEmiPlanInvariants } from '../../core/validation/invariants';
import { Calculator, CheckCircle2, AlertCircle } from 'lucide-react';

interface EmiRestructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPartyId?: string;
}

export const EmiRestructureModal: React.FC<EmiRestructureModalProps> = ({
  isOpen,
  onClose,
  defaultPartyId,
}) => {
  const { parties, saveEmiPlan, tenantId } = useLedger();

  const [partyId, setPartyId] = useState<string>(defaultPartyId || '');
  const [title, setTitle] = useState<string>('');
  const [principalRupees, setPrincipalRupees] = useState<string>('150000');
  const [tenureMonths, setTenureMonths] = useState<number>(6);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [interestMode, setInterestMode] = useState<InterestMode>('monthly');
  const [interestRatePercent, setInterestRatePercent] = useState<string>('1.50');
  const [flatInterestRupees, setFlatInterestRupees] = useState<string>('5000');
  const [lateFeeType, setLateFeeType] = useState<LatePenaltyPolicy>('flat');
  const [lateFeeRupees, setLateFeeRupees] = useState<string>('500');
  const [graceDays, setGraceDays] = useState<number>(5);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize party if not selected
  React.useEffect(() => {
    if (isOpen) {
      if (!partyId && parties.length > 0) {
        setPartyId(defaultPartyId || parties[0].id);
      }
      setErrorMsg(null);
    }
  }, [isOpen, defaultPartyId, parties, partyId]);

  const principalPaise = parseRupeesToPaise(principalRupees);
  const lateFeePaise = parseRupeesToPaise(lateFeeRupees);
  const interestValue =
    interestMode === 'monthly'
      ? parseFloat(interestRatePercent) || 0
      : interestMode === 'flat'
      ? parseRupeesToPaise(flatInterestRupees)
      : 0;

  // Compute deterministic amortization with integer remainder absorption
  const calculationResult = useMemo(() => {
    if (principalPaise <= 0 || tenureMonths <= 1) {
      return null;
    }
    try {
      return generateDeterministicAmortization({
        principalPaise,
        tenureMonths,
        startDate,
        interestMode,
        interestValue,
        lateFeeType,
        lateFeePaise,
        graceDays,
      });
    } catch {
      return null;
    }
  }, [
    principalPaise,
    tenureMonths,
    startDate,
    interestMode,
    interestValue,
    lateFeeType,
    lateFeePaise,
    graceDays,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!partyId) {
      setErrorMsg('Please select a counterparty.');
      return;
    }

    if (!calculationResult) {
      setErrorMsg('Failed to compute amortization schedule. Verify principal and tenure.');
      return;
    }

    const planId = `EMI-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const selectedParty = parties.find((p) => p.id === partyId);
    const planTitle =
      title.trim() ||
      `${selectedParty?.name || 'Counterparty'} - ${tenureMonths}M Debt Restructuring Plan`;

    const plan: EmiRestructuringPlan = {
      id: planId,
      tenantId,
      partyId,
      title: planTitle,
      totalPrincipalPaise: principalPaise,
      interestType: interestMode,
      interestRatePercent: interestMode === 'monthly' ? parseFloat(interestRatePercent) || 0 : 0,
      totalInterestPaise: calculationResult.totalInterestPaise,
      totalPayablePaise: calculationResult.totalPayablePaise,
      installmentsCount: tenureMonths,
      startDate,
      lateFeeType,
      lateFeePaise,
      graceDays,
      status: 'Active',
      installments: calculationResult.schedule,
      createdAt: new Date().toISOString(),
    };

    const validation = validateEmiPlanInvariants(plan);
    if (!validation.valid) {
      setErrorMsg(validation.errors.join(' '));
      return;
    }

    try {
      await saveEmiPlan(plan);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save restructuring plan.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Loan / EMI Plan"
      subtitle="Structure loan into monthly installments with interest and due dates"
      maxWidth="4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span>Exact monthly breakdown calculated</span>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="amber"
              onClick={handleSubmit}
              disabled={!calculationResult}
              icon={<Calculator className="size-4" />}
            >
              Save EMI Plan
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="size-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Party / Counterparty <span className="text-rose-500">*</span>
            </label>
            <PartySelectDropdown
              value={partyId}
              onChange={(newPartyId) => setPartyId(newPartyId)}
            />
          </div>

          <div className="md:col-span-2">
            <Input
              label="Loan / Plan Title"
              placeholder="e.g. Equipment Loan, Commercial Advance"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Restructured Principal (INR)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm text-slate-400 font-mono">
                ₹
              </span>
              <input
                type="text"
                value={principalRupees}
                onChange={(e) => setPrincipalRupees(e.target.value)}
                className="w-full pl-7 pr-3 py-2 text-sm font-mono font-bold tabular-nums text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tenure Duration (Months)
            </label>
            <input
              type="number"
              min="2"
              max="60"
              value={tenureMonths}
              onChange={(e) => setTenureMonths(Math.max(2, parseInt(e.target.value, 10) || 2))}
              className="w-full px-3 py-2 text-sm font-mono text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Commencement Date
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Interest & Late Penalty Matrix */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Interest Yield Mode
              </label>
              <select
                value={interestMode}
                onChange={(e) => setInterestMode(e.target.value as InterestMode)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="monthly">Simple Monthly %</option>
                <option value="flat">Fixed Flat Amount</option>
                <option value="zero">Zero Interest (0%)</option>
              </select>
            </div>

            {interestMode === 'monthly' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Monthly Rate (% p.m.)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={interestRatePercent}
                    onChange={(e) => setInterestRatePercent(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                  />
                  <span className="absolute right-2 top-1.5 text-xs text-slate-400 font-mono">
                    %
                  </span>
                </div>
              </div>
            )}

            {interestMode === 'flat' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Flat Interest Total (INR)
                </label>
                <div className="relative">
                  <span className="absolute left-2 top-1.5 text-xs text-slate-400 font-mono">
                    ₹
                  </span>
                  <input
                    type="text"
                    value={flatInterestRupees}
                    onChange={(e) => setFlatInterestRupees(e.target.value)}
                    className="w-full pl-5 pr-2 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Late Penalty Policy
              </label>
              <select
                value={lateFeeType}
                onChange={(e) => setLateFeeType(e.target.value as LatePenaltyPolicy)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="flat">Fixed Flat Fine</option>
                <option value="per_day">Daily Charge / Day</option>
                <option value="none">No Late Fee</option>
              </select>
            </div>

            {lateFeeType !== 'none' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Grace Period (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={graceDays}
                  onChange={(e) => setGraceDays(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                />
              </div>
            )}
          </div>
        </div>

        {/* Calculation Summary Bar */}
        {calculationResult && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-amber-900 font-medium">Principal: </span>
              <span className="font-mono font-bold text-slate-900">
                {formatPaiseToInr(principalPaise)}
              </span>
            </div>
            <div>
              <span className="text-amber-900 font-medium">Total Interest: </span>
              <span className="font-mono font-bold text-amber-800">
                {formatPaiseToInr(calculationResult.totalInterestPaise)}
              </span>
            </div>
            <div>
              <span className="text-amber-900 font-medium">Total Payable: </span>
              <span className="font-mono font-bold text-emerald-800">
                {formatPaiseToInr(calculationResult.totalPayablePaise)}
              </span>
            </div>
            <div>
              <span className="text-amber-900 font-medium">Monthly Due: </span>
              <span className="font-mono font-bold text-slate-900">
                {formatPaiseToInr(calculationResult.schedule[0]?.totalAmountPaise || 0)} / mo
              </span>
            </div>
          </div>
        )}

        {/* Amortization Schedule Table Preview */}
        {calculationResult && (
          <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Due Date</th>
                  <th className="py-2 px-3 text-right">Principal</th>
                  <th className="py-2 px-3 text-right">Interest</th>
                  <th className="py-2 px-3 text-right">Total Installment</th>
                  <th className="py-2 px-3">Late Policy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {calculationResult.schedule.map((item, idx) => {
                  const isTerminal = idx === calculationResult.schedule.length - 1;
                  return (
                    <tr
                      key={item.number}
                      className={isTerminal ? 'bg-amber-50/50 font-semibold' : 'hover:bg-slate-50'}
                    >
                      <td className="py-2 px-3">
                        {item.number}{' '}
                        {isTerminal && (
                          <span className="text-[10px] text-amber-700 font-sans font-normal ml-1">
                            (Terminal)
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">{item.dueDate}</td>
                      <td className="py-2 px-3 text-right">
                        {formatPaiseToInr(item.principalPaise)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {formatPaiseToInr(item.interestPaise)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        {formatPaiseToInr(item.totalAmountPaise)}
                      </td>
                      <td className="py-2 px-3 text-[11px] font-sans text-slate-500">
                        {item.lateFeePolicyText}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </form>
    </Modal>
  );
};
