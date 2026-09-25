import React, { useState } from 'react';
import { Button } from '../ui/Button';
import {
  ArrowUpRight,
  ArrowDownLeft,
  UserPlus,
  CalendarCheck2,
  Share2,
  Download,
  Upload,
  Printer,
  Sparkles,
  CalendarClock,
  Lock,
} from 'lucide-react';
import { useLedger } from '../../db/repository-context';
import { CsvImportModal } from './CsvImportModal';

interface ActionToolbarProps {
  onOpenGiveModal: () => void;
  onOpenTakeModal: () => void;
  onOpenAddPartyModal: () => void;
  onOpenEmiModal: () => void;
  onOpenRecurringModal?: () => void;
  onOpenBackupModal?: () => void;
  onOpenShareModal: () => void;
  onOpenPrintModal: () => void;
  onOpenCopilotModal: () => void;
  onOpenImportCsvModal?: () => void;
}

export const ActionToolbar: React.FC<ActionToolbarProps> = ({
  onOpenGiveModal,
  onOpenTakeModal,
  onOpenAddPartyModal,
  onOpenEmiModal,
  onOpenRecurringModal,
  onOpenBackupModal,
  onOpenShareModal,
  onOpenPrintModal,
  onOpenCopilotModal,
  onOpenImportCsvModal,
}) => {
  const { transactions, parties } = useLedger();
  const [internalImportOpen, setInternalImportOpen] = useState(false);

  const handleOpenImport = () => {
    if (onOpenImportCsvModal) {
      onOpenImportCsvModal();
    } else {
      setInternalImportOpen(true);
    }
  };

  const handleExportCsv = async () => {
    try {
      const response = await fetch('/api/export/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions, parties }),
      });

      if (!response.ok) throw new Error('Failed to generate CSV');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rabooks-ledger-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // Direct client-side RFC 4180 fallback
      const headers = [
        'Transaction ID',
        'Date',
        'Party ID',
        'Type',
        'Amount (INR)',
        'Amount (Paise)',
        'Splits',
        'Status',
        'Notes',
      ];
      const rows = [headers.join(',')];
      transactions.forEach((t) => {
        const splitsStr = t.splits.map((s) => `${s.method}: ₹${(s.amountPaise / 100).toFixed(2)}`).join('; ');
        rows.push([
          `"${t.id}"`,
          `"${t.date}"`,
          `"${t.partyId}"`,
          `"${t.type}"`,
          `"${(t.totalAmountPaise / 100).toFixed(2)}"`,
          t.totalAmountPaise,
          `"${splitsStr}"`,
          `"${t.status}"`,
          `"${t.notes.replace(/"/g, '""')}"`,
        ].join(','));
      });
      const blob = new Blob([rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rabooks-ledger-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs">
      <div className="flex flex-col md:gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        {/* Row 1: Primary Cashflow & Ledger Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:flex md:flex-wrap items-center gap-2">
          {/* 1. TAKE (COLLECT / CASH INFLOW) -> Emerald Green */}
          <Button
            type="button"
            variant="success"
            size="md"
            icon={<ArrowDownLeft className="size-4" />}
            onClick={onOpenTakeModal}
            className="w-full sm:w-auto h-9 text-xs font-semibold"
            aria-label="Take: Record repayment collection or cash received"
          >
            Take (Collect)
          </Button>

          {/* 2. GIVE (DISBURSE / CASH OUTFLOW) -> Rose Red */}
          <Button
            type="button"
            variant="danger"
            size="md"
            icon={<ArrowUpRight className="size-4" />}
            onClick={onOpenGiveModal}
            className="w-full sm:w-auto h-9 text-xs font-semibold"
            aria-label="Give: Record capital disbursement or credit extended"
          >
            Give (Disburse)
          </Button>

          {/* 3. ADD PARTY */}
          <Button
            type="button"
            variant="outline"
            size="md"
            icon={<UserPlus className="size-4 text-slate-600" />}
            onClick={onOpenAddPartyModal}
            className="w-full sm:w-auto h-9 text-xs font-medium"
            aria-label="Add new counterparty to directory"
          >
            Add Party
          </Button>

          {/* AI COPILOT QUICK TRIGGER */}
          <Button
            type="button"
            variant="primary"
            size="md"
            icon={<Sparkles className="size-4 text-amber-300" />}
            onClick={onOpenCopilotModal}
            className="w-full sm:w-auto h-9 text-xs font-semibold"
            aria-label="Open Gemini AI ledger assistant"
          >
            Gemini Copilot
          </Button>
        </div>

        {/* Row 2: Secondary Tool Cluster */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:flex md:flex-wrap items-center gap-2 mt-2 md:mt-0">
          {/* 4. CREATE EMI */}
          <Button
            type="button"
            variant="amber"
            size="md"
            icon={<CalendarCheck2 className="size-4" />}
            onClick={onOpenEmiModal}
            className="w-full sm:w-auto h-9 text-xs font-medium"
            aria-label="Structure debt into monthly EMI amortization schedule"
          >
            Create EMI
          </Button>

          {/* 4b. RECURRING SCHEDULE */}
          {onOpenRecurringModal && (
            <Button
              type="button"
              variant="outline"
              size="md"
              icon={<CalendarClock className="size-4 text-indigo-600" />}
              onClick={onOpenRecurringModal}
              className="w-full sm:w-auto h-9 text-xs font-medium text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100/60 border-indigo-200"
              aria-label="Create recurring transaction schedule"
            >
              Schedule
            </Button>
          )}

          {/* 5. SEND / SHARE */}
          <Button
            type="button"
            variant="outline"
            size="md"
            icon={<Share2 className="size-4 text-slate-600" />}
            onClick={onOpenShareModal}
            className="w-full sm:w-auto h-9 text-xs font-medium"
            aria-label="Share statement link or balance notice"
          >
            Send / Share
          </Button>

          {/* 6. EXPORT CSV */}
          <Button
            type="button"
            variant="outline"
            size="md"
            icon={<Download className="size-4 text-slate-600" />}
            onClick={handleExportCsv}
            className="w-full sm:w-auto h-9 text-xs font-medium"
            aria-label="Export ledger data as CSV file"
          >
            Export CSV
          </Button>

          {/* 6b. ENCRYPTED BACKUP */}
          {onOpenBackupModal && (
            <Button
              type="button"
              variant="outline"
              size="md"
              icon={<Lock className="size-4 text-emerald-600" />}
              onClick={onOpenBackupModal}
              className="w-full sm:w-auto h-9 text-xs font-medium text-emerald-800 bg-emerald-50/50 hover:bg-emerald-100/60 border-emerald-200"
              aria-label="Download encrypted backup file for cold storage"
            >
              Backup
            </Button>
          )}

          {/* 7. IMPORT CSV */}
          <Button
            type="button"
            variant="outline"
            size="md"
            icon={<Upload className="size-4 text-indigo-600" />}
            onClick={handleOpenImport}
            className="w-full sm:w-auto h-9 text-xs font-medium text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100/60 border-indigo-200"
            aria-label="Import transactions from CSV file"
          >
            Import CSV
          </Button>

          {/* 8. PRINT */}
          <Button
            type="button"
            variant="outline"
            size="md"
            icon={<Printer className="size-4 text-slate-600" />}
            onClick={onOpenPrintModal}
            className="w-full sm:w-auto h-9 text-xs font-medium"
            aria-label="Print official transaction voucher or account statement"
          >
            Print
          </Button>
        </div>
      </div>

      {/* Internal CsvImportModal instance if not controlled by parent */}
      {!onOpenImportCsvModal && (
        <CsvImportModal
          isOpen={internalImportOpen}
          onClose={() => setInternalImportOpen(false)}
        />
      )}
    </div>
  );
};
