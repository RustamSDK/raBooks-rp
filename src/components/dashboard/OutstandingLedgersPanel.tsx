import React, { useState } from 'react';
import { useLedger } from '../../db/repository-context';
import { formatPaiseToInr } from '../../core/formatters/currency';
import { PartyAvatar } from '../ui/PartyAvatar';
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Phone, Search } from 'lucide-react';

interface OutstandingLedgersPanelProps {
  onSelectParty: (partyId: string) => void;
  onOpenTakeModalForParty: (partyId: string) => void;
  onOpenGiveModalForParty: (partyId: string) => void;
}

export const OutstandingLedgersPanel: React.FC<OutstandingLedgersPanelProps> = ({
  onSelectParty,
  onOpenTakeModalForParty,
  onOpenGiveModalForParty,
}) => {
  const { parties, getPartyBalance } = useLedger();
  const [searchTerm, setSearchTerm] = useState('');

  // Partition parties into To Receive and To Pay
  const receivableParties = parties
    .map((p) => ({ party: p, balancePaise: getPartyBalance(p.id) }))
    .filter((item) => item.balancePaise > 0)
    .sort((a, b) => b.balancePaise - a.balancePaise);

  const payableParties = parties
    .map((p) => ({ party: p, balancePaise: getPartyBalance(p.id) }))
    .filter((item) => item.balancePaise < 0)
    .sort((a, b) => a.balancePaise - b.balancePaise); // most negative first

  const totalReceivablePaise = receivableParties.reduce((sum, item) => sum + item.balancePaise, 0);
  const totalPayablePaise = payableParties.reduce((sum, item) => sum + Math.abs(item.balancePaise), 0);

  const filterParty = (item: { party: any }) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.party.name.toLowerCase().includes(q) ||
      item.party.phone.toLowerCase().includes(q) ||
      item.party.relation.toLowerCase().includes(q)
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 1. TO RECEIVE (Money owed to me) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                TO RECEIVE (They Owe Me)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {receivableParties.length} {receivableParties.length === 1 ? 'person / business' : 'parties'} have outstanding dues to pay you
            </p>
          </div>
          <div className="text-right">
            <div className="text-base font-bold font-mono text-emerald-700 tabular-nums">
              {formatPaiseToInr(totalReceivablePaise)}
            </div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Outstanding</div>
          </div>
        </div>

        {/* List of Debtors */}
        <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto mt-2">
          {receivableParties.filter(filterParty).length > 0 ? (
            receivableParties.filter(filterParty).map(({ party, balancePaise }) => (
              <div
                key={party.id}
                onClick={() => onSelectParty(party.id)}
                className="py-2.5 px-2 hover:bg-slate-50 rounded-lg flex items-center justify-between transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <PartyAvatar name={party.name} size="sm" photoUrl={party.photoUrl} />
                  <div className="truncate">
                    <div className="text-xs font-semibold text-slate-900 truncate group-hover:text-indigo-600">
                      {party.name}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                      <span className="font-medium text-slate-600">{party.relation}</span>
                      {party.phone && party.phone !== '—' && (
                        <>
                          <span>•</span>
                          <span>{party.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-2">
                  <div className="text-right">
                    <div className="text-xs font-bold font-mono text-emerald-700 tabular-nums">
                      {formatPaiseToInr(balancePaise)}
                    </div>
                    <div className="text-[9px] text-emerald-600 font-semibold">Due to receive</div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenTakeModalForParty(party.id);
                    }}
                    className="p-1 rounded text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-[10px] font-semibold border border-emerald-200 transition-colors"
                    title={`Receive payment from ${party.name}`}
                  >
                    + Take
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-xs text-slate-400">
              No outstanding receivables. All customer and borrower accounts are settled.
            </div>
          )}
        </div>
      </div>

      {/* 2. TO PAY (Money I owe) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-rose-500" />
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                TO PAY (I Owe Them)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              You owe {payableParties.length} {payableParties.length === 1 ? 'person / business' : 'parties'} for supplies or loans
            </p>
          </div>
          <div className="text-right">
            <div className="text-base font-bold font-mono text-rose-700 tabular-nums">
              {formatPaiseToInr(totalPayablePaise)}
            </div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Payable</div>
          </div>
        </div>

        {/* List of Creditors */}
        <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto mt-2">
          {payableParties.filter(filterParty).length > 0 ? (
            payableParties.filter(filterParty).map(({ party, balancePaise }) => (
              <div
                key={party.id}
                onClick={() => onSelectParty(party.id)}
                className="py-2.5 px-2 hover:bg-slate-50 rounded-lg flex items-center justify-between transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <PartyAvatar name={party.name} size="sm" photoUrl={party.photoUrl} />
                  <div className="truncate">
                    <div className="text-xs font-semibold text-slate-900 truncate group-hover:text-indigo-600">
                      {party.name}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                      <span className="font-medium text-slate-600">{party.relation}</span>
                      {party.phone && party.phone !== '—' && (
                        <>
                          <span>•</span>
                          <span>{party.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-2">
                  <div className="text-right">
                    <div className="text-xs font-bold font-mono text-rose-700 tabular-nums">
                      {formatPaiseToInr(Math.abs(balancePaise))}
                    </div>
                    <div className="text-[9px] text-rose-600 font-semibold">You must pay</div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenGiveModalForParty(party.id);
                    }}
                    className="p-1 rounded text-rose-700 bg-rose-50 hover:bg-rose-100 text-[10px] font-semibold border border-rose-200 transition-colors"
                    title={`Pay money to ${party.name}`}
                  >
                    - Give
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-xs text-slate-400">
              No outstanding payables. All supplier and lender accounts are settled.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
