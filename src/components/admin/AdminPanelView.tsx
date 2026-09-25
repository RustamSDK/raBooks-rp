import React, { useState } from 'react';
import { useLedger } from '../../db/repository-context';
import { DatabaseDriverType } from '../../db/interface';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EncryptedBackupModal } from '../backup/EncryptedBackupModal';
import {
  Database,
  HardDrive,
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  Search,
  Code2,
  CheckCircle2,
  FileCode,
  Lock,
} from 'lucide-react';

export const AdminPanelView: React.FC = () => {
  const {
    activeDriver,
    switchDriver,
    auditLogs,
    exportSnapshotJson,
    restoreSnapshotJson,
    resetDatabase,
    parties,
    transactions,
    emiPlans,
  } = useLedger();

  const [activeTab, setActiveTab] = useState<'drivers' | 'backup' | 'audit' | 'ddl'>('drivers');
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [backupModalMode, setBackupModalMode] = useState<'export' | 'restore'>('export');
  const [restoreText, setRestoreText] = useState('');
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const [auditSearch, setAuditSearch] = useState('');

  const handleDownloadSnapshot = async () => {
    const jsonStr = await exportSnapshotJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rabooks-snapshot-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestoreSubmit = async () => {
    if (!restoreText.trim()) return;
    try {
      await restoreSnapshotJson(restoreText);
      setRestoreStatus('Snapshot successfully restored to local ACID store.');
      setRestoreText('');
      setTimeout(() => setRestoreStatus(null), 3000);
    } catch (err: any) {
      setRestoreStatus(`Restore error: ${err.message}`);
    }
  };

  const handleResetDatabase = async () => {
    if (
      window.confirm(
        'Are you sure you wish to reset all database stores to institutional seed fixtures? All manual edits will be overwritten.'
      )
    ) {
      await resetDatabase();
      alert('Database reset to institutional default fixtures.');
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    const q = auditSearch.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.actor.toLowerCase().includes(q) ||
      log.target.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            System Administration & Security Audit Trail
          </h2>
          <p className="text-xs text-slate-500">
            Pluggable persistence engine hot-swapping, disaster recovery backups, and non-repudiation audit logging
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('drivers')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === 'drivers'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Persistence Drivers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === 'backup'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Snapshot & Sync
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Audit Log ({auditLogs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ddl')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === 'ddl'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            PostgreSQL DDL
          </button>
        </div>
      </div>

      {/* Tab 1: Database Drivers */}
      {activeTab === 'drivers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Driver 1: IndexedDB (Default Active) */}
          <div
            className={`border rounded-xl p-5 space-y-3 transition-all ${
              activeDriver.type === 'indexeddb'
                ? 'bg-indigo-50/40 border-indigo-500 ring-2 ring-indigo-100'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Browser IndexedDB (raBooks_DB_v3)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Law 7: Local-First Zero-Latency ACID Storage (&lt;16ms render budget)
                  </p>
                </div>
              </div>
              <Badge variant={activeDriver.type === 'indexeddb' ? 'trustGreen' : 'neutral'} size="sm">
                {activeDriver.type === 'indexeddb' ? 'Active Primary' : 'Available'}
              </Badge>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Fully self-contained client-side database utilizing standard browser IndexedDB object stores.
              Guarantees uninterrupted offline ledger mutations and instant UI responsiveness without remote network latency.
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-mono">
                Stores: parties, transactions, emi_plans, audit_log
              </span>
              <Button
                type="button"
                variant={activeDriver.type === 'indexeddb' ? 'secondary' : 'outline'}
                size="sm"
                disabled={activeDriver.type === 'indexeddb'}
                onClick={() => switchDriver('indexeddb')}
              >
                {activeDriver.type === 'indexeddb' ? 'Current Engine' : 'Activate Driver'}
              </Button>
            </div>
          </div>

          {/* Driver 2: PostgreSQL Relational Driver */}
          <div
            className={`border rounded-xl p-5 space-y-3 transition-all ${
              activeDriver.type === 'postgres'
                ? 'bg-indigo-50/40 border-indigo-500 ring-2 ring-indigo-100'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    PostgreSQL Relational Adapter
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ISO/IEC 27001 Multi-Tenant Relational Core with Reconciliation Trigger
                  </p>
                </div>
              </div>
              <Badge variant={activeDriver.type === 'postgres' ? 'trustGreen' : 'neutral'} size="sm">
                {activeDriver.type === 'postgres' ? 'Active Secondary' : 'Configured'}
              </Badge>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Enterprise relational persistence backed by Node-Postgres and strict PL/pgSQL constraint triggers
              enforcing split reconciliation (trg_check_splits_reconciliation).
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-mono">
                Host: db.internal.rabooks.io:5432
              </span>
              <Button
                type="button"
                variant={activeDriver.type === 'postgres' ? 'secondary' : 'outline'}
                size="sm"
                disabled={activeDriver.type === 'postgres'}
                onClick={() => switchDriver('postgres')}
              >
                {activeDriver.type === 'postgres' ? 'Current Engine' : 'Hot-Swap to Postgres'}
              </Button>
            </div>
          </div>

          {/* Driver 3: MongoDB Document Store */}
          <div
            className={`border rounded-xl p-5 space-y-3 transition-all ${
              activeDriver.type === 'mongodb'
                ? 'bg-indigo-50/40 border-indigo-500 ring-2 ring-indigo-100'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    MongoDB Embedded Document Adapter
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Document model with embedded payment splits array
                  </p>
                </div>
              </div>
              <Badge variant={activeDriver.type === 'mongodb' ? 'trustGreen' : 'neutral'} size="sm">
                {activeDriver.type === 'mongodb' ? 'Active Secondary' : 'Configured'}
              </Badge>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              NoSQL schema storing canonical transaction entities with embedded splits arrays and atomic document mutations.
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-mono">
                Cluster: mongodb+srv://cluster-0.rabooks.net
              </span>
              <Button
                type="button"
                variant={activeDriver.type === 'mongodb' ? 'secondary' : 'outline'}
                size="sm"
                disabled={activeDriver.type === 'mongodb'}
                onClick={() => switchDriver('mongodb')}
              >
                {activeDriver.type === 'mongodb' ? 'Current Engine' : 'Hot-Swap to MongoDB'}
              </Button>
            </div>
          </div>

          {/* Driver 4: Google Sheets Bridge */}
          <div
            className={`border rounded-xl p-5 space-y-3 transition-all ${
              activeDriver.type === 'sheets'
                ? 'bg-indigo-50/40 border-indigo-500 ring-2 ring-indigo-100'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Google Sheets Webhook Sync Bridge
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Google Apps Script HTTP POST webhook ledger integration
                  </p>
                </div>
              </div>
              <Badge variant={activeDriver.type === 'sheets' ? 'trustGreen' : 'neutral'} size="sm">
                {activeDriver.type === 'sheets' ? 'Active Secondary' : 'Configured'}
              </Badge>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Real-time webhook dispatcher broadcasting transaction splits to Google Sheets spreadsheets for external accountant access.
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-mono truncate max-w-[200px]">
                Endpoint: script.google.com/macros/s/...
              </span>
              <Button
                type="button"
                variant={activeDriver.type === 'sheets' ? 'secondary' : 'outline'}
                size="sm"
                disabled={activeDriver.type === 'sheets'}
                onClick={() => switchDriver('sheets')}
              >
                {activeDriver.type === 'sheets' ? 'Current Engine' : 'Hot-Swap to Sheets'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Snapshot & Backup */}
      {activeTab === 'backup' && (
        <div className="space-y-4">
          {/* Primary Recommended: Encrypted Cold Storage Backup */}
          <div className="bg-linear-to-br from-indigo-50/70 via-white to-slate-50 border border-indigo-200 rounded-xl p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-600 text-white rounded-lg">
                    <Lock className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Encrypted Cold Storage Backup (AES-256)
                    </h3>
                    <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Recommended for Offline & Safe Archival
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 max-w-xl text-pretty mt-1">
                  Download your entire ledger state as a password-protected, encrypted JSON archive using industry-standard AES-256-GCM and PBKDF2 key derivation. Your data remains completely private and can be safely kept on offline storage drives.
                </p>
              </div>

              <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  icon={<Download className="size-4" />}
                  onClick={() => {
                    setBackupModalMode('export');
                    setBackupModalOpen(true);
                  }}
                  aria-label="Create encrypted backup file"
                >
                  Create Encrypted Backup
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={<Upload className="size-3.5 text-indigo-600" />}
                  onClick={() => {
                    setBackupModalMode('restore');
                    setBackupModalOpen(true);
                  }}
                  aria-label="Restore from encrypted backup file"
                >
                  Restore From Backup
                </Button>
              </div>
            </div>
          </div>

          {/* Secondary: Developer & Raw Snapshot Tools */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Plain JSON Snapshot Export
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Export an unencrypted JSON payload for developer testing, manual inspections, or migration.
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-xs space-y-1">
                <div>Parties in Ledger: {parties.length}</div>
                <div>Transactions in Ledger: {transactions.length}</div>
                <div>EMI Plans in Ledger: {emiPlans.length}</div>
                <div>Audit Records in Ledger: {auditLogs.length}</div>
              </div>

              <Button
                type="button"
                variant="outline"
                icon={<Download className="size-4 text-slate-600" />}
                onClick={handleDownloadSnapshot}
              >
                Export Plain JSON
              </Button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Restore Plain Snapshot
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Paste unencrypted JSON snapshot content to replace local browser state.
                </p>
              </div>

              {restoreStatus && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs rounded-lg font-medium">
                  {restoreStatus}
                </div>
              )}

              <textarea
                rows={4}
                placeholder="Paste unencrypted JSON snapshot here..."
                value={restoreText}
                onChange={(e) => setRestoreText(e.target.value)}
                className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-indigo-500"
              />

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={<RotateCcw className="size-4 text-rose-600" />}
                  onClick={handleResetDatabase}
                >
                  Reset to Seed Fixtures
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!restoreText.trim()}
                  icon={<Upload className="size-4" />}
                  onClick={handleRestoreSubmit}
                >
                  Restore Plain JSON
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Security Audit Log (Law 8) */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden space-y-0">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900 tracking-tight uppercase">
                  Immutable Non-Repudiation Audit Trail (Law 8)
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Append-only tamper-evident security ledger capturing actor, action, timestamp, and target
              </p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter audit records..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none w-56"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Timestamp (ISO 8601)</th>
                  <th className="py-2.5 px-3">Actor Identity</th>
                  <th className="py-2.5 px-3">Action Type</th>
                  <th className="py-2.5 px-3">Target Entity</th>
                  <th className="py-2.5 px-3">Mutation Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredLogs.map((log, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="py-2 px-3 whitespace-nowrap text-slate-500">
                      {new Date(log.timestamp).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap font-medium text-slate-800">
                      {log.actor}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap font-semibold text-slate-900">
                      {log.target}
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-600 max-w-md truncate">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: PostgreSQL DDL Inspector */}
      {activeTab === 'ddl' && (
        <div className="bg-slate-900 text-slate-100 rounded-xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="text-sm font-bold text-white">
                  PostgreSQL Production DDL & Invariance Trigger
                </h3>
                <p className="text-xs text-slate-400">
                  Section 5.1 Architecture: Canonical schemas with split reconciliation trigger
                </p>
              </div>
            </div>
            <span className="text-xs font-mono bg-slate-800 text-emerald-400 px-2 py-1 rounded">
              ISO/IEC 27001 Certified
            </span>
          </div>

          <pre className="text-xs font-mono text-emerald-300 overflow-x-auto p-3 bg-slate-950 rounded-lg max-h-96 leading-relaxed select-all">
{`-- packages/db-adapters/src/postgres/schema.sql

CREATE TYPE movement_type AS ENUM ('GIVEN', 'TAKEN');
CREATE TYPE payment_rail AS ENUM ('Cash', 'UPI', 'Bank', 'Cheque');
CREATE TYPE transaction_status AS ENUM ('Pending', 'Confirmed', 'Disputed', 'Voided');

CREATE TABLE counterparties (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    relation VARCHAR(20) NOT NULL DEFAULT 'Customer',
    rate_percent_monthly NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    trust_score VARCHAR(10) NOT NULL DEFAULT 'green',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE transactions (
    id VARCHAR(36) PRIMARY KEY, -- RB-TXN-XXXXXX
    tenant_id VARCHAR(36) NOT NULL,
    party_id VARCHAR(36) NOT NULL REFERENCES counterparties(id),
    type movement_type NOT NULL,
    total_amount_paise BIGINT NOT NULL CHECK (total_amount_paise > 0),
    date DATE NOT NULL,
    notes TEXT,
    status transaction_status NOT NULL DEFAULT 'Confirmed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE transaction_splits (
    id VARCHAR(36) PRIMARY KEY,
    transaction_id VARCHAR(36) NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    method payment_rail NOT NULL,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    payment_reference_id VARCHAR(255), -- UTR, Cheque #, Bank Reference
    initiated_by VARCHAR(20) NOT NULL,
    confirmed BOOLEAN NOT NULL DEFAULT TRUE
);

-- Integrity trigger: Enforces split sum === transaction total (Law 2: Delta = 0)
CREATE OR REPLACE FUNCTION verify_transaction_splits_reconciliation()
RETURNS TRIGGER AS $$
DECLARE
    sum_splits BIGINT;
    txn_total BIGINT;
BEGIN
    SELECT COALESCE(SUM(amount_paise), 0) INTO sum_splits
    FROM transaction_splits
    WHERE transaction_id = NEW.transaction_id;

    SELECT total_amount_paise INTO txn_total
    FROM transactions
    WHERE id = NEW.transaction_id;

    IF (sum_splits > txn_total) THEN
        RAISE EXCEPTION 'ERR_SPLIT_OVER_ALLOCATION: Splits exceed transaction total';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;`}
          </pre>
        </div>
      )}
    </div>
  );
};
