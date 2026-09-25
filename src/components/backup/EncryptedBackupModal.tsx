import React, { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useLedger } from '../../db/repository-context';
import { EncryptedBackupEnvelope } from '../../core/crypto/backup-crypto';
import {
  Lock,
  Download,
  Upload,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  FileCheck,
  FileText,
  KeyRound,
  HardDrive,
} from 'lucide-react';

interface EncryptedBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'export' | 'restore';
}

export const EncryptedBackupModal: React.FC<EncryptedBackupModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'export',
}) => {
  const {
    parties,
    transactions,
    emiPlans,
    recurringSchedules,
    exportEncryptedBackup,
    restoreEncryptedBackup,
  } = useLedger();

  const [mode, setMode] = useState<'export' | 'restore'>(initialMode);

  // Export State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordHint, setPasswordHint] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Restore State
  const [restoreFileContent, setRestoreFileContent] = useState<string>('');
  const [restoreFileName, setRestoreFileName] = useState<string>('');
  const [restoreEnvelope, setRestoreEnvelope] = useState<EncryptedBackupEnvelope | null>(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [showRestorePassword, setShowRestorePassword] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password strength score (0 to 4)
  const passwordStrength = React.useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }, [password]);

  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = [
    'bg-slate-200',
    'bg-rose-500',
    'bg-amber-500',
    'bg-sky-500',
    'bg-emerald-500',
  ];

  const handleExportDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setExportError(null);

    if (password.length < 6) {
      setExportError('Please enter a password of at least 6 characters for cold storage safety.');
      return;
    }

    if (password !== confirmPassword) {
      setExportError('Passwords do not match. Please re-enter confirmation password.');
      return;
    }

    setIsExporting(true);

    try {
      const encryptedJsonStr = await exportEncryptedBackup(password, passwordHint);
      const blob = new Blob([encryptedJsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `rabooks-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setPassword('');
      setConfirmPassword('');
      setPasswordHint('');
    } catch (err: any) {
      setExportError(err.message || 'Failed to generate encrypted backup.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFileName(file.name);
    setRestoreError(null);
    setRestoreSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRestoreFileContent(text);

      try {
        const parsed = JSON.parse(text);
        if (parsed.format === 'raBooks-encrypted-backup-v1') {
          setRestoreEnvelope(parsed as EncryptedBackupEnvelope);
        } else {
          setRestoreEnvelope(null);
        }
      } catch {
        setRestoreError('Selected file is not valid JSON. Please provide a valid raBooks backup file.');
        setRestoreEnvelope(null);
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRestoreError(null);
    setRestoreSuccessMsg(null);

    if (!restoreFileContent.trim()) {
      setRestoreError('Please select or upload a backup file first.');
      return;
    }

    if (!restorePassword) {
      setRestoreError('Please enter the password used when creating this backup.');
      return;
    }

    setIsRestoring(true);

    try {
      const result = await restoreEncryptedBackup(restoreFileContent, restorePassword);
      setRestoreSuccessMsg(
        `Backup successfully decrypted and restored: ${result.partyCount} parties and ${result.transactionCount} transactions loaded into your local ledger.`
      );
      setRestorePassword('');
      setRestoreFileContent('');
      setRestoreFileName('');
      setRestoreEnvelope(null);
    } catch (err: any) {
      setRestoreError(err.message || 'Failed to restore backup.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Secure Cold Storage Backup"
      subtitle="Encrypted backup and restore using AES-256-GCM. Keep your offline backups safe."
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => {
              setMode('export');
              setExportSuccess(false);
              setExportError(null);
            }}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              mode === 'export'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Create Encrypted Backup
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('restore');
              setRestoreSuccessMsg(null);
              setRestoreError(null);
            }}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              mode === 'restore'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Restore From Backup
          </button>
        </div>

        {/* ---------------- MODE 1: EXPORT / BACKUP ---------------- */}
        {mode === 'export' && (
          <div className="space-y-4">
            {exportSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Encrypted backup downloaded successfully</div>
                  <div className="text-emerald-800 mt-0.5 text-pretty">
                    Your file is encrypted with AES-256. Store it in a secure location (such as a USB flash drive or offline drive). You will need your password to restore it.
                  </div>
                </div>
              </div>
            )}

            {exportError && (
              <div
                role="alert"
                className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2"
              >
                <AlertCircle className="size-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{exportError}</span>
              </div>
            )}

            {/* Current Ledger Contents Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Current Ledger Records to Encrypt
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">Parties</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-slate-900">
                    {parties.length}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">Transactions</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-slate-900">
                    {transactions.length}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">EMI Plans</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-slate-900">
                    {emiPlans.length}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">Schedules</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-slate-900">
                    {recurringSchedules.length}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleExportDownload} className="space-y-3.5">
              {/* Password Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Backup Encryption Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter a strong password (minimum 6 characters)..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg pl-3 pr-9 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-2 p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex gap-1 grow">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 grow rounded-full transition-all ${
                            passwordStrength >= level
                              ? strengthColors[passwordStrength]
                              : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {strengthLabels[passwordStrength]}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter password to confirm..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                />
              </div>

              {/* Optional Password Hint */}
              <Input
                label="Password Reminder Hint (Optional)"
                placeholder="e.g. My office locker master code"
                value={passwordHint}
                onChange={(e) => setPasswordHint(e.target.value)}
                helper="This hint will be visible in the backup file header to help you recall your password."
              />

              <div className="pt-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                  <ShieldCheck className="size-4 text-emerald-600" />
                  <span>Standard 256-bit AES-GCM encryption</span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={isExporting}
                  disabled={!password || !confirmPassword || password !== confirmPassword}
                  icon={<Download className="size-4" />}
                  aria-label="Download encrypted backup file"
                >
                  Download Encrypted Backup (.json)
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ---------------- MODE 2: RESTORE / DECRYPT ---------------- */}
        {mode === 'restore' && (
          <div className="space-y-4">
            {restoreSuccessMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="font-semibold">{restoreSuccessMsg}</div>
              </div>
            )}

            {restoreError && (
              <div
                role="alert"
                className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2"
              >
                <AlertCircle className="size-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{restoreError}</span>
              </div>
            )}

            {/* File Upload Dropzone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Backup File (.json)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelected}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-slate-50 rounded-xl p-4 text-center cursor-pointer transition-colors"
              >
                {restoreFileName ? (
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-800">
                    <FileCheck className="size-4 text-emerald-600" />
                    <span>{restoreFileName}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({(restoreFileContent.length / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="size-5 text-slate-400 mx-auto" />
                    <div className="text-xs font-semibold text-slate-700">
                      Click to choose encrypted backup file
                    </div>
                    <div className="text-[11px] text-slate-400">Supports .json backup archives</div>
                  </div>
                )}
              </div>
            </div>

            {/* Backup Metadata Preview (if envelope detected) */}
            {restoreEnvelope && (
              <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-indigo-900 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Lock className="size-3.5 text-indigo-600" />
                    <span>Valid raBooks Encrypted Archive Detected</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(restoreEnvelope.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600">
                  <div>
                    Parties:{' '}
                    <strong className="text-slate-900">
                      {restoreEnvelope.summary?.partyCount ?? '?'}
                    </strong>
                  </div>
                  <div>
                    Transactions:{' '}
                    <strong className="text-slate-900">
                      {restoreEnvelope.summary?.transactionCount ?? '?'}
                    </strong>
                  </div>
                  <div>
                    EMI Plans:{' '}
                    <strong className="text-slate-900">
                      {restoreEnvelope.summary?.emiPlanCount ?? '?'}
                    </strong>
                  </div>
                  <div>
                    Schedules:{' '}
                    <strong className="text-slate-900">
                      {restoreEnvelope.summary?.recurringScheduleCount ?? '?'}
                    </strong>
                  </div>
                </div>

                {restoreEnvelope.passwordHint && (
                  <div className="pt-1.5 border-t border-indigo-100 flex items-center gap-1.5 text-indigo-800 text-[11px]">
                    <KeyRound className="size-3.5 text-indigo-600 shrink-0" />
                    <span>
                      Password Hint: <em>"{restoreEnvelope.passwordHint}"</em>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Password Entry to Decrypt */}
            <form onSubmit={handleRestoreSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Decryption Password *
                </label>
                <div className="relative">
                  <input
                    type={showRestorePassword ? 'text' : 'password'}
                    placeholder="Enter the password for this backup file..."
                    value={restorePassword}
                    onChange={(e) => setRestorePassword(e.target.value)}
                    required
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg pl-3 pr-9 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRestorePassword(!showRestorePassword)}
                    className="absolute right-2 top-2 p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                    aria-label={showRestorePassword ? 'Hide password' : 'Show password'}
                  >
                    {showRestorePassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900">
                <strong>Important:</strong> Restoring this backup will replace current local database records with the contents of this archive.
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={isRestoring}
                  disabled={!restoreFileContent || !restorePassword}
                  icon={<Upload className="size-3.5" />}
                  aria-label="Decrypt and restore ledger backup"
                >
                  Decrypt & Restore Ledger
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Modal>
  );
};
