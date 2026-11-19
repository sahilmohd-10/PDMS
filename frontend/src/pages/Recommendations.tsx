import React, { useState } from 'react';
import { 
  Compass, Laptop, Monitor, ArrowRight, Check, 
  Copy, AlertCircle, RefreshCw, Bookmark, BookmarkCheck
} from 'lucide-react';
import { hirsApi } from '../services/api';
import type { HardwareItem, RecommendResponse, SavedBuild } from '../types';
import { Toast, type ToastMessage } from '../components/ui/Toast';

interface RecommendationsProps {
  onAnalyzeConfig: (config: any) => void;
  onAddToCompare: (config: any) => void;
}

export const Recommendations: React.FC<RecommendationsProps> = ({
  onAnalyzeConfig,
  onAddToCompare
}) => {
  // Form State
  const [deviceType, setDeviceType] = useState<'Desktop' | 'Laptop'>('Desktop');
  const [budget, setBudget] = useState<number>(150000);
  const [workloads, setWorkloads] = useState<string[]>(['Programming', 'Gaming']);
  const [minRam, setMinRam] = useState<number>(16);
  const [minSsd, setMinSsd] = useState<number>(512);
  const [gpuPref, setGpuPref] = useState<string>('Dedicated GPU');
  const [cpuPref, setCpuPref] = useState<string>('Any');

  // Loading, Results & Feedback
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RecommendResponse | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    try {
      const saved: SavedBuild[] = JSON.parse(localStorage.getItem('hirs-saved-recommendations') || '[]');
      return new Set(saved.map(s => s.id));
    } catch {
      return new Set();
    }
  });

  const [toast, setToast] = useState<ToastMessage | null>(null);

  const budgetPresets = [
    { label: '₹50,000', value: 50000 },
    { label: '₹80,000', value: 80000 },
    { label: '₹1,20,000', value: 120000 },
    { label: '₹1,60,000', value: 160000 },
    { label: '₹2,20,000', value: 220000 },
    { label: '₹3,00,000', value: 300000 },
  ];

  const availableWorkloads = [
    { id: 'Office / Productivity', desc: 'Documents, web browsing, administrative tools' },
    { id: 'Programming', desc: 'Development environments, local containers, compilation' },
    { id: 'Data Analytics', desc: 'Large tabular datasets, SQL, Python data workflows' },
    { id: 'Machine Learning', desc: 'Scikit-learn, parallel multi-core CPU algorithms' },
    { id: 'AI / Deep Learning', desc: 'CUDA-enabled dedicated GPU with minimum 12 GB VRAM' },
    { id: 'Gaming', desc: 'Dedicated high-bandwidth graphics for modern titles' },
    { id: 'Video Editing', desc: 'High RAM and SSD bandwidth for 4K rendering' },
    { id: 'General Purpose', desc: 'Standard multipurpose household or study use' },
  ];

  const toggleWorkload = (id: string) => {
    if (workloads.includes(id)) {
      if (workloads.length > 1) {
        setWorkloads(workloads.filter(w => w !== id));
      }
    } else {
      setWorkloads([...workloads, id]);
    }
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const res = await hirsApi.recommendHardware({
        budget_inr: budget,
        device_type: deviceType,
        workload: workloads,
        min_ram_gb: minRam,
        min_ssd_gb: minSsd,
        gpu_preference: gpuPref,
        cpu_preference: cpuPref,
        limit: 6
      });
      setResults(res);
    } catch (err: any) {
      setToast({
        id: String(Date.now()),
        type: 'error',
        text: err.message || 'Failed to generate recommendations. Please check server connection.'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyConfigText = (item: HardwareItem) => {
    const text = `${item.name}\nCPU: ${item.cpu} (${item.cores} Cores)\nRAM: ${item.ram_gb} GB ${item.ram_type}\nSSD: ${item.ssd_gb} GB\nGPU: ${item.graphics} (${item.vram_gb} GB VRAM)\nPrice: ₹${item.price.toLocaleString()} INR`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
    setToast({
      id: String(Date.now()),
      type: 'success',
      text: 'Configuration specifications copied to clipboard.'
    });
  };

  const toggleSaveBuild = (item: HardwareItem) => {
    try {
      const existing: SavedBuild[] = JSON.parse(localStorage.getItem('hirs-saved-recommendations') || '[]');
      if (savedIds.has(item.id)) {
        const filtered = existing.filter(b => b.id !== item.id);
        localStorage.setItem('hirs-saved-recommendations', JSON.stringify(filtered));
        setSavedIds(prev => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        setToast({
          id: String(Date.now()),
          type: 'info',
          text: `Removed '${item.name}' from saved recommendations.`
        });
      } else {
        const newBuild: SavedBuild = {
          id: item.id,
          name: item.name,
          cpu: item.cpu,
          graphics: item.graphics,
          ram_gb: item.ram_gb,
          ssd_gb: item.ssd_gb,
          price_inr: item.price,
          device_type: item.device_type,
          tag: item.tag,
          saved_at: new Date().toISOString()
        };
        const updated = [newBuild, ...existing];
        localStorage.setItem('hirs-saved-recommendations', JSON.stringify(updated));
        setSavedIds(prev => new Set(prev).add(item.id));
        setToast({
          id: String(Date.now()),
          type: 'success',
          text: `Saved '${item.name}' to your dashboard!`
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-[#202632]">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Smart Hardware Recommendations
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Specify your budget ceiling and workflow requirements. HIRS discovers and ranks candidate builds.
        </p>
      </div>

      {/* Guided Input Form */}
      <form onSubmit={handleGenerate} className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] space-y-6">
        
        {/* Device Form Factor */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            1. Device Type
          </label>
          <div className="grid sm:grid-cols-2 gap-3 max-w-lg">
            <button
              type="button"
              onClick={() => setDeviceType('Desktop')}
              className={`p-3.5 rounded-lg border text-left flex items-center gap-3 transition-colors cursor-pointer ${
                deviceType === 'Desktop'
                  ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 font-semibold'
                  : 'border-slate-200 dark:border-[#202632] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              <Monitor className="w-5 h-5 text-slate-500 shrink-0" />
              <div>
                <div className="text-xs font-bold">Desktop PC</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">984,000+ candidate catalogue configs</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDeviceType('Laptop')}
              className={`p-3.5 rounded-lg border text-left flex items-center gap-3 transition-colors cursor-pointer ${
                deviceType === 'Laptop'
                  ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 font-semibold'
                  : 'border-slate-200 dark:border-[#202632] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              <Laptop className="w-5 h-5 text-slate-500 shrink-0" />
              <div>
                <div className="text-xs font-bold">Laptop</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">99 records in source dataset</div>
              </div>
            </button>
          </div>
        </div>

        {/* Budget Selection */}
        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-[#202632]">
          <div className="flex justify-between items-baseline">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              2. Maximum Budget (INR)
            </label>
            <span className="text-xs text-slate-500 font-medium">Strict ceiling (never exceeded)</span>
          </div>

          <div className="flex items-center gap-3 max-w-sm">
            <span className="text-xl font-bold text-slate-900 dark:text-white">₹</span>
            <input
              type="number"
              min={25000}
              max={600000}
              step={5000}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full text-base font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-[#202632] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {budgetPresets.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setBudget(preset.value)}
                className={`py-1 px-2.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                  budget === preset.value
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Workload Selection */}
        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-[#202632]">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            3. Intended Usage (Select all that apply)
          </label>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {availableWorkloads.map((w) => {
              const active = workloads.includes(w.id);
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => toggleWorkload(w.id)}
                  className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    active
                      ? 'border-blue-600 bg-blue-50/30 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200'
                      : 'border-slate-200 dark:border-[#202632] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>{w.id}</span>
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center ${active ? 'bg-blue-600 text-white' : 'border border-slate-300 dark:border-slate-600'}`}>
                      {active && <Check className="w-2.5 h-2.5" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                    {w.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hardware Minimums & Preferences */}
        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-[#202632]">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            4. Component Preferences (Optional)
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Minimum RAM</label>
              <select
                value={minRam}
                onChange={(e) => setMinRam(Number(e.target.value))}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
              >
                <option value={8}>8 GB</option>
                <option value={16}>16 GB</option>
                <option value={32}>32 GB</option>
                <option value={64}>64 GB</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Minimum SSD</label>
              <select
                value={minSsd}
                onChange={(e) => setMinSsd(Number(e.target.value))}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
              >
                <option value={256}>256 GB</option>
                <option value={512}>512 GB</option>
                <option value={1000}>1,000 GB (1 TB)</option>
                <option value={2000}>2,000 GB (2 TB)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Graphics Preference</label>
              <select
                value={gpuPref}
                onChange={(e) => setGpuPref(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="Any">Any GPU</option>
                <option value="Dedicated GPU">Dedicated GPU Required</option>
                <option value="NVIDIA">NVIDIA Preferred</option>
                <option value="AMD">AMD Preferred</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">CPU Preference</label>
              <select
                value={cpuPref}
                onChange={(e) => setCpuPref(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="Any">Any Processor</option>
                <option value="AMD">AMD Ryzen</option>
                <option value="Intel">Intel Core</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg font-semibold text-xs text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Evaluating Candidates...</span>
              </>
            ) : (
              <>
                <span>Generate Recommendations</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Results Section */}
      {results && (
        <section className="space-y-4">
          
          {/* Summary Banner */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white">
                Ceiling: ₹{results.budget_inr.toLocaleString()} INR
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600 dark:text-slate-300">{results.device_type}</span>
              <span className="text-slate-400">•</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {results.total_candidates_matched.toLocaleString()} matching candidate builds
              </span>
            </div>

            <span className="text-[11px] text-slate-500 font-mono">
              0.0% budget violation guarantee
            </span>
          </div>

          {/* Fallback Notice if triggered */}
          {results.notice && (
            <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>{results.notice}</span>
            </div>
          )}

          {/* Empty Candidates State */}
          {results.recommendations.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632]">
              <Compass className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">No Candidate Builds Matched</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                No configurations in the catalogue met all your specific constraints within ₹{results.budget_inr.toLocaleString()}. Try increasing the budget or relaxing RAM/SSD preferences.
              </p>
            </div>
          ) : (
            /* Cards Grid */
            <div className="grid md:grid-cols-2 gap-4">
              {results.recommendations.map((item) => {
                const remainingBudget = results.budget_inr - item.price;
                const isBestOverall = item.tag === 'Best Overall';
                const isBestValue = item.tag === 'Best Value';
                const isBestPerf = item.tag === 'Best Performance';

                let badgeStyle = 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300';
                if (isBestOverall) badgeStyle = 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700/60';
                else if (isBestValue) badgeStyle = 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60';
                else if (isBestPerf) badgeStyle = 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700/60';

                const isSaved = savedIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Badge and Rank */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-400">
                            #{item.rank}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${badgeStyle}`}>
                            {item.tag}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                          {(item.buy_probability * 100).toFixed(1)}% BUY Prob
                        </span>
                      </div>

                      {/* Build Title */}
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {item.name}
                      </h3>

                      {/* Price and Remaining */}
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-xl font-bold text-slate-900 dark:text-white">
                          ₹{item.price.toLocaleString()}
                        </span>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          ₹{remainingBudget.toLocaleString()} under budget
                        </span>
                      </div>

                      {/* Specifications Table */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-[#202632] grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">CPU</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate block" title={item.cpu}>
                            {item.cpu}
                          </span>
                          <span className="text-[11px] text-slate-500">{item.cores} Cores</span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Graphics</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate block" title={item.graphics}>
                            {item.graphics}
                          </span>
                          <span className="text-[11px] text-slate-500">{item.vram_gb} GB VRAM</span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">RAM</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {item.ram_gb} GB {item.ram_type}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Storage</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {item.ssd_gb} GB SSD
                          </span>
                        </div>
                      </div>

                      {/* Explanation */}
                      <p className="mt-3.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-white/5 p-3 rounded-lg leading-relaxed">
                        {item.recommendation_reason}
                      </p>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-[#202632] flex items-center justify-between text-xs">
                      <button
                        onClick={() => onAnalyzeConfig({
                          cpu: item.cpu,
                          ram_gb: item.ram_gb,
                          ssd_gb: item.ssd_gb,
                          graphics: item.graphics,
                          price_inr: item.price,
                          device_type: item.device_type
                        })}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Inspect in Analyzer
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleSaveBuild(item)}
                          className={`p-1.5 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                            isSaved 
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' 
                              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                          }`}
                          title={isSaved ? "Saved to Dashboard" : "Save build"}
                        >
                          {isSaved ? <BookmarkCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> : <Bookmark className="w-3.5 h-3.5" />}
                          <span className="text-[11px] font-medium hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
                        </button>

                        <button
                          onClick={() => onAddToCompare({
                            cpu: item.cpu,
                            ram_gb: item.ram_gb,
                            ssd_gb: item.ssd_gb,
                            graphics: item.graphics,
                            price_inr: item.price,
                            device_type: item.device_type
                          })}
                          className="px-2.5 py-1 rounded text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          Compare
                        </button>

                        <button
                          onClick={() => copyConfigText(item)}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                          title="Copy specifications"
                        >
                          {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

    </div>
  );
};
