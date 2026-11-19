import React, { useState, useEffect } from 'react';
import { 
  Sun, Moon, Terminal, ShieldCheck, RefreshCw, 
  Trash2, Sliders, Info, CheckCircle2, Cpu, Zap
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
  const [engineStatus, setEngineStatus] = useState<any>(null);
  const [engineConfig, setEngineConfig] = useState<any>(null);

  // User Preferences
  const [defaultDevice, setDefaultDevice] = useState<string>(() => {
    return localStorage.getItem('hirs-pref-device') || 'Desktop';
  });

  const [defaultBudget, setDefaultBudget] = useState<number>(() => {
    return Number(localStorage.getItem('hirs-pref-budget') || 150000);
  });

  useEffect(() => {
    hirsApi.getEvaluationStatus()
      .then(res => setEngineStatus(res))
      .catch(() => {});

    hirsApi.getEvaluationConfig()
      .then(res => setEngineConfig(res))
      .catch(() => {});
  }, []);

  const testConnection = async () => {
    setTestingApi(true);
    const start = performance.now();
    try {
      const res = await hirsApi.checkHealth();
      const elapsed = Math.round(performance.now() - start);
      setLatencyMs(elapsed);
      setApiStatus(`Connected successfully: ${res.status} (${elapsed}ms)`);
      
      // Also refresh engine status
      const eng = await hirsApi.getEvaluationStatus();
      setEngineStatus(eng);

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

  const clearRecentEvaluations = () => {
    localStorage.removeItem('hirs-recent-evals');
    setToast({
      id: String(Date.now()),
      type: 'info',
      text: 'Cleared locally stored evaluation history.'
    });
  };

  const clearSavedRecommendations = () => {
    localStorage.removeItem('hirs-saved-recommendations');
    setToast({
      id: String(Date.now()),
      type: 'info',
      text: 'Cleared saved builds.'
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 text-xs">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-[#202632]">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          System Settings & Evaluation Config
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage application appearance, inspect configurable evaluation engine weights, and audit backend telemetry.
        </p>
      </div>

      {/* Theme Setting */}
      <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] space-y-3">
        <div>
          <span className="font-bold text-sm text-slate-900 dark:text-white block">
            Interface Appearance
          </span>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            Toggle between light and dark themes. Preference is stored locally.
          </p>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => setDarkMode(false)}
            className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 cursor-pointer transition-colors ${
              !darkMode
                ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-semibold'
                : 'border-slate-200 dark:border-[#202632] text-slate-700 dark:text-slate-300'
            }`}
          >
            <Sun className="w-4 h-4 text-amber-500" />
            <span>Light Theme</span>
          </button>

          <button
            type="button"
            onClick={() => setDarkMode(true)}
            className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 cursor-pointer transition-colors ${
              darkMode
                ? 'border-blue-500 bg-blue-950/30 text-blue-300 font-semibold'
                : 'border-slate-200 dark:border-[#202632] text-slate-700 dark:text-slate-300'
            }`}
          >
            <Moon className="w-4 h-4 text-blue-400" />
            <span>Dark Theme</span>
          </button>
        </div>
      </div>

      {/* Evaluation Engine Status & Architecture */}
      <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-bold text-sm text-slate-900 dark:text-white block flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-blue-600" />
              <span>Evaluation Engine Status</span>
            </span>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              Real-time operational status of the hybrid deterministic, geometric, and TOPSIS pipeline.
            </p>
          </div>
          {engineStatus && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <CheckCircle2 className="w-3 h-3" />
              <span>{engineStatus.status.toUpperCase()}</span>
            </span>
          )}
        </div>

        {engineStatus && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            {Object.entries(engineStatus.components || {}).map(([key, val]) => (
              <div key={key} className="p-2.5 rounded-lg border border-slate-100 dark:border-[#202632] bg-slate-50/50 dark:bg-white/5">
                <span className="text-[10px] text-slate-400 block font-mono capitalize">{key.replace('_', ' ')}</span>
                <span className={`text-xs font-bold block mt-0.5 ${val === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  {String(val)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Workload Weights Display */}
        {engineConfig && engineConfig.workload_weights && (
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#202632]">
            <span className="font-bold text-slate-900 dark:text-white block text-xs flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-blue-500" />
              <span>Active Workload Weights α(w,j)</span>
            </span>
            <div className="grid sm:grid-cols-3 gap-2">
              {Object.entries(engineConfig.workload_weights).map(([wName, wVals]: [string, any]) => (
                <div key={wName} className="p-2.5 rounded-lg border border-slate-100 dark:border-[#202632] bg-slate-50/50 dark:bg-white/5 space-y-1">
                  <span className="font-bold text-slate-900 dark:text-white block text-[11px]">{wName}</span>
                  <div className="text-[10px] text-slate-500 font-mono space-y-0.5">
                    <div>CPU: {(wVals.cpu * 100).toFixed(0)}%</div>
                    <div>GPU: {(wVals.gpu * 100).toFixed(0)}%</div>
                    <div>RAM: {(wVals.ram * 100).toFixed(0)}%</div>
                    <div>SSD: {(wVals.ssd * 100).toFixed(0)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Backend API Connectivity */}
      <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-bold text-sm text-slate-900 dark:text-white block">
              Backend Health & Latency Test
            </span>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              Probe the local or remote FastAPI microservice.
            </p>
          </div>
          <button
            type="button"
            onClick={testConnection}
            disabled={testingApi}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {testingApi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Terminal className="w-3.5 h-3.5" />}
            <span>Ping Server</span>
          </button>
        </div>

        {apiStatus && (
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-[#202632] text-xs font-mono text-slate-700 dark:text-slate-300">
            {apiStatus}
          </div>
        )}
      </div>

      {/* Default User Preferences */}
      <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] space-y-4">
        <div>
          <span className="font-bold text-sm text-slate-900 dark:text-white block">
            Default Recommendation Preferences
          </span>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            Pre-populate filters when opening the Recommendation generator.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Default Form Factor
            </label>
            <select
              value={defaultDevice}
              onChange={(e) => setDefaultDevice(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="Desktop">Desktop PC</option>
              <option value="Laptop">Laptop System</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Default Budget Target (₹ INR)
            </label>
            <input
              type="number"
              min={30000}
              max={600000}
              step={5000}
              value={defaultBudget}
              onChange={(e) => setDefaultBudget(Number(e.target.value))}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={handleSavePreferences}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Save Defaults
          </button>
        </div>
      </div>

      {/* Local Storage & Cache Management */}
      <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] space-y-3">
        <div>
          <span className="font-bold text-sm text-slate-900 dark:text-white block">
            Client-Side Cache & Saved Builds
          </span>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            Clear locally stored recent hardware evaluations or saved build bookmarks.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="button"
            onClick={clearRecentEvaluations}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-[#202632] hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Clear Evaluation History</span>
          </button>

          <button
            type="button"
            onClick={clearSavedRecommendations}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-[#202632] hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Clear Saved Builds</span>
          </button>
        </div>
      </div>

      {/* Licensing & Attribution */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-[#202632] text-slate-500 dark:text-slate-400 space-y-1">
        <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          <span>About HIRS Intelligence Platform</span>
        </span>
        <p className="leading-relaxed text-[11px]">
          HIRS (Hardware Intelligence & Recommendation System) incorporates deterministic component eligibility verification, PassMark/3DMark normalized benchmark geometric indexing, TOPSIS multi-criteria analysis, and gradient boosted models.
        </p>
      </div>

    </div>
  );
};
