import React, { useState, useMemo, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useLedger } from '../../db/repository-context';
import {
  parseCsvToTransactions,
  SAMPLE_CSV_TEMPLATE,
  ParsedCsvRow,
  PaymentSplitAllocation,
} from '../../core';
import { formatPaiseToInr } from '../../core/formatters/currency';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Building2,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose }) => {
  const { parties, tenantId, bulkRecordTransactions } = useLedger();

  const [csvText, setCsvText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [autoRegisterParties, setAutoRegisterParties] = useState<boolean>(true);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [importSummary, setImportSummary] = useState<{
    successCount: number;
    errorCount: number;
    errors: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reactive parsing whenever CSV text or party master changes
  const parseResult = useMemo(() => {
    if (!csvText.trim()) return null;
    return parseCsvToTransactions(csvText, parties, tenantId);
  }, [csvText, parties, tenantId]);

  const handleFileChange = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text || '');
      setImportSummary(null);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleLoadSample = () => {
    setFileName('sample-rabooks-batch.csv');
    setCsvText(SAMPLE_CSV_TEMPLATE);
    setImportSummary(null);
  };

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rabooks-sample-import-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setCsvText('');
    setFileName(null);
    setImportSummary(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCommitBulkImport = async () => {
    if (!parseResult || parseResult.validRowsCount === 0) return;

    setIsCommitting(true);
    setImportSummary(null);

    try {
      const validTxns = parseResult.rows
        .filter((r: ParsedCsvRow) => r.isValid && r.canonicalTxn)
        .map((r: ParsedCsvRow) => r.canonicalTxn!);

      const partiesToRegister = autoRegisterParties ? parseResult.newPartiesToCreate : [];

      const result = await bulkRecordTransactions(validTxns, partiesToRegister);
      setImportSummary(result);
    } catch (err: any) {
      setImportSummary({
        successCount: 0,
        errorCount: 1,
        errors: [err.message || 'Bulk ingestion failed during repository commit.'],
      });
    } finally {
      setIsCommitting(false);
    }
  };

  const resetAndClose = () => {
    handleClear();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      title="Bulk Ingest Ledger Transactions via CSV"
      subtitle="Autonomous RFC 4180 parsing with Double-Entry & Integer Paisa Invariant Validation"
      maxWidth="4xl"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Enforces <strong className="text-slate-700 font-semibold">Law 1 (Integer Paisa)</strong> &amp;{' '}
              <strong className="text-slate-700 font-semibold">Law 2 (Δ = 0 Reconciliation)</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={resetAndClose}
              disabled={isCommitting}
            >
              {importSummary && importSummary.successCount > 0 ? 'Close' : 'Cancel'}
            </Button>

            <Button
              type="button"
              variant="success"
              size="md"
              icon={
                isCommitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )
              }
              disabled={
                isCommitting ||
                !parseResult ||
                parseResult.validRowsCount === 0 ||
                (importSummary !== null && importSummary.successCount > 0)
              }
              onClick={handleCommitBulkImport}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isCommitting
                ? 'Ingesting Batch...'
                : parseResult
                ? `Commit Bulk Ingestion (${parseResult.validRowsCount} Transactions)`
                : 'Select CSV to Ingest'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-slate-800">
        {/* Ingestion Source Tabs & Utilities */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'upload'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              File Upload
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'paste'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Direct CSV Text
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5 text-indigo-600" />}
              onClick={handleLoadSample}
              className="text-xs text-indigo-700 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/60"
            >
              Load Sample Template
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<Download className="w-3.5 h-3.5 text-slate-600" />}
              onClick={handleDownloadSample}
              className="text-xs"
            >
              Download Template (.csv)
            </Button>

            {csvText && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                onClick={handleClear}
                className="text-xs text-rose-600 hover:bg-rose-50"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Input Controls */}
        {activeTab === 'upload' ? (
          <div>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/60'
                  : fileName
                  ? 'border-emerald-300 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    fileName ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  {fileName ? (
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-emerald-900">{fileName}</p>
                      <p className="text-xs text-emerald-700">Click or drag a new file to replace</p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-slate-700">
                        Drop your CSV ledger file here, or{' '}
                        <span className="text-indigo-600 font-semibold underline">browse</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        Supports UTF-8 RFC 4180 CSV exports from raBooks, Tally, Excel, or Google Sheets
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Paste Raw CSV Content
            </label>
            <textarea
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                setImportSummary(null);
              }}
              placeholder={`Transaction ID,Date,Counterparty,Movement Type,Total Amount (INR),Payment Rails & Splits,External Reference IDs,Narration\nRB-TXN-101001,2026-09-20,Reliance Petrochem Distributors,GIVEN,75000.00,Bank,NEFT-ICICI-260920491,Raw materials batch procurement`}
              rows={5}
              className="w-full font-mono text-xs p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-900 text-slate-100 placeholder-slate-500"
            />
          </div>
        )}

        {/* Ingestion Options Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs gap-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRegisterParties}
              onChange={(e) => setAutoRegisterParties(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
            />
            <span className="text-slate-700 font-medium">
              Auto-register non-existent counterparties in Master Directory
            </span>
          </label>

          {parseResult && parseResult.newPartiesToCreate.length > 0 && (
            <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200">
              <Building2 className="w-3.5 h-3.5 text-amber-600" />
              <span>
                <strong>{parseResult.newPartiesToCreate.length}</strong> new entities will be registered
              </span>
            </div>
          )}
        </div>

        {/* Execution Summary Notification */}
        {importSummary && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              importSummary.errorCount === 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            {importSummary.errorCount === 0 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-semibold text-sm">
                {importSummary.errorCount === 0
                  ? `Successfully Ingested ${importSummary.successCount} Transactions to Ledger`
                  : `Ingested ${importSummary.successCount} Transactions (${importSummary.errorCount} Rejected)`}
              </div>
              <p className="text-xs">
                All records were validated against integer mathematical invariants and written to
                local-first IndexedDB (<code>raBooks_DB_v3</code>). Audit non-repudiation log recorded.
              </p>
              {importSummary.errors.length > 0 && (
                <ul className="text-xs list-disc list-inside space-y-0.5 mt-1 font-mono text-rose-700">
                  {importSummary.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Validation Telemetry Header */}
        {parseResult && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Rows Parsed
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                {parseResult.totalRows}
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center justify-between">
                <span>Valid Invariants</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-xl font-bold font-mono text-emerald-900 mt-0.5">
                {parseResult.validRowsCount}
              </div>
            </div>

            <div
              className={`border rounded-lg p-3 ${
                parseResult.invalidRowsCount > 0
                  ? 'bg-rose-50 border-rose-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div
                className={`text-[11px] font-semibold uppercase tracking-wider flex items-center justify-between ${
                  parseResult.invalidRowsCount > 0 ? 'text-rose-700' : 'text-slate-500'
                }`}
              >
                <span>Discrepancies</span>
                {parseResult.invalidRowsCount > 0 && (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                )}
              </div>
              <div
                className={`text-xl font-bold font-mono mt-0.5 ${
                  parseResult.invalidRowsCount > 0 ? 'text-rose-900' : 'text-slate-700'
                }`}
              >
                {parseResult.invalidRowsCount}
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">
                Batch Value (Valid)
              </div>
              <div className="text-lg font-bold font-mono text-indigo-900 mt-0.5 truncate">
                {formatPaiseToInr(parseResult.totalValidPaise)}
              </div>
              <div className="text-[10px] text-indigo-600 font-mono">
                {parseResult.totalValidPaise.toLocaleString()} paise
              </div>
            </div>
          </div>
        )}

        {/* Verification Preview Table */}
        {parseResult && parseResult.rows.length > 0 && (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Transaction Batch Invariant Verification Matrix</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Displaying {parseResult.rows.length} rows
              </div>
            </div>

            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Row</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Canonical ID</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Counterparty</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Amount (INR / Paise)</th>
                    <th className="py-2.5 px-3">Payment Rails &amp; Splits</th>
                    <th className="py-2.5 px-3">Reference (UTR)</th>
                    <th className="py-2.5 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-sans">
                  {parseResult.rows.map((row: ParsedCsvRow) => {
                    const isGiven = row.canonicalTxn?.type === 'GIVEN';
                    return (
                      <tr
                        key={row.rowNumber}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          !row.isValid ? 'bg-rose-50/30' : ''
                        }`}
                      >
                        {/* Row # */}
                        <td className="py-2.5 px-3 font-mono text-slate-400">
                          #{row.rowNumber}
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {row.isValid ? (
                            <Badge variant="trustGreen" size="sm">
                              Valid (Δ=0)
                            </Badge>
                          ) : (
                            <div className="space-y-0.5">
                              <Badge variant="trustRed" size="sm">
                                Discrepancy
                              </Badge>
                              <div className="text-[10px] text-rose-600 font-medium max-w-xs">
                                {row.validationErrors.join(' ')}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Canonical ID */}
                        <td className="py-2.5 px-3 font-mono text-indigo-700 whitespace-nowrap font-medium">
                          {row.canonicalTxn?.id}
                        </td>

                        {/* Date */}
                        <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {row.canonicalTxn?.date}
                        </td>

                        {/* Counterparty */}
                        <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{row.partyName || 'Unknown Entity'}</span>
                            {row.matchedParty ? (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                                Matched
                              </span>
                            ) : (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                                + New
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Type */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {isGiven ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              GIVEN
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                              TAKEN
                            </span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                          <div
                            className={`font-semibold ${
                              isGiven ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {formatPaiseToInr(row.canonicalTxn?.totalAmountPaise || 0)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {(row.canonicalTxn?.totalAmountPaise || 0).toLocaleString()} p
                          </div>
                        </td>

                        {/* Splits */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {row.canonicalTxn?.splits.map((split: PaymentSplitAllocation, sIdx: number) => (
                              <span
                                key={sIdx}
                                className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 font-mono text-[10px] px-1.5 py-0.5 rounded border border-slate-200"
                              >
                                <strong>{split.method}:</strong>
                                <span>{formatPaiseToInr(split.amountPaise)}</span>
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Reference / UTR */}
                        <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                          {row.canonicalTxn?.splits[0]?.paymentReferenceId || '—'}
                        </td>

                        {/* Narration */}
                        <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={row.canonicalTxn?.notes}>
                          {row.canonicalTxn?.notes || '—'}
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
    </Modal>
  );
};
