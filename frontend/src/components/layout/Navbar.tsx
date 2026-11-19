import React from 'react';
import { Cpu, Sun, Moon, Plus, Menu, X } from 'lucide-react';

interface NavbarProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (val: boolean) => void;
}

const TAB_TITLES: Record<string, { section: string; title: string }> = {
  dashboard: { section: 'Workspace', title: 'Dashboard' },
  recommendations: { section: 'Workspace', title: 'Smart Recommendations' },
  analyzer: { section: 'Workspace', title: 'BUY / NOT BUY Analyzer' },
  comparison: { section: 'Workspace', title: 'Compare Hardware' },
  catalogue: { section: 'Workspace', title: 'Hardware Catalogue' },
  validation: { section: 'System', title: 'Dataset Validation' },
  'model-performance': { section: 'System', title: 'Model Performance' },
  settings: { section: 'System', title: 'Settings' },
};

export const Navbar: React.FC<NavbarProps> = ({
  darkMode,
  setDarkMode,
  activeTab,
  setActiveTab,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const current = TAB_TITLES[activeTab] || { section: 'Workspace', title: 'Dashboard' };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-[#11141A]/90 backdrop-blur-md border-b border-slate-200 dark:border-[#202632] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        
        {/* Brand Logo & Wordmark */}
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-sm">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-base text-slate-900 dark:text-white block leading-none">
                HIRS
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-tight">
                Hardware Intelligence
              </span>
            </div>
          </button>

          {/* Breadcrumb separator */}
          <div className="hidden sm:flex items-center text-xs text-slate-400 dark:text-slate-500 gap-1.5 pl-3 border-l border-slate-200 dark:border-[#202632]">
            <span>{current.section}</span>
            <span>/</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{current.title}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('recommendations')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Recommendation</span>
          </button>

          <button
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? "Switch to light theme" : "Switch to dark theme"}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Toggle Theme"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </header>
  );
};
