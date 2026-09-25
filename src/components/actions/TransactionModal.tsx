import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { SplitPaymentBox, SplitRowState } from './SplitPaymentBox';
import { PartySelectDropdown } from './PartySelectDropdown';
import { useLedger } from '../../db/repository-context';
import { CanonicalTransaction, MovementType, TransactionPurpose } from '../../core/models/transaction';
import { parseRupeesToPaise, formatPaiseToInr } from '../../core/formatters/currency';
import { ArrowUpRight, ArrowDownLeft, AlertCircle, CheckCircle2 } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: MovementType;
  defaultPartyId?: string;
  initialValues?: Partial<CanonicalTransaction>;
}

const PURPOSES_BY_MOVEMENT: Record<MovementType, { value: TransactionPurpose; label: string }[]> = {
  GIVEN: [
    { value: 'Loan Given', label: 'Loan Given (Debtor owes me)' },
    { value: 'Payable Settlement', label: 'Payable Settlement (Repaid my debt / supplier)' },
    { value: 'Advance', label: 'Advance Payment Given' },
    { value: 'Expense', label: 'Business / Operating Expense' },
    { value: 'Purchase', label: 'Inventory / Asset Purchase' },
    { value: 'Refund', label: 'Customer Refund Issued' },
    { value: 'Transfer', label: 'Account / Wallet Transfer' },
    { value: 'Other', label: 'Other Money Out' },
  ],
  TAKEN: [
    { value: 'Receivable Collection', label: 'Receivable Collection (Customer repaid)' },
    { value: 'Loan Received', label: 'Loan Received (I owe lender)' },
    { value: 'Sale', label: 'Product / Service Sale' },
    { value: 'Advance', label: 'Advance Payment Received' },
    { value: 'Income', label: 'Business / Other Income' },
    { value: 'Refund', label: 'Vendor Refund Received' },
    { value: 'Transfer', label: 'Account / Wallet Transfer' },
    { value: 'Other', label: 'Other Money In' },
  ],
};

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'GIVEN',
  defaultPartyId,
  initialValues,
}) => {
  const { parties, recordTransaction, tenantId } = useLedger();

  const [type, setType] = useState<MovementType>(defaultType);
  const [partyId, setPartyId] = useState<string>(defaultPartyId || '');
  const [purpose, setPurpose] = useState<TransactionPurpose>('Loan Given');
  const [totalRupeesInput, setTotalRupeesInput] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [splits, setSplits] = useState<SplitRowState[]>([
    {
      id: `spl-${Date.now()}-1`,
      method: 'UPI',
      provider: 'gpay',
      amountPaise: 0,
      paymentReferenceId: '',
    },
  ]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Synchronize on open or change in default props
  useEffect(() => {
    if (isOpen) {
      const activeType = initialValues?.type || defaultType;
      setType(activeType);
      setPartyId(initialValues?.partyId || defaultPartyId || (parties[0]?.id ?? ''));
      setPurpose(
        initialValues?.purpose ||
          (activeType === 'GIVEN' ? 'Loan Given' : 'Receivable Collection')
      );
      const initialPaise = initialValues?.totalAmountPaise || 0;
      setTotalRupeesInput(initialPaise > 0 ? (initialPaise / 100).toString() : '');
      setDate(initialValues?.date || new Date().toISOString().split('T')[0]);
      setNotes(initialValues?.notes || '');

      if (initialValues?.splits && initialValues.splits.length > 0) {
        setSplits(
          initialValues.splits.map((s) => ({
            id: s.id,
            method: s.method,
            provider: s.provider || '',
            amountPaise: s.amountPaise,
            paymentReferenceId: s.paymentReferenceId || '',
          }))
        );
      } else {
        setSplits([
          {
            id: `spl-${Date.now()}-1`,
            method: 'UPI',
            provider: 'gpay',
            amountPaise: initialPaise,
            paymentReferenceId: '',
          },
        ]);
      }
      setErrorMsg(null);
    }
  }, [isOpen, defaultType, defaultPartyId, initialValues, parties]);

  // When type changes, adjust default purpose
  const handleTypeChange = (newType: MovementType) => {
    setType(newType);
    setPurpose(newType === 'GIVEN' ? 'Loan Given' : 'Receivable Collection');
  };

  const totalAmountPaise = parseRupeesToPaise(totalRupeesInput);
  const allocatedSumPaise = splits.reduce((sum, s) => sum + (s.amountPaise || 0), 0);
  const deltaPaise = totalAmountPaise - allocatedSumPaise;
  const isReconciled = deltaPaise === 0 && totalAmountPaise > 0 && partyId !== '';

  const handleTotalAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setTotalRupeesInput(raw);
    const parsedPaise = parseRupeesToPaise(raw);
    if (splits.length === 1) {
      setSplits([{ ...splits[0], amountPaise: parsedPaise }]);
    }
  };

  const generateCanonicalTxnId = (): string => {
    const randomHex = Math.floor(100000 + Math.random() * 900000).toString();
    return `RB-TXN-${randomHex}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!partyId) {
      setErrorMsg('Please select or create a counterparty.');
      return;
    }

    if (totalAmountPaise <= 0) {
      setErrorMsg('Transaction amount must be greater than zero.');
      return;
    }

    if (deltaPaise !== 0) {
      setErrorMsg(`Payment splits do not match total amount. Difference: ${formatPaiseToInr(deltaPaise)}.`);
      return;
    }

    const canonicalTxn: CanonicalTransaction = {
      id: generateCanonicalTxnId(),
      tenantId,
      partyId,
      type,
      purpose,
      provider: splits[0]?.provider || splits[0]?.method,
      totalAmountPaise,
      date,
      notes: notes.trim(),
      status: 'Confirmed',
      splits: splits.map((s) => ({
        id: s.id,
        method: s.method,
        provider: s.provider,
        amountPaise: s.amountPaise,
        paymentReferenceId: s.paymentReferenceId.trim() || undefined,
        initiatedBy: type === 'GIVEN' ? 'Lender' : 'Debtor',
        confirmed: true,
      })),
      createdAt: new Date().toISOString(),
      createdBy: 'cashier@rabooks.system',
    };

    try {
      await recordTransaction(canonicalTxn);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record transaction to ledger.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={type === 'GIVEN' ? 'Give Money (Money Out)' : 'Take Money (Money In)'}
      subtitle="Record payment given or received with full party ledger history"
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span>Balance & Ledger will update immediately</span>
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
              {type === 'TAKEN' ? 'Record Money Received' : 'Record Money Given'}
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

        {/* Movement Direction Toggle (GIVE = RED, TAKE = GREEN) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Cash Movement Direction
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleTypeChange('TAKEN')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                type === 'TAKEN'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-200 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ArrowDownLeft className="size-4 text-emerald-600" />
              <span>🟢 TAKE / RECEIVED (Money In)</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('GIVEN')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                type === 'GIVEN'
                  ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-200 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ArrowUpRight className="size-4 text-rose-600" />
              <span>🔴 GIVE / PAID (Money Out)</span>
            </button>
          </div>
        </div>

        {/* Counterparty with INLINE Add Party */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Party / Counterparty <span className="text-rose-500">*</span>
            </label>
            <PartySelectDropdown
              value={partyId}
              onChange={(newPartyId) => setPartyId(newPartyId)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Transaction Date
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Amount & Purpose */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Amount (INR) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-base text-slate-400 font-mono">
                ₹
              </span>
              <input
                type="text"
                placeholder="0.00"
                value={totalRupeesInput}
                onChange={handleTotalAmountChange}
                className="w-full pl-8 pr-4 py-2.5 text-lg font-mono font-bold tabular-nums text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Transaction Purpose / Type
            </label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value as TransactionPurpose)}
              className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2.5 h-[42px] focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {PURPOSES_BY_MOVEMENT[type].map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Split Allocation Manager with Provider Icons */}
        <SplitPaymentBox
          totalAmountPaise={totalAmountPaise}
          splits={splits}
          onChange={setSplits}
          movementType={type}
        />

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Description / Note
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Invoice number, goods description, agreement reference, or repayment note..."
            className="w-full text-xs text-slate-900 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400"
          />
        </div>
      </form>
    </Modal>
  );
};
