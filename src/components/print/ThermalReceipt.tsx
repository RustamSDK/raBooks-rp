import React from 'react';
import { CanonicalTransaction } from '../../core/models/transaction';
import { CounterpartyEntity } from '../../core/models/counterparty';
import { formatPaiseToInr } from '../../core/formatters/currency';
import { ProviderIcon } from '../ui/ProviderIcon';
import { PartyAvatar } from '../ui/PartyAvatar';

export type ThermalTheme =
  | 'classic-receipt'
  | 'compact-receipt'
  | 'clean-receipt'
  | 'detailed-receipt'
  | 'minimal-receipt';

interface ThermalReceiptProps {
  transaction: CanonicalTransaction;
  party: CounterpartyEntity | null;
  previousBalancePaise?: number;
  theme?: ThermalTheme;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({
  transaction,
  party,
  previousBalancePaise,
  theme = 'classic-receipt',
}) => {
  const isGiven = transaction.type === 'GIVEN';
  const movementLabel = isGiven ? 'GIVEN / PAID' : 'TAKEN / RECEIVED';

  // Balance derivation
  const currentAmountPaise = transaction.totalAmountPaise;
  const prevBal = previousBalancePaise ?? (isGiven ? currentAmountPaise : -currentAmountPaise);
  const remainingBal = isGiven ? prevBal + currentAmountPaise : prevBal - currentAmountPaise;

  const prevRelationship = prevBal >= 0 ? 'Receivable' : 'Payable';
  const remRelationship = remainingBal >= 0 ? 'Receivable' : 'Payable';

  const dateFormatted = new Date(transaction.date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeFormatted = new Date(transaction.createdAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      id="printable-thermal-slip"
      className={`thermal-80mm-page bg-white text-black font-mono select-all mx-auto ${
        theme === 'compact-receipt'
          ? 'w-[72mm] p-2 text-[10px] leading-tight'
          : theme === 'minimal-receipt'
          ? 'w-[74mm] p-3 text-[11px] leading-snug'
          : theme === 'clean-receipt'
          ? 'w-[76mm] p-3.5 text-xs leading-normal border border-slate-300'
          : theme === 'detailed-receipt'
          ? 'w-[78mm] p-4 text-xs leading-normal border-2 border-black'
          : 'w-[74mm] p-3 text-xs leading-tight border border-dashed border-black'
      }`}
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      {/* Receipt Header */}
      <div className="text-center pb-2 border-b-2 border-black">
        <div className="text-base font-extrabold tracking-wider font-sans">raBOOKS</div>
        <div className="text-[11px] font-bold uppercase tracking-tight">
          {isGiven ? 'PAYMENT RECEIPT (MONEY GIVEN)' : 'PAYMENT RECEIPT (MONEY RECEIVED)'}
        </div>
        <div className="text-[9px] text-slate-700 mt-0.5">80mm Continuous Thermal Roll</div>
      </div>

      {/* Party Identity Details with Circular Avatar */}
      <div className="py-2 border-b border-dashed border-black">
        <div className="flex items-center gap-2">
          {party && (
            <div className="shrink-0 size-7 rounded-full border border-black flex items-center justify-center font-bold text-[10px] bg-slate-100">
              {party.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="truncate">
            <div className="font-bold text-xs truncate">
              {party ? party.name : `Party #${transaction.partyId}`}
            </div>
            {party && (
              <div className="text-[10px] text-slate-700">
                {party.relation} {party.phone && party.phone !== '—' ? `• ${party.phone}` : ''}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Metadata */}
      <div className="py-1.5 border-b border-dashed border-black space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span className="text-slate-600">Date & Time:</span>
          <span className="font-bold">{dateFormatted} {timeFormatted}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Transaction ID:</span>
          <span className="font-bold">{transaction.id}</span>
        </div>
        {transaction.purpose && (
          <div className="flex justify-between">
            <span className="text-slate-600">Purpose:</span>
            <span className="font-semibold">{transaction.purpose}</span>
          </div>
        )}
      </div>

      {/* Main Movement & Big Amount */}
      <div className="py-3 border-b-2 border-black text-center my-1">
        <div className="text-[11px] font-bold tracking-wider">
          *** {movementLabel} ***
        </div>
        <div className="text-2xl font-black mt-1 font-numeric">
          {formatPaiseToInr(transaction.totalAmountPaise)}
        </div>
      </div>

      {/* Payment Details with Provider & UTR */}
      <div className="py-2 border-b border-dashed border-black space-y-1 text-[10px]">
        <div className="font-bold uppercase tracking-tight">Payment Method:</div>
        {transaction.splits.map((s, idx) => (
          <div key={idx} className="space-y-0.5 pl-1">
            <div className="flex justify-between font-bold">
              <span>{s.method} {s.provider ? `(${s.provider})` : ''}</span>
              <span>{formatPaiseToInr(s.amountPaise)}</span>
            </div>
            {s.paymentReferenceId && (
              <div className="text-[9px] text-slate-800 break-all pl-2 font-mono">
                UTR/Ref: {s.paymentReferenceId}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Accounting Balance History (Previous -> Today -> Remaining) */}
      <div className="py-2 border-b border-dashed border-black space-y-1 text-[10px]">
        <div className="flex justify-between">
          <span className="text-slate-700">Previous {prevRelationship}:</span>
          <span className="font-bold">{formatPaiseToInr(Math.abs(prevBal))}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-700">{isGiven ? 'Paid Today:' : 'Received Today:'}</span>
          <span className="font-bold">{formatPaiseToInr(currentAmountPaise)}</span>
        </div>
        <div className="flex justify-between pt-1 border-t border-dotted border-black font-bold text-[11px]">
          <span>Remaining {remRelationship}:</span>
          <span>{formatPaiseToInr(Math.abs(remainingBal))}</span>
        </div>
      </div>

      {/* Description / Narration */}
      {transaction.notes && (
        <div className="py-2 border-b border-dashed border-black text-[10px]">
          <span className="font-bold">Note:</span> {transaction.notes}
        </div>
      )}

      {/* Simple, Professional Footer - Zero AI Slop */}
      <div className="pt-2 text-center text-[9px] space-y-0.5 text-slate-700">
        <div className="font-semibold">Thank you for your business.</div>
        <div>raBooks • Digital Khata & Accounting Ledger</div>
      </div>
    </div>
  );
};
