import React from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  ShieldCheck,
  Building2,
  HardDrive,
  X,
  Sparkles,
  CalendarClock,
  Bot,
} from 'lucide-react';
import { useLedger } from '../../db/repository-context';

export type NavigationTab = 'dashboard' | 'parties' | 'emi' | 'recurring' | 'ai-chat' | 'admin';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenCopilot: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  onOpenCopilot,
}) => {
  const { activeDriver, tenantId, telemetry, pendingDueSchedulesCount } = useLedger();

  const navItems = [
    {
      id: 'dashboard' as NavigationTab,
      label: 'Financial Ledger',
      subtitle: 'Transactions & Balances',
      icon: <LayoutDashboard className="size-4" />,
    },
    {
      id: 'parties' as NavigationTab,
      label: 'Parties & Accounts',
      subtitle: `${telemetry.activePartiesCount} Customers & Suppliers`,
      icon: <Users className="size-4" />,
    },
    {
      id: 'emi' as NavigationTab,
      label: 'Loans & EMI Plans',
      subtitle: 'Monthly Installments',
      icon: <CalendarCheck2 className="size-4" />,
    },
    {
      id: 'recurring' as NavigationTab,
      label: 'Recurring Schedules',
      subtitle: pendingDueSchedulesCount > 0 ? `${pendingDueSchedulesCount} Due Today` : `${telemetry.activeRecurringSchedulesCount} Active`,
      icon: <CalendarClock className="size-4" />,
    },
    {
      id: 'ai-chat' as NavigationTab,
      label: 'AI Ledger Advisor',
      subtitle: 'Gemini Multi-Turn Intelligence',
      icon: <Bot className="size-4" />,
    },
    {
      id: 'admin' as NavigationTab,
      label: 'Backup & Settings',
      subtitle: 'Cold Storage & Audit Trail',
      icon: <ShieldCheck className="size-4" />,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between bg-slate-900 text-slate-100 select-none">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center font-bold text-white shadow-xs">
              RB
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                raBooks
                <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-500/30">
                  v4.0
                </span>
              </div>
              <div className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">
                by Rustam • Industrial Core
              </div>
            </div>
          </div>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Copilot Quick Launcher banner */}
        <div className="px-3 pt-3">
          <button
            type="button"
            onClick={() => {
              onOpenCopilot();
              onCloseMobile();
            }}
            className="w-full text-left p-2.5 rounded-xl bg-gradient-to-r from-indigo-950 via-slate-900 to-violet-950 border border-indigo-800/50 hover:border-indigo-600 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <div>
                <div className="text-xs font-semibold text-white group-hover:text-indigo-200">
                  Gemini AI Copilot
                </div>
                <div className="text-[10px] text-indigo-300">
                  Magic Entry & Audit Scan
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-900/60 px-1.5 py-0.5 rounded">
              3 Flash
            </span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center gap-3 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <div className="grow min-w-0">
                  <div className="text-xs leading-none">{item.label}</div>
                  <div
                    className={`text-[10px] mt-0.5 truncate ${
                      isActive ? 'text-indigo-200' : 'text-slate-500'
                    }`}
                  >
                    {item.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status */}
      <div className="p-3 border-t border-slate-800 space-y-2">
        <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">
              Storage Engine
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <div className="text-[11px] font-mono font-medium text-slate-200 truncate flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">{activeDriver.name}</span>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 font-mono text-center">
          Tenant: {tenantId}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar (W >= 1024px) */}
      <aside className="hidden lg:block w-64 fixed inset-y-0 left-0 z-30 border-r border-slate-800">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isOpenMobile && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
};
