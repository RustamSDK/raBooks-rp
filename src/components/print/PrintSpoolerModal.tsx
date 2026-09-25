import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PrintReceipt, A4ReceiptTheme } from './PrintReceipt';
import { PrintStatement } from './PrintStatement';
import { ThermalReceipt, ThermalTheme } from './ThermalReceipt';
import { PrintTemplateGallery } from './PrintTemplateGallery';
import { useLedger } from '../../db/repository-context';
import { executeHardwarePrint } from '../../hooks/usePrintSpooler';
import {
  Printer,
  FileText,
  Receipt,
  Layers,
  Settings2,
  CheckCircle2,
} from 'lucide-react';

export type DocumentKind = 'receipt' | 'voucher' | 'statement' | 'ledger';
export type PaperSize = 'a4' | 'letter' | 'thermal-80mm';

interface PrintSpoolerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPartyId?: string;
  defaultTransactionId?: string;
}

const A4_THEMES: { id: A4ReceiptTheme; label: string }[] = [
  { id: 'modern-minimal', label: 'Modern Minimal' },
  { id: 'classic-ledger', label: 'Classic Ledger' },
  { id: 'compact-statement', label: 'Compact Statement' },
  { id: 'classic-business', label: 'Classic Business' },
  { id: 'professional-accounting', label: 'Professional Accounting' },
  { id: 'clean-corporate', label: 'Clean Corporate' },
  { id: 'traditional-ledger', label: 'Traditional Ledger' },
  { id: 'compact-business', label: 'Compact Business' },
];

const THERMAL_THEMES: { id: ThermalTheme; label: string }[] = [
  { id: 'classic-receipt', label: 'Classic Receipt' },
  { id: 'compact-receipt', label: 'Compact Receipt' },
  { id: 'clean-receipt', label: 'Clean Receipt' },
  { id: 'detailed-receipt', label: 'Detailed Receipt' },
  { id: 'minimal-receipt', label: 'Minimal Receipt' },
];

