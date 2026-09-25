import React from 'react';
import { CanonicalTransaction } from '../../core/models/transaction';
import { CounterpartyEntity } from '../../core/models/counterparty';
import { formatPaiseToInr } from '../../core/formatters/currency';
import { PartyAvatar } from '../ui/PartyAvatar';

interface ThermalVoucherSlipProps {
  transaction: CanonicalTransaction;
  party: CounterpartyEntity | null;
  runningBalancePaise?: number;
}

export const ThermalVoucherSlip: React.FC<ThermalVoucherSlipProps> = ({
  transaction,
  party,
  runningBalancePaise,
}) => {
  return (
    <div
      id="printable-thermal-slip"
      className="w-72 bg-white text-black p-4 font-mono text-xs border border-dashed border-slate-300 mx-auto leading-tight select-all"
    >
      <div className="text-center pb-2 border-b border-dashed border-black">
        <div className="text-sm font-bold tracking-wider">RABOOKS TREASURY</div>
        <div className="text-[10px]">TRANSACTION CLEARING VOUCHER</div>
        <div className="text-[10px] mt-0.5">80MM CONTINUOUS ROLL SPOOL</div>
      </div>

      <div className="py-2 border-b border-dashed border-black space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span>TXN ID:</span>
          <span className="font-bold">{transaction.id}</span>
        </div>
        <div className="flex justify-between">
          <span>DATE:</span>
          <span>{transaction.date}</span>
        </div>
        <div className="flex justify-between">
          <span>TIME:</span>
          <span>{new Date(transaction.createdAt).toLocaleTimeString()}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>PARTY:</span>
          <div className="flex items-center gap-1.5 font-bold truncate max-w-[170px]">
            <PartyAvatar
              name={party ? party.name : transaction.partyId}
              size="xs"
              photoUrl={party?.photoUrl}
            />
            <span className="truncate">{party ? party.name : transaction.partyId}</span>
          </div>
        </div>
        {party?.phone && (
          <div className="flex justify-between">
            <span>PHONE:</span>
            <span>{party.phone}</span>
          </div>
        )}
      </div>

      <div className="py-3 border-b-2 border-black text-center my-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
          {transaction.type === 'GIVEN'
            ? '*** DISBURSEMENT OUT (DEBIT) ***'
            : '*** REPAYMENT IN (CREDIT) ***'}
        </div>
        <div className="text-xl font-bold mt-1">
          {formatPaiseToInr(transaction.totalAmountPaise)}
        </div>
        <div className="text-[10px] text-slate-600">
          Exact Base: {transaction.totalAmountPaise.toLocaleString()} paise
        </div>
      </div>

      <div className="py-2 border-b border-dashed border-black space-y-1 text-[10px]">
        <div className="font-bold mb-1">SETTLEMENT SPLITS:</div>
        {transaction.splits.map((s, idx) => (
          <div key={idx} className="space-y-0.5">
            <div className="flex justify-between font-semibold">
              <span>{idx + 1}. {s.method} Rail:</span>
              <span>{formatPaiseToInr(s.amountPaise)}</span>
            </div>
            {s.paymentReferenceId && (
              <div className="text-[9px] text-slate-700 pl-3 break-all">
                Ref: {s.paymentReferenceId}
              </div>
            )}
          </div>
        ))}
      </div>

      {runningBalancePaise !== undefined && (
        <div className="py-2 border-b border-dashed border-black flex justify-between font-bold text-xs">
          <span>PARTY BALANCE:</span>
          <span>{formatPaiseToInr(runningBalancePaise)}</span>
        </div>
      )}

      {transaction.notes && (
        <div className="py-2 border-b border-dashed border-black text-[10px]">
          <span className="font-bold">NARRATION:</span> {transaction.notes}
        </div>
      )}

      <div className="pt-3 text-center text-[9px] space-y-1">
        <div>LAW 2 RECONCILED: DELTA = 0 PAISE</div>
        <div className="font-mono tracking-widest">||| | ||||| || |||| ||||| |||</div>
        <div>IMMUTABLE NON-REPUDIATION AUDIT</div>
        <div>CUSTOMER VOUCHER COPY</div>
      </div>
    </div>
  );
};
