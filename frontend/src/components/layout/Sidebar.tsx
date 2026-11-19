import React from 'react';
import { 
  LayoutDashboard, 
  Compass, 
  CheckCircle2, 
  GitCompare, 
  Server, 
  CheckSquare, 
  BarChart2, 
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}) => {
  const workspaceItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'recommendations', label: 'Smart Recommendations', icon: Compass },
    { id: 'analyzer', label: 'BUY / NOT BUY Analyzer', icon: CheckCircle2 },
    { id: 'comparison', label: 'Compare Hardware', icon: GitCompare },
    { id: 'catalogue', label: 'Hardware Catalogue', icon: Server },
  ];

  const systemItems = [
    { id: 'validation', label: 'Dataset Validation', icon: CheckSquare },
    { id: 'model-performance', label: 'Model Performance', icon: BarChart2 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const handleSelect = (id: string) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  const renderNavGroup = (title: string, items: typeof workspaceItems) => (
    <div className="space-y-1 mb-5">
      {!collapsed && (
        <div className="px-3 pb-1.5 text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
          {title}
        </div>
      )}
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => handleSelect(item.id)}
            title={collapsed ? item.label : undefined}
            className={`
              w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer
              ${isActive 
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-semibold border-l-2 border-blue-600 dark:border-blue-500 rounded-l-none' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
              }
              ${collapsed ? 'justify-center px-0' : ''}
            `}
          >
            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
            {!collapsed && (
              <span className="truncate">{item.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-xs"
        />
      )}

      {/* Sidebar container */}
      <aside className={`
        fixed md:sticky top-14 z-40 h-[calc(100vh-3.5rem)]
        bg-white dark:bg-[#11141A] border-r border-slate-200 dark:border-[#202632]
        transition-all duration-200 ease-in-out flex flex-col justify-between
        ${collapsed ? 'w-16' : 'w-60'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-3 overflow-y-auto pt-4">
          {renderNavGroup('Workspace', workspaceItems)}
          {renderNavGroup('System', systemItems)}
        </div>

        {/* Bottom Collapse Toggle */}
        <div className="p-2 border-t border-slate-200 dark:border-[#202632]">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex w-full items-center justify-center p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-medium gap-2 cursor-pointer"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-[11px]">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