export const PrintSpoolerModal: React.FC<PrintSpoolerModalProps> = ({
  isOpen,
  onClose,
  defaultPartyId,
  defaultTransactionId,
}) => {
  const { parties, transactions, getPartyBalance } = useLedger();

  const [documentKind, setDocumentKind] = useState<DocumentKind>('receipt');
  const [paperSize, setPaperSize] = useState<PaperSize>('a4');
  const [a4Theme, setA4Theme] = useState<A4ReceiptTheme>('modern-minimal');
  const [thermalTheme, setThermalTheme] = useState<ThermalTheme>('classic-receipt');

  const [selectedPartyId, setSelectedPartyId] = useState<string>(defaultPartyId || 'ALL');
  const [selectedTxnId, setSelectedTxnId] = useState<string>(
    defaultTransactionId || (transactions[0]?.id ?? '')
  );

  useEffect(() => {
    if (isOpen) {
      if (defaultTransactionId) {
        setSelectedTxnId(defaultTransactionId);
        setDocumentKind('receipt');
      } else if (defaultPartyId) {
        setSelectedPartyId(defaultPartyId);
        setDocumentKind('statement');
      }
    }
  }, [isOpen, defaultPartyId, defaultTransactionId]);

  const activeParty = parties.find((p) => p.id === selectedPartyId) || null;
  const activeTxn = transactions.find((t) => t.id === selectedTxnId) || transactions[0] || null;
  const txnParty = activeTxn ? parties.find((p) => p.id === activeTxn.partyId) || null : null;
  const previousBal = activeTxn ? getPartyBalance(activeTxn.partyId) : 0;

  const handlePrint = () => {
    const isThermal = paperSize === 'thermal-80mm';
    const targetElementId = isThermal
      ? 'printable-thermal-slip'
      : documentKind === 'receipt' || documentKind === 'voucher'
      ? 'printable-receipt-a4'
      : 'printable-statement-sheet';

    const documentTitle =
      documentKind === 'receipt'
        ? `Receipt-${activeTxn?.id || 'Doc'}`
        : `Statement-${activeParty ? activeParty.name : 'All-Parties'}`;

    executeHardwarePrint(targetElementId, documentTitle);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Print Receipts & Statements"
      subtitle="Preview and print official transaction documents on A4, Letter, or 80mm thermal rolls"
      maxWidth="4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span>Direct native print dialog (no forced PDF download)</span>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              type="button"
              variant="primary"
              icon={<Printer className="size-4" />}
              onClick={handlePrint}
            >
              Print Now
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Document Kind & Paper Controls */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {/* 1. Document Type */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Document Type
              </label>
              <select
                value={documentKind}
                onChange={(e) => {
                  const val = e.target.value as DocumentKind;
                  setDocumentKind(val);
                }}
                className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="receipt">Payment Receipt (1 Transaction)</option>
                <option value="voucher">Payment Voucher (1 Transaction)</option>
                <option value="statement">Statement of Account (History)</option>
                <option value="ledger">Party Ledger (Full)</option>
              </select>
            </div>

            {/* 2. Paper Size */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Paper / Format
              </label>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value as PaperSize)}
                className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="a4">A4 Sheet</option>
                <option value="letter">US Letter</option>
                <option value="thermal-80mm">80mm Continuous Thermal Roll</option>
              </select>
            </div>

            {/* 3. Design Theme */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Print Theme
              </label>
              {paperSize === 'thermal-80mm' ? (
                <select
                  value={thermalTheme}
                  onChange={(e) => setThermalTheme(e.target.value as ThermalTheme)}
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  {THERMAL_THEMES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={a4Theme}
                  onChange={(e) => setA4Theme(e.target.value as A4ReceiptTheme)}
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  {A4_THEMES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 4. Target Transaction or Party Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                {documentKind === 'receipt' || documentKind === 'voucher'
                  ? 'Select Transaction'
                  : 'Select Party'}
              </label>
              {documentKind === 'receipt' || documentKind === 'voucher' ? (
                <select
                  value={selectedTxnId}
                  onChange={(e) => setSelectedTxnId(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none truncate"
                >
                  {transactions.map((t) => {
                    const p = parties.find((item) => item.id === t.partyId);
                    return (
                      <option key={t.id} value={t.id}>
                        {t.id} — {p?.name || t.partyId} (₹{(t.totalAmountPaise / 100).toFixed(0)})
                      </option>
                    );
                  })}
                </select>
              ) : (
                <select
                  value={selectedPartyId}
                  onChange={(e) => setSelectedPartyId(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none truncate"
                >
                  <option value="ALL">All Parties (Consolidated)</option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.relation})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Interactive Print Template Gallery (Modern Minimal, Classic Ledger, Compact Statement) */}
        {paperSize !== 'thermal-80mm' && (
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-md">
            <PrintTemplateGallery
              selectedTheme={a4Theme}
              onSelectTheme={(theme) => setA4Theme(theme)}
            />
          </div>
        )}

        {/* Live Document Preview Canvas with Immediate Update Banner */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Live Spooler Preview Canvas ({paperSize.toUpperCase()})
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Style: {a4Theme.replace('-', ' ').toUpperCase()}
            </span>
          </div>

          <div className="bg-slate-100/90 rounded-xl p-4 sm:p-6 border border-slate-200 overflow-x-auto max-h-[560px] overflow-y-auto shadow-inner flex justify-center">
          {paperSize === 'thermal-80mm' ? (
            activeTxn ? (
              <ThermalReceipt
                transaction={activeTxn}
                party={txnParty}
                previousBalancePaise={previousBal}
                theme={thermalTheme}
              />
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                No transaction available to print thermal receipt.
              </div>
            )
          ) : documentKind === 'receipt' || documentKind === 'voucher' ? (
            activeTxn ? (
              <PrintReceipt
                transaction={activeTxn}
                party={txnParty}
                previousBalancePaise={previousBal}
                theme={a4Theme}
              />
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                No transaction available for receipt preview.
              </div>
            )
          ) : (
            <PrintStatement
              party={activeParty}
              transactions={transactions}
              documentType={documentKind}
              theme={a4Theme}
            />
          )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
