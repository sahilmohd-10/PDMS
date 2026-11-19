import React, { useState } from 'react';
import { 
  Sun, Moon, Terminal, ShieldCheck, RefreshCw, 
  Trash2, Sliders, Info, CheckCircle2
} from 'lucide-react';
import { hirsApi } from '../services/api';
import { Toast, type ToastMessage } from '../components/ui/Toast';

interface SettingsProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const Settings: React.FC<SettingsProps> = ({ darkMode, setDarkMode }) => {
  const [testingApi, setTestingApi] = useState(false);
  const [apiStatus, setApiStatus] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // User Preferences
  const [defaultDevice, setDefaultDevice] = useState<string>(() => {
    return localStorage.getItem('hirs-pref-device') || 'Desktop';
  });

  const [defaultBudget, setDefaultBudget] = useState<number>(() => {
    return Number(localStorage.getItem('hirs-pref-budget') || 150000);
  });

  const testConnection = async () => {
    setTestingApi(true);
    const start = performance.now();
    try {
      const res = await hirsApi.checkHealth();
      const elapsed = Math.round(performance.now() - start);
      setLatencyMs(elapsed);
      setApiStatus(`Connected successfully: ${res.status} (${elapsed}ms)`);
      setToast({
        id: String(Date.now()),
        type: 'success',
        text: `Backend API responded in ${elapsed}ms (${res.status})`
      });
    } catch (err: any) {
      setApiStatus(`Connection failed: ${err.message}`);
      setToast({
        id: String(Date.now()),
        type: 'error',
        text: `Backend connection failed: ${err.message}`
      });
    } finally {
      setTestingApi(false);
    }
  };

  const handleSavePreferences = () => {
    localStorage.setItem('hirs-pref-device', defaultDevice);
    localStorage.setItem('hirs-pref-budget', String(defaultBudget));
    setToast({
      id: String(Date.now()),
      type: 'success',
      text: 'User preferences saved successfully.'
    });
  };

  const handleClearAllData = () => {
    if (window.confirm("Are you sure you want to clear all locally saved evaluation history and bookmarks?")) {
      localStorage.removeItem('hirs-recent-evals');
      localStorage.removeItem('hirs-saved-recommendations');
      localStorage.removeItem('hirs-dismiss-welcome');
      setToast({
        id: String(Date.now()),
        type: 'info',
        text: 'All local application cache and saved data cleared.'
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      
      {/* Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-[#202632]">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Settings & Documentation
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure appearance, manage preferences, verify API connectivity, and review engineering specifications.
        </p>
      </div>

      {/* Preferences Section */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] space-y-4">
        <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-blue-600" />
          <span>Appearance & Preferences</span>
        </h2>

        {/* Theme */}
        <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-[#202632]">
          <div>
            <div className="text-xs font-semibold text-slate-900 dark:text-white">
              Interface Theme
            </div>
            <div className="text-[11px] text-slate-500">
              Toggle between natural Light and high-contrast Dark mode
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode(false)}
              className={`p-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                !darkMode ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Light</span>
            </button>
            <button
              onClick={() => setDarkMode(true)}
              className={`p-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                darkMode ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark</span>
            </button>
          </div>
        </div>

        {/* Default Device & Budget */}
        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Default Recommendation Form Factor
            </label>
            <select
              value={defaultDevice}
              onChange={(e) => setDefaultDevice(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="Desktop">Desktop PC</option>
              <option value="Laptop">Laptop</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Default Target Budget (₹ INR)
            </label>
            <input
              type="number"
              step={5000}
              value={defaultBudget}
              onChange={(e) => setDefaultBudget(Number(e.target.value))}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSavePreferences}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Save Preferences
          </button>
        </div>
      </div>

      {/* Backend API Connectivity */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] space-y-4">
        <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>API Connectivity & Service Health</span>
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2">
          <div>
            <div className="text-xs font-semibold text-slate-900 dark:text-white">
              Target Backend Service
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              http://127.0.0.1:8000
            </div>
            {apiStatus && (
              <div className={`text-xs font-semibold mt-1.5 flex items-center gap-1.5 ${
                apiStatus.includes('successfully') ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{apiStatus}</span>
                {latencyMs !== null && (
                  <span className="text-[11px] font-mono text-slate-400 font-normal">
                    (Latency: {latencyMs}ms)
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            onClick={testConnection}
            disabled={testingApi}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-800 dark:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
          >
            {testingApi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            <span>Ping Backend</span>
          </button>
        </div>
      </div>

      {/* Data Management */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] space-y-3">
        <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Trash2 className="w-4 h-4 text-rose-500" />
          <span>Local Storage & Cache Management</span>
        </h2>

        <div className="flex items-center justify-between text-xs py-2">
          <div>
            <span className="font-semibold text-slate-900 dark:text-white block">Reset Local Data</span>
            <span className="text-[11px] text-slate-500">
              Clears saved recommendations, recent evaluation history, and dismissed banners stored in your browser.
            </span>
          </div>

          <button
            onClick={handleClearAllData}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors cursor-pointer shrink-0"
          >
            Clear Data
          </button>
        </div>
      </div>

      {/* Engineering Architecture & Documentation */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] space-y-4">
        <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Terminal className="w-4 h-4 text-blue-500" />
          <span>HIRS Architecture & Run Instructions</span>
        </h2>

        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-white/5 space-y-1.5">
            <span className="font-bold text-slate-900 dark:text-white block">1. Run Backend Server (FastAPI):</span>
            <code className="block p-2 rounded bg-slate-900 text-slate-100 font-mono text-[11px]">
              python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
            </code>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-white/5 space-y-1.5">
            <span className="font-bold text-slate-900 dark:text-white block">2. Run Frontend Server (React + Vite):</span>
            <code className="block p-2 rounded bg-slate-900 text-slate-100 font-mono text-[11px]">
              cd frontend && npm run dev
            </code>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-white/5 space-y-1.5">
            <span className="font-bold text-slate-900 dark:text-white block">3. Run Automated Tests:</span>
            <code className="block p-2 rounded bg-slate-900 text-slate-100 font-mono text-[11px]">
              python -m pytest backend/tests/test_api.py -v
            </code>
          </div>
        </div>
      </div>

      {/* About HIRS */}
      <div className="p-5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-[#202632] text-xs text-slate-600 dark:text-slate-400 space-y-2">
        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <Info className="w-4 h-4 text-slate-400" />
          <span>About HIRS (Hardware Intelligence & Recommendation System)</span>
        </span>
        <p className="leading-relaxed text-[11px]">
          HIRS v1.0.0 is an artificial intelligence platform designed to evaluate and discover PC and laptop hardware configurations. Predictions are generated by a trained LightGBM gradient-boosted decision forest evaluated against 37,500 holdout tests.
        </p>
      </div>

    </div>
  );
};
