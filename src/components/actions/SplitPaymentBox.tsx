import React from 'react';
import { Plus, Trash2, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { PaymentRail } from '../../core/models/transaction';
import { formatPaiseToInr, parseRupeesToPaise } from '../../core/formatters/currency';
import { Button } from '../ui/Button';
import { ProviderIcon } from '../ui/ProviderIcon';

export interface SplitRowState {
  id: string;
  method: PaymentRail;
  provider?: string;
  amountPaise: number;
  paymentReferenceId: string;
}

interface SplitPaymentBoxProps {
  totalAmountPaise: number;
  splits: SplitRowState[];
  onChange: (splits: SplitRowState[]) => void;
  movementType: 'GIVEN' | 'TAKEN';
}

const POPULAR_PROVIDERS = [
  { value: '', label: 'Auto / Generic' },
  { value: 'phonepe', label: 'PhonePe' },
  { value: 'gpay', label: 'Google Pay' },
  { value: 'paytm', label: 'Paytm' },
  { value: 'sbi', label: 'State Bank of India (SBI)' },
  { value: 'hdfc', label: 'HDFC Bank' },
  { value: 'icici', label: 'ICICI Bank' },
  { value: 'axis', label: 'Axis Bank' },
  { value: 'kotak', label: 'Kotak Mahindra' },
  { value: 'mada', label: 'mada (Saudi)' },
  { value: 'stcpay', label: 'stc pay' },
  { value: 'snb', label: 'Saudi National Bank' },
  { value: 'alrajhi', label: 'Al Rajhi Bank' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
];

export const SplitPaymentBox: React.FC<SplitPaymentBoxProps> = ({
  totalAmountPaise,
  splits,
  onChange,
  movementType,
}) => {
  const allocatedSumPaise = splits.reduce((sum, s) => sum + (Number(s.amountPaise) || 0), 0);
  const deltaPaise = totalAmountPaise - allocatedSumPaise;
  const isReconciled = deltaPaise === 0 && totalAmountPaise > 0;

  const handleAddSplit = () => {
    const newSplit: SplitRowState = {
      id: `spl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      method: 'UPI',
      provider: 'gpay',
      amountPaise: deltaPaise > 0 ? deltaPaise : 0,
      paymentReferenceId: '',
    };
    onChange([...splits, newSplit]);
  };

  const handleRemoveSplit = (index: number) => {
    if (splits.length <= 1) return;
    const updated = splits.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUpdateSplit = (index: number, field: keyof SplitRowState, value: any) => {
    const updated = [...splits];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    onChange(updated);
  };

  const handleAutoBalance = () => {
    if (splits.length === 0) {
      handleAddSplit();
      return;
    }
    const lastIndex = splits.length - 1;
    const currentLastAmount = splits[lastIndex].amountPaise || 0;
    const updated = [...splits];
    updated[lastIndex] = {
      ...updated[lastIndex],
      amountPaise: Math.max(0, currentLastAmount + deltaPaise),
    };
    onChange(updated);
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-900 tracking-tight">
            Payment Method & References
          </h4>
          <p className="text-[11px] text-slate-500">
            Specify payment methods, provider, and reference / UTR numbers.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          icon={<Plus className="size-3.5" />}
          onClick={handleAddSplit}
          aria-label="Add payment method split"
        >
          Add Split
        </Button>
      </div>

      {/* Split Rows */}
      <div className="space-y-2">
        {splits.map((split, index) => {
          return (
            <div
              key={split.id}
              className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-2"
            >
              {/* Method Selector */}
              <div className="w-full sm:w-28 shrink-0">
                <select
                  value={split.method}
                  onChange={(e) =>
                    handleUpdateSplit(index, 'method', e.target.value as PaymentRail)
                  }
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-md py-1.5 px-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="UPI">UPI</option>
                  <option value="Bank">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Wallet">Wallet</option>
                </select>
              </div>

              {/* Specific Provider Selector with Icon */}
              <div className="w-full sm:w-44 shrink-0 flex items-center gap-1.5">
                <ProviderIcon provider={split.provider} method={split.method} size="sm" />
                <select
                  value={split.provider || ''}
                  onChange={(e) => handleUpdateSplit(index, 'provider', e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-md py-1.5 px-1.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-800"
                >
                  {POPULAR_PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount input in Rupees */}
              <div className="w-full sm:w-32 shrink-0 relative">
                <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-mono">
                  ₹
                </span>
                <input
                  type="text"
                  placeholder="0.00"
                  value={split.amountPaise ? (split.amountPaise / 100).toString() : ''}
                  onChange={(e) => {
                    const paise = parseRupeesToPaise(e.target.value);
                    handleUpdateSplit(index, 'amountPaise', paise);
                  }}
                  className="w-full pl-6 pr-2 py-1.5 text-xs font-mono tabular-nums text-slate-900 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* External Reference ID (UTR / Cheque / Ref) */}
              <div className="grow min-w-0">
                <input
                  type="text"
                  placeholder={
                    split.method === 'UPI'
                      ? 'UTR / Reference ID'
                      : split.method === 'Cheque'
                      ? 'Cheque Number'
                      : 'Reference / Note'
                  }
                  value={split.paymentReferenceId}
                  onChange={(e) =>
                    handleUpdateSplit(index, 'paymentReferenceId', e.target.value)
                  }
                  className="w-full py-1.5 px-2 text-xs font-mono text-slate-800 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              {/* Delete Split Action */}
              {splits.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveSplit(index)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer transition-colors"
                  aria-label="Remove split"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Split Parity Summary */}
      <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          {isReconciled ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span>Full amount allocated</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
              <AlertTriangle className="size-4 text-amber-600" />
              <span>
                Remaining to allocate: {formatPaiseToInr(Math.abs(deltaPaise))}
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-500">
            Total Allocated:{' '}
            <strong className="font-mono text-slate-900">
              {formatPaiseToInr(allocatedSumPaise)}
            </strong>
          </span>

          {!isReconciled && totalAmountPaise > 0 && (
            <button
              type="button"
              onClick={handleAutoBalance}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline flex items-center gap-1"
            >
              <Sparkles className="size-3.5" />
              <span>Balance Difference</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
