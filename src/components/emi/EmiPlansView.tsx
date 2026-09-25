import React, { useState } from 'react';
import { useLedger } from '../../db/repository-context';
import { EmiRestructuringPlan, InstallmentScheduleItem } from '../../core/models/emi-plan';
import { formatPaiseToInr, parseRupeesToPaise } from '../../core/formatters/currency';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import {
  CalendarCheck2,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CreditCard,
} from 'lucide-react';

interface EmiPlansViewProps {
  onOpenCreateEmiModal: () => void;
}

export const EmiPlansView: React.FC<EmiPlansViewProps> = ({ onOpenCreateEmiModal }) => {
  const { emiPlans, parties, settleInstallment } = useLedger();

  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(
    emiPlans[0]?.id || null
  );

  // Settlement Modal State
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [activePlan, setActivePlan] = useState<EmiRestructuringPlan | null>(null);
  const [activeInstallment, setActiveInstallment] = useState<InstallmentScheduleItem | null>(null);
  const [settlementRail, setSettlementRail] = useState<string>('UPI');
  const [paymentRefId, setPaymentRefId] = useState<string>('');
  const [lateFeeRupees, setLateFeeRupees] = useState<string>('0');

  const handleOpenSettle = (plan: EmiRestructuringPlan, item: InstallmentScheduleItem) => {
    setActivePlan(plan);
    setActiveInstallment(item);
    setSettlementRail('UPI');
    setPaymentRefId(`UPI-HDFC-${Math.floor(100000000000 + Math.random() * 900000000000)}`);
    setLateFeeRupees(
      item.lateFeeChargedPaise > 0 ? (item.lateFeeChargedPaise / 100).toString() : '0'
    );
    setSettleModalOpen(true);
  };

  const handleCommitSettlement = async () => {
    if (!activePlan || !activeInstallment) return;
    const lateFeePaise = parseRupeesToPaise(lateFeeRupees);
    const railDescription = `${settlementRail} Ref #${paymentRefId || 'UNTRACKED'}`;

    await settleInstallment(
      activePlan.id,
      activeInstallment.number,
      railDescription,
      lateFeePaise
    );

    setSettleModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Loans & Monthly EMI Plans
          </h2>
          <p className="text-xs text-slate-500">
            Track loans, monthly installments, due dates, and repayment progress
          </p>
        </div>

        <Button
          type="button"
          variant="amber"
          size="sm"
          icon={<Plus className="size-4" />}
          onClick={onOpenCreateEmiModal}
        >
          Create EMI Plan
        </Button>
      </div>

      {/* Plans Stack */}
      {emiPlans.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
          <CalendarCheck2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No EMI contracts active.</p>
          <p className="text-xs text-slate-400 mt-1">
            Click "Create Restructuring Contract" to restructure existing debt into deterministic schedules.
          </p>
        </div>
      ) : (
        emiPlans.map((plan) => {
          const party = parties.find((p) => p.id === plan.partyId);
          const isExpanded = expandedPlanId === plan.id;
          const paidCount = plan.installments.filter((i) => i.status === 'Paid').length;
          const overdueCount = plan.installments.filter((i) => i.status === 'Overdue').length;

          return (
            <div
              key={plan.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs"
            >
              {/* Plan Card Header */}
              <div
                onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                className="p-4 bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer border-b border-slate-200"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-100 rounded-xl text-amber-800 border border-amber-200 shrink-0 mt-0.5">
                    <CalendarCheck2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                        {plan.id}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">{plan.title}</h3>
                      <Badge
                        variant={plan.status === 'Settled' ? 'trustGreen' : 'emi'}
                        size="sm"
                      >
                        {plan.status}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-600 font-mono">
                      <span className="font-sans font-medium text-slate-800">
                        Party: {party ? party.name : plan.partyId}
                      </span>
                      <span>•</span>
                      <span>Started: {plan.startDate}</span>
                      <span>•</span>
                      <span>
                        Progress: {paidCount} / {plan.installmentsCount} Installments
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 shrink-0">
                  <div className="text-right">
                    <div className="text-[11px] text-slate-500 font-sans">Total Contract Value</div>
                    <div className="text-base font-bold font-mono text-slate-900 tabular-nums">
                      {formatPaiseToInr(plan.totalPayablePaise)}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Principal: {formatPaiseToInr(plan.totalPrincipalPaise)} + Interest:{' '}
                      {formatPaiseToInr(plan.totalInterestPaise)}
                    </div>
                  </div>

                  <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </div>
              </div>

              {/* Installment Schedule Table */}
              {isExpanded && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <div className="font-semibold text-slate-800">
                      Installment Breakdown & Terminal Remainder Allocation:
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      {overdueCount > 0 && (
                        <span className="text-rose-600 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {overdueCount} Overdue
                        </span>
                      )}
                      <span className="text-emerald-700 font-bold">
                        {paidCount} Settled
                      </span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Due Date</th>
                          <th className="py-2.5 px-3 text-right">Principal</th>
                          <th className="py-2.5 px-3 text-right">Interest</th>
                          <th className="py-2.5 px-3 text-right">Installment Amount</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Settlement Audit & Rail</th>
                          <th className="py-2.5 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                        {plan.installments.map((inst, idx) => {
                          const isTerminal = idx === plan.installments.length - 1;
                          const isPaid = inst.status === 'Paid';
                          const isOverdue = inst.status === 'Overdue';

                          return (
                            <tr
                              key={inst.number}
                              className={
                                isPaid
                                  ? 'bg-emerald-50/20'
                                  : isOverdue
                                  ? 'bg-rose-50/30'
                                  : isTerminal
                                  ? 'bg-amber-50/30'
                                  : 'hover:bg-slate-50'
                              }
                            >
                              <td className="py-2.5 px-3 font-semibold">
                                {inst.number}
                                {isTerminal && (
                                  <span className="text-[10px] text-amber-700 font-sans font-normal ml-1">
                                    [Term]
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">{inst.dueDate}</td>
                              <td className="py-2.5 px-3 text-right">
                                {formatPaiseToInr(inst.principalPaise)}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {formatPaiseToInr(inst.interestPaise)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                {formatPaiseToInr(inst.totalAmountPaise)}
                              </td>
                              <td className="py-2.5 px-3 font-sans">
                                {isPaid ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                    <CheckCircle2 className="w-3 h-3" /> Paid
                                  </span>
                                ) : isOverdue ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                                    <AlertTriangle className="w-3 h-3" /> Overdue
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                    <Clock className="w-3 h-3" /> Pending
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-[11px] font-sans text-slate-500 max-w-xs truncate">
                                {isPaid
                                  ? `Settled ${inst.paidDate} via ${inst.paidVia || 'Direct'}`
                                  : inst.lateFeePolicyText}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {!isPaid ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenSettle(plan, inst)}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded shadow-2xs transition-colors cursor-pointer"
                                  >
                                    Settle
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-slate-400 font-sans">Settled</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Settle Installment Modal */}
      {settleModalOpen && activePlan && activeInstallment && (
        <Modal
          isOpen={settleModalOpen}
          onClose={() => setSettleModalOpen(false)}
          title={`Settle Installment #${activeInstallment.number}`}
          subtitle={`${activePlan.title} • Due: ${activeInstallment.dueDate}`}
          maxWidth="md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSettleModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="success"
                onClick={handleCommitSettlement}
                icon={<CreditCard className="w-4 h-4" />}
              >
                Confirm Settlement
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Scheduled Installment Amount:</span>
                <span className="font-mono font-bold">
                  {formatPaiseToInr(activeInstallment.totalAmountPaise)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Late Penalty Policy:</span>
                <span className="font-sans text-slate-700">
                  {activeInstallment.lateFeePolicyText}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Settlement Payment Rail
              </label>
              <select
                value={settlementRail}
                onChange={(e) => setSettlementRail(e.target.value)}
                className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="UPI">UPI Digital Rail</option>
                <option value="Bank (NEFT)">Bank NEFT Clearing</option>
                <option value="Bank (RTGS)">Bank RTGS Instant</option>
                <option value="Cheque">CTS-2010 Cheque</option>
                <option value="Cash">Physical Cash Receipt</option>
              </select>
            </div>

            <Input
              label="Payment Rail Reference / UTR Number"
              placeholder="e.g. UPI-HDFC-9910283719"
              value={paymentRefId}
              onChange={(e) => setPaymentRefId(e.target.value)}
              required
            />

            <Input
              label="Late Penalty Charged (INR) - If applicable"
              placeholder="0.00"
              value={lateFeeRupees}
              onChange={(e) => setLateFeeRupees(e.target.value)}
            />
          </div>
        </Modal>
      )}
    </div>
  );
};
