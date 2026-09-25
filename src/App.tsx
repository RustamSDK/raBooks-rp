import React, { useState } from 'react';
import { LedgerProvider, useLedger } from './db/repository-context';
import { Sidebar, NavigationTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ActionToolbar } from './components/actions/ActionToolbar';
import { TelemetryGrid } from './components/dashboard/TelemetryGrid';
import { OutstandingLedgersPanel } from './components/dashboard/OutstandingLedgersPanel';
import { CounterpartyList } from './components/dashboard/CounterpartyList';
import { TransactionLedgerTable } from './components/dashboard/TransactionLedgerTable';
import { BalanceTrendChart } from './components/dashboard/BalanceTrendChart';
import { PartiesView } from './components/parties/PartiesView';
import { EmiPlansView } from './components/emi/EmiPlansView';
import { RecurringScheduleView } from './components/recurring/RecurringScheduleView';
import { GeminiChatView } from './components/ai/GeminiChatView';
import { AdminPanelView } from './components/admin/AdminPanelView';

import { TransactionModal } from './components/actions/TransactionModal';
import { CounterpartyModal } from './components/actions/CounterpartyModal';
import { EmiRestructureModal } from './components/actions/EmiRestructureModal';
import { CreateRecurringModal } from './components/recurring/CreateRecurringModal';
import { MultiChannelShareModal } from './components/share/MultiChannelShareModal';
import { PrintSpoolerModal } from './components/print/PrintSpoolerModal';
import { CopilotModal } from './components/ai/CopilotModal';
import { CsvImportModal } from './components/actions/CsvImportModal';
import { EncryptedBackupModal } from './components/backup/EncryptedBackupModal';

import { CounterpartyEntity } from './core/models/counterparty';
import { MovementType, CanonicalTransaction } from './core/models/transaction';
import { Loader2 } from 'lucide-react';

