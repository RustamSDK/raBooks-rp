import React from 'react';
import { CanonicalTransaction } from '../../core/models/transaction';
import { CounterpartyEntity } from '../../core/models/counterparty';
import { formatPaiseToInr } from '../../core/formatters/currency';
import { ProviderIcon } from '../ui/ProviderIcon';
import { PartyAvatar } from '../ui/PartyAvatar';

export type A4ReceiptTheme =
  | 'modern-minimal'
  | 'classic-ledger'
  | 'compact-statement'
  | 'classic-business'
  | 'professional-accounting'
  | 'clean-corporate'
  | 'traditional-ledger'
  | 'compact-business';

interface PrintReceiptProps {
  transaction: CanonicalTransaction;
  party: CounterpartyEntity | null;
  previousBalancePaise?: number;
  theme?: A4ReceiptTheme;
}

export const PrintReceipt: React.FC<PrintReceiptProps> = ({
  transaction,
  party,
  previousBalancePaise,
  theme = 'modern-minimal',
}) => {
  const isGiven = transaction.type === 'GIVEN';
  const movementTitle = isGiven ? 'PAYMENT VOUCHER (MONEY GIVEN)' : 'PAYMENT RECEIPT (MONEY RECEIVED)';

  const currentAmountPaise = transaction.totalAmountPaise;
  const prevBal = previousBalancePaise ?? (isGiven ? currentAmountPaise : -currentAmountPaise);
  const remainingBal = isGiven ? prevBal + currentAmountPaise : prevBal - currentAmountPaise;

  const prevRelationship = prevBal >= 0 ? 'Receivable' : 'Payable';
  const remRelationship = remainingBal >= 0 ? 'Receivable' : 'Payable';

  const dateFormatted = new Date(transaction.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeFormatted = new Date(transaction.createdAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isClassic = theme === 'classic-ledger' || theme === 'traditional-ledger' || theme === 'professional-accounting';
  const isCompact = theme === 'compact-statement' || theme === 'compact-business';

  return (
    <div
      id="printable-receipt-a4"
      className={`bg-white text-slate-900 max-w-3xl mx-auto rounded-xl print:border-none print:shadow-none print:p-0 ${
        theme === 'modern-minimal'
          ? 'p-8 md:p-10 border border-slate-200/90 shadow-sm font-sans'
          : isClassic
          ? 'p-8 border-2 border-slate-900 font-serif bg-amber-50/10'
          : isCompact
          ? 'p-5 border border-slate-300 text-xs font-sans'
          : 'p-8 border border-slate-200 font-sans'
      }`}
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      {/* Header */}
      <div
        className={`flex items-start justify-between pb-4 ${
          isClassic
            ? 'border-b-2 border-slate-900'
            : isCompact
            ? 'border-b border-slate-300 pb-3'
            : 'border-b border-slate-200 pb-6'
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <h1
              className={`font-black tracking-tight text-slate-900 ${
                isClassic
                  ? 'text-2xl font-serif'
                  : isCompact
                  ? 'text-xl font-display'
                  : 'text-2xl font-extrabold font-display'
              }`}
            >
              raBooks
            </h1>
            {theme === 'modern-minimal' && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                DIGITAL KHATA
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-600 mt-0.5">
            Digital Khata & Double-Entry Accounting Ledger
          </p>
        </div>

        <div className="text-right">
          <span
            className={`inline-block px-3 py-1 font-bold text-xs uppercase tracking-wider ${
              isClassic
                ? 'bg-slate-900 text-white rounded-none border border-slate-900'
                : isCompact
                ? 'bg-slate-800 text-white rounded text-[10px] py-0.5 px-2'
                : 'bg-indigo-600 text-white rounded-full'
            }`}
          >
            {movementTitle}
          </span>
          <div className="text-xs text-slate-600 mt-1.5 font-mono">
            TXN ID: <span className="font-bold text-slate-900">{transaction.id}</span>
          </div>
          <div className="text-[11px] text-slate-500">
            {dateFormatted} • {timeFormatted}
          </div>
        </div>
      </div>

      {/* Counterparty Identification Card */}
      <div
        className={`my-4 ${
          isClassic
            ? 'p-3.5 bg-amber-50/30 border border-slate-900 rounded-none'
            : isCompact
            ? 'p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs'
            : 'p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl'
        } flex items-center justify-between gap-4`}
      >
        <div className="flex items-center gap-3">
          <PartyAvatar
            name={party ? party.name : `Party #${transaction.partyId}`}
            size={isCompact ? 'md' : 'lg'}
            photoUrl={party?.photoUrl}
          />
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Party / Counterparty Details
            </div>
            <div className={`font-bold text-slate-900 ${isClassic ? 'text-lg font-serif' : 'text-base'}`}>
              {party ? party.name : `Party #${transaction.partyId}`}
            </div>
            {party && (
              <div className="text-xs text-slate-600 flex items-center gap-2 mt-0.5">
                <span className="bg-slate-200/80 px-1.5 py-0.2 rounded text-[11px] font-medium">
                  {party.relation}
                </span>
                {party.phone && party.phone !== '—' && <span>Phone: {party.phone}</span>}
                {party.email && <span>• Email: {party.email}</span>}
              </div>
            )}
          </div>
        </div>

        {transaction.purpose && (
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase block font-semibold">
              Purpose
            </span>
            <span
              className={`inline-block px-2.5 py-0.5 rounded font-semibold text-xs mt-0.5 ${
                isClassic
                  ? 'border border-slate-700 bg-white text-slate-900 font-serif'
                  : 'bg-indigo-50 border border-indigo-200 text-indigo-900'
              }`}
            >
              {transaction.purpose}
            </span>
          </div>
        )}
      </div>

      {/* Main Payment Amount Banner */}
      <div
        className={`my-4 text-center ${
          isClassic
            ? 'p-4 bg-white border-y-2 border-slate-900'
            : isCompact
            ? 'p-3 bg-slate-50 border border-slate-200 rounded-lg'
            : 'p-5 rounded-xl border bg-linear-to-b from-slate-50 to-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
          Total Amount {isGiven ? 'Disbursed / Paid' : 'Collected / Received'}
        </div>
        <div
          className={`font-black font-numeric mt-0.5 tracking-tight ${
            isClassic
              ? 'text-3xl text-slate-950 font-serif'
              : isCompact
              ? 'text-2xl text-slate-950'
              : 'text-3xl text-slate-950'
          }`}
        >
          {formatPaiseToInr(transaction.totalAmountPaise)}
        </div>
      </div>

      {/* Payment Details Table */}
      <div className="my-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
          Payment Breakdown & Reference
        </h3>
        <table
          className={`w-full text-left text-xs border border-slate-200 overflow-hidden ${
            isClassic ? 'border-collapse border-slate-900' : 'rounded-lg'
          }`}
        >
          <thead
            className={`${
              isClassic
                ? 'bg-slate-900 text-white font-serif'
                : 'bg-slate-100 text-slate-700 font-semibold'
            } border-b border-slate-200`}
          >
            <tr>
              <th className="py-2 px-3">Method</th>
              <th className="py-2 px-3">Provider</th>
              <th className="py-2 px-3">Reference / UTR</th>
              <th className="py-2 px-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody
            className={`divide-y divide-slate-100 font-mono ${
              isCompact ? 'text-[11px]' : 'text-xs'
            }`}
          >
            {transaction.splits.map((s, idx) => (
              <tr key={idx} className={isClassic ? 'border-b border-slate-200' : ''}>
                <td className="py-2 px-3 font-sans font-medium">{s.method}</td>
                <td className="py-2 px-3 font-sans">
                  <ProviderIcon provider={s.provider} method={s.method} size="sm" showLabel />
                </td>
                <td className="py-2 px-3 text-slate-600">{s.paymentReferenceId || '—'}</td>
                <td className="py-2 px-3 text-right font-bold text-slate-900">
                  {formatPaiseToInr(s.amountPaise)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Account Balance Progression */}
      <div
        className={`my-4 grid grid-cols-3 gap-2.5 text-center ${
          isClassic
            ? 'p-3 bg-white border-2 border-slate-900'
            : isCompact
            ? 'p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs'
            : 'p-4 bg-slate-50 border border-slate-200/90 rounded-xl'
        }`}
      >
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">
            Previous {prevRelationship}
          </span>
          <span className="text-sm sm:text-base font-bold font-numeric text-slate-800">
            {formatPaiseToInr(Math.abs(prevBal))}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">
            {isGiven ? 'Paid Today' : 'Received Today'}
          </span>
          <span className="text-sm sm:text-base font-bold font-numeric text-slate-950">
            {formatPaiseToInr(currentAmountPaise)}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">
            Remaining {remRelationship}
          </span>
          <span
            className={`text-sm sm:text-base font-bold font-numeric ${
              isClassic
                ? 'border-b-2 border-slate-900 pb-0.5 inline-block ' + (remainingBal >= 0 ? 'text-emerald-800' : 'text-rose-800')
                : remainingBal >= 0
                ? 'text-emerald-700'
                : 'text-rose-700'
            }`}
          >
            {formatPaiseToInr(Math.abs(remainingBal))}
          </span>
        </div>
      </div>

      {/* Narration */}
      {transaction.notes && (
        <div
          className={`my-3 p-2.5 bg-white border border-slate-200 rounded-lg text-xs ${
            isClassic ? 'font-serif border-slate-400' : ''
          }`}
        >
          <span className="font-bold text-slate-700">Narration:</span>{' '}
          <span className="text-slate-600">{transaction.notes}</span>
        </div>
      )}

      {/* Signature & Confirmation Strip */}
      <div
        className={`${
          isCompact ? 'mt-6 pt-4' : 'mt-8 pt-6'
        } border-t border-slate-200 grid grid-cols-2 gap-6 text-center text-xs`}
      >
        <div>
          <div className="border-b border-slate-300 pb-6" />
          <div className="mt-1.5 font-semibold text-slate-700">Authorized Signatory</div>
          <div className="text-[10px] text-slate-400">raBooks Account Holder</div>
        </div>

        <div>
          <div className="border-b border-slate-300 pb-6" />
          <div className="mt-1.5 font-semibold text-slate-700">
            Received / Acknowledged By
          </div>
          <div className="text-[10px] text-slate-400">
            {party ? party.name : 'Counterparty Representative'}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-3 border-t border-slate-100 text-center text-[10px] text-slate-400 flex items-center justify-between">
        <span>Template: <strong className="text-slate-600 font-sans capitalize">{theme.replace('-', ' ')}</strong></span>
        <span>Official verified ledger voucher • raBooks Core Engine</span>
      </div>
    </div>
  );
};