const WorkspaceContent: React.FC = () => {
  const { isReady, parties } = useLedger();

  // Navigation & Layout
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);

  // Modal Open States
  const [txnModalOpen, setTxnModalOpen] = useState(false);
  const [txnModalType, setTxnModalType] = useState<MovementType>('GIVEN');
  const [txnDefaultPartyId, setTxnDefaultPartyId] = useState<string | undefined>(undefined);
  const [txnInitialValues, setTxnInitialValues] = useState<Partial<CanonicalTransaction> | undefined>(undefined);

  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [partyToEdit, setPartyToEdit] = useState<CounterpartyEntity | null>(null);

  const [emiModalOpen, setEmiModalOpen] = useState(false);
  const [createRecurringModalOpen, setCreateRecurringModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printTransactionId, setPrintTransactionId] = useState<string | undefined>(undefined);
  const [copilotModalOpen, setCopilotModalOpen] = useState(false);
  const [csvImportModalOpen, setCsvImportModalOpen] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);

  // Modal Handlers
  const handleOpenGiveModal = (partyId?: string) => {
    setTxnModalType('GIVEN');
    setTxnDefaultPartyId(partyId || (selectedPartyId ?? undefined));
    setTxnInitialValues(undefined);
    setTxnModalOpen(true);
  };

  const handleOpenTakeModal = (partyId?: string) => {
    setTxnModalType('TAKEN');
    setTxnDefaultPartyId(partyId || (selectedPartyId ?? undefined));
    setTxnInitialValues(undefined);
    setTxnModalOpen(true);
  };

  const handleQuickSettleForParty = (partyId: string, netBalancePaise: number) => {
    if (netBalancePaise === 0) return;
    const isReceivable = netBalancePaise > 0;
    const settleType: MovementType = isReceivable ? 'TAKEN' : 'GIVEN';
    const settleAmountPaise = Math.abs(netBalancePaise);
    const party = parties.find((p) => p.id === partyId);
    const partyName = party ? party.name : 'Counterparty';

    setTxnModalType(settleType);
    setTxnDefaultPartyId(partyId);
    setTxnInitialValues({
      partyId,
      type: settleType,
      totalAmountPaise: settleAmountPaise,
      purpose: isReceivable ? 'Receivable Collection' : 'Payable Settlement',
      notes: `Full account balance settlement & zero clearance for ${partyName}`,
      splits: [
        {
          id: `spl-${Date.now()}-1`,
          method: 'UPI',
          amountPaise: settleAmountPaise,
          initiatedBy: settleType === 'GIVEN' ? 'Lender' : 'Debtor',
          confirmed: true,
        },
      ],
    });
    setTxnModalOpen(true);
  };

  const handleOpenAddParty = () => {
    setPartyToEdit(null);
    setPartyModalOpen(true);
  };

  const handleEditParty = (party: CounterpartyEntity) => {
    setPartyToEdit(party);
    setPartyModalOpen(true);
  };

  const handleOpenPrintForTransaction = (txnId: string) => {
    setPrintTransactionId(txnId);
    setPrintModalOpen(true);
  };

  const handleOpenPrintGeneral = () => {
    setPrintTransactionId(undefined);
    setPrintModalOpen(true);
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <div className="text-sm font-semibold tracking-wide">
          Initializing raBooks ACID Core (raBooks_DB_v3)...
        </div>
        <div className="text-xs text-slate-400 font-mono">
          Verifying mathematical invariance and double-entry stores
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans text-slate-900">
      {/* 256px Vertical Navigation Rail */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onOpenCopilot={() => setCopilotModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="grow lg:pl-64 flex flex-col min-w-0">
        {/* Header */}
        <Header
          currentTab={currentTab}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onOpenCopilot={() => setCopilotModalOpen(true)}
        />

        {/* Workspace Body */}
        <main className="p-4 sm:p-6 space-y-4 max-w-7xl w-full mx-auto">
          {/* Responsive Action Toolbar */}
          <ActionToolbar
            onOpenGiveModal={() => handleOpenGiveModal()}
            onOpenTakeModal={() => handleOpenTakeModal()}
            onOpenAddPartyModal={handleOpenAddParty}
            onOpenEmiModal={() => setEmiModalOpen(true)}
            onOpenRecurringModal={() => setCreateRecurringModalOpen(true)}
            onOpenBackupModal={() => setBackupModalOpen(true)}
            onOpenShareModal={() => setShareModalOpen(true)}
            onOpenPrintModal={handleOpenPrintGeneral}
            onOpenCopilotModal={() => setCopilotModalOpen(true)}
            onOpenImportCsvModal={() => setCsvImportModalOpen(true)}
          />

          {/* Tab Views */}
          {currentTab === 'dashboard' && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <TelemetryGrid />

              {/* Outstanding Ledgers: TO RECEIVE & TO PAY */}
              <OutstandingLedgersPanel
                onSelectParty={setSelectedPartyId}
                onOpenTakeModalForParty={handleOpenTakeModal}
                onOpenGiveModalForParty={handleOpenGiveModal}
              />

              {/* Balance Trend */}
              <BalanceTrendChart
                selectedPartyId={selectedPartyId}
                onSelectParty={setSelectedPartyId}
              />

              {/* Dual-Pane View (Directory 4 cols | Ledger 8 cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <div className="lg:col-span-4">
                  <CounterpartyList
                    selectedPartyId={selectedPartyId}
                    onSelectParty={setSelectedPartyId}
                    onOpenAddParty={handleOpenAddParty}
                    onOpenGiveModalForParty={handleOpenGiveModal}
                    onOpenTakeModalForParty={handleOpenTakeModal}
                  />
                </div>

                <div className="lg:col-span-8">
                  <TransactionLedgerTable
                    selectedPartyId={selectedPartyId}
                    onOpenPrintForTransaction={handleOpenPrintForTransaction}
                    onSelectParty={setSelectedPartyId}
                    onOpenGiveModalForParty={handleOpenGiveModal}
                    onOpenTakeModalForParty={handleOpenTakeModal}
                    onQuickSettleForParty={handleQuickSettleForParty}
                  />
                </div>
              </div>
            </div>
          )}

          {currentTab === 'parties' && (
            <PartiesView
              onOpenAddParty={handleOpenAddParty}
              onEditParty={handleEditParty}
              onOpenGiveModalForParty={handleOpenGiveModal}
              onOpenTakeModalForParty={handleOpenTakeModal}
            />
          )}

          {currentTab === 'emi' && (
            <EmiPlansView
              onOpenCreateEmiModal={() => setEmiModalOpen(true)}
            />
          )}

          {currentTab === 'recurring' && <RecurringScheduleView />}

          {currentTab === 'ai-chat' && <GeminiChatView />}

          {currentTab === 'admin' && <AdminPanelView />}
        </main>
      </div>

      {/* Modals Container */}
      <TransactionModal
        isOpen={txnModalOpen}
        onClose={() => setTxnModalOpen(false)}
        defaultType={txnModalType}
        defaultPartyId={txnDefaultPartyId}
        initialValues={txnInitialValues}
      />

      <CounterpartyModal
        isOpen={partyModalOpen}
        onClose={() => setPartyModalOpen(false)}
        partyToEdit={partyToEdit}
      />

      <EmiRestructureModal
        isOpen={emiModalOpen}
        onClose={() => setEmiModalOpen(false)}
        defaultPartyId={selectedPartyId ?? undefined}
      />

      <CreateRecurringModal
        isOpen={createRecurringModalOpen}
        onClose={() => setCreateRecurringModalOpen(false)}
        defaultPartyId={selectedPartyId ?? undefined}
      />

      <MultiChannelShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        defaultPartyId={selectedPartyId ?? undefined}
      />

      <PrintSpoolerModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        defaultPartyId={selectedPartyId ?? undefined}
        defaultTransactionId={printTransactionId}
      />

      <CopilotModal
        isOpen={copilotModalOpen}
        onClose={() => setCopilotModalOpen(false)}
        onOpenTransactionWithParsed={(parsed) => {
          setTxnInitialValues(parsed);
          setTxnModalOpen(true);
        }}
      />

      <CsvImportModal
        isOpen={csvImportModalOpen}
        onClose={() => setCsvImportModalOpen(false)}
      />

      <EncryptedBackupModal
        isOpen={backupModalOpen}
        onClose={() => setBackupModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <LedgerProvider>
      <WorkspaceContent />
    </LedgerProvider>
  );
}
