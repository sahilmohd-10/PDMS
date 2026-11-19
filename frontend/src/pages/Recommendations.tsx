import React, { useState } from 'react';
import { 
  Compass, Laptop, Monitor, ArrowRight, Check, 
  Copy, RefreshCw, Bookmark, BookmarkCheck,
  Zap, Award, TrendingUp, Sliders, ChevronDown, ChevronUp
} from 'lucide-react';
import { hirsApi } from '../services/api';
import type { 
  RecommendationCandidate, 
  EvaluationRecommendResponse, 
  WorkloadType,
  SavedBuild 
} from '../types';
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
  const [workload, setWorkload] = useState<WorkloadType>('Gaming');
  const [minRam, setMinRam] = useState<number>(16);
  const [minSsd, setMinSsd] = useState<number>(512);
  const [minVram, setMinVram] = useState<number>(6);

  // Loading, Results & Feedback
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<EvaluationRecommendResponse | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showTopsisDetails, setShowTopsisDetails] = useState(false);
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
    { label: '₹60,000', value: 60000 },
    { label: '₹90,000', value: 90000 },
    { label: '₹1,30,000', value: 130000 },
    { label: '₹1,80,000', value: 180000 },
    { label: '₹2,50,000', value: 250000 },
    { label: '₹3,50,000', value: 350000 },
  ];

  const workloadsList: { type: WorkloadType; label: string; desc: string }[] = [
    { type: 'Gaming', label: 'Gaming', desc: 'Heavy GPU focus with fast storage and high VRAM' },
    { type: 'Programming', label: 'Programming & Dev', desc: 'Multi-threaded CPU compilation and container RAM' },
    { type: 'Data Analytics', label: 'Data Analytics', desc: 'High RAM memory capacity and parallel CPU processing' },
    { type: 'Deep Learning', label: 'AI / Deep Learning', desc: 'CUDA compute with dedicated high-bandwidth VRAM' },
    { type: 'Video Editing', label: 'Video Editing', desc: 'Balanced high RAM bandwidth and GPU render pipelines' },
    { type: 'Office', label: 'Office & Productivity', desc: 'Balanced, cost-effective administrative workflow' },
  ];

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const res = await hirsApi.evaluateRecommend({
        budget_inr: budget,
        device_type: deviceType,
        workload: workload,
        min_ram_gb: minRam,
        min_ssd_gb: minSsd,
        min_vram_gb: minVram,
        limit: 8
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

  const copyConfigText = (item: RecommendationCandidate) => {
    const text = `${item.name}\nCPU: ${item.cpu} (${item.cores} Cores)\nRAM: ${item.ram_gb} GB ${item.ram_type}\nSSD: ${item.ssd_gb} GB\nGPU: ${item.graphics} (${item.vram_gb} GB VRAM)\nPrice: ₹${item.price_inr.toLocaleString()} INR\nTOPSIS Closeness: ${item.topsis_score.toFixed(3)}`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
    setToast({
      id: String(Date.now()),
      type: 'info',
      text: 'Hardware configuration copied to clipboard.'
    });
  };

  const toggleSaveBuild = (item: RecommendationCandidate) => {
    try {
      const existing: SavedBuild[] = JSON.parse(localStorage.getItem('hirs-saved-recommendations') || '[]');
      let updated: SavedBuild[];
      const isSaved = savedIds.has(item.id);

      if (isSaved) {
        updated = existing.filter(s => s.id !== item.id);
        savedIds.delete(item.id);
        setToast({ id: String(Date.now()), type: 'info', text: 'Build removed from saved list.' });
      } else {
        const newBuild: SavedBuild = {
          id: item.id,
          name: item.name,
          cpu: item.cpu,
          graphics: item.graphics,
          ram_gb: item.ram_gb,
          ssd_gb: item.ssd_gb,
          price_inr: item.price_inr,
          device_type: item.device_type,
          tag: item.category_tag,
          saved_at: new Date().toLocaleDateString()
        };
        updated = [newBuild, ...existing];
        savedIds.add(item.id);
        setToast({ id: String(Date.now()), type: 'success', text: 'Build saved to your personal list.' });
      }

      setSavedIds(new Set(savedIds));
      localStorage.setItem('hirs-saved-recommendations', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-[#202632]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              TOPSIS Hardware Recommendations
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Multi-Criteria Decision Analysis (TOPSIS) ranking candidates across performance, value index, price, and memory capacity.
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
            <Sliders className="w-3.5 h-3.5" />
            <span>Strict Budget Pre-Filtering</span>
          </span>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleGenerate} className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] space-y-5 text-xs">
        
        {/* Device Type Toggle */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Target Form Factor:
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDeviceType('Desktop')}
              className={`flex-1 p-3 rounded-lg border text-left flex items-center gap-3 transition-colors cursor-pointer ${
                deviceType === 'Desktop'
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-100 font-semibold'
                  : 'border-slate-200 dark:border-[#202632] hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Monitor className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="block text-xs">Desktop PC Configuration</span>
                <span className="text-[10px] text-slate-400 block font-normal">Higher sustained TDP & expandability</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDeviceType('Laptop')}
              className={`flex-1 p-3 rounded-lg border text-left flex items-center gap-3 transition-colors cursor-pointer ${
                deviceType === 'Laptop'
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-100 font-semibold'
                  : 'border-slate-200 dark:border-[#202632] hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Laptop className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="block text-xs">Laptop System</span>
                <span className="text-[10px] text-slate-400 block font-normal">Integrated display & mobile thermal constraints</span>
              </div>
            </button>
          </div>
        </div>

        {/* Budget Input & Presets */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              Maximum Budget (₹ INR):
            </label>
            <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
              ₹{budget.toLocaleString('en-IN')}
            </span>
          </div>
          
          <input
            type="number"
            min={30000}
            max={800000}
            step={5000}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
            required
          />

          <div className="flex flex-wrap gap-1.5 pt-1">
            {budgetPresets.map((bp, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setBudget(bp.value)}
                className={`text-[11px] px-2.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                  budget === bp.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {bp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Workload Profile Selector */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Target Workload Benchmark Profile:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {workloadsList.map((w) => (
              <button
                key={w.type}
                type="button"
                onClick={() => setWorkload(w.type)}
                className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                  workload === w.type
                    ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 text-blue-900 dark:text-blue-100 font-semibold'
                    : 'border-slate-200 dark:border-[#202632] hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className="block text-xs">{w.label}</span>
                <span className="text-[10px] text-slate-400 block font-normal leading-tight mt-0.5">{w.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Hardware Minimum Constraints */}
        <div className="grid sm:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Minimum RAM (GB)
            </label>
            <select
              value={minRam}
              onChange={(e) => setMinRam(Number(e.target.value))}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value={8}>8 GB</option>
              <option value={16}>16 GB (Recommended)</option>
              <option value={32}>32 GB (Heavy Workloads)</option>
              <option value={64}>64 GB (Workstation)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Minimum SSD (GB)
            </label>
            <select
              value={minSsd}
              onChange={(e) => setMinSsd(Number(e.target.value))}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value={256}>256 GB</option>
              <option value={512}>512 GB</option>
              <option value={1000}>1,000 GB (1 TB)</option>
              <option value={2000}>2,000 GB (2 TB)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Minimum VRAM (GB)
            </label>
            <select
              value={minVram}
              onChange={(e) => setMinVram(Number(e.target.value))}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value={0}>Any / Integrated</option>
              <option value={6}>6 GB (1080p Entry)</option>
              <option value={8}>8 GB (1080p Ultra / 1440p)</option>
              <option value={12}>12 GB (AI & 1440p High)</option>
              <option value={16}>16 GB (Heavy Compute)</option>
            </select>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg font-semibold text-xs text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Running TOPSIS Multi-Criteria Ranking...</span>
              </>
            ) : (
              <span>Discover Ranked Configurations</span>
            )}
          </button>
        </div>
      </form>

      {/* Results Section */}
      {results && (
        <div className="space-y-6">

          {/* Top 3 Categorized Winner Cards */}
          <div className="grid sm:grid-cols-3 gap-4">
            
            {/* Best Balanced Choice (TOPSIS Winner) */}
            {results.best_balanced && (
              <div className="p-4 rounded-xl bg-gradient-to-b from-blue-50/80 to-white dark:from-blue-950/20 dark:to-[#11141A] border-2 border-blue-500/80 dark:border-blue-500/60 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-blue-600 text-white">
                    <Award className="w-3 h-3" />
                    Best Balanced Choice
                  </span>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm" title={results.best_balanced.name}>
                    {results.best_balanced.name}
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    {results.best_balanced.recommendation_reason}
                  </p>
                </div>
                <div className="pt-2 border-t border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
                  <span className="text-base font-mono font-bold text-blue-600 dark:text-blue-400">
                    ₹{results.best_balanced.price_inr.toLocaleString()}
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-slate-500">
                    TOPSIS: {results.best_balanced.topsis_score.toFixed(3)}
                  </span>
                </div>
              </div>
            )}

            {/* Best Performance */}
            {results.best_performance && (
              <div className="p-4 rounded-xl bg-gradient-to-b from-purple-50/80 to-white dark:from-purple-950/20 dark:to-[#11141A] border border-purple-300 dark:border-purple-800/60 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-purple-600 text-white">
                    <Zap className="w-3 h-3" />
                    Best Performance
                  </span>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm" title={results.best_performance.name}>
                    {results.best_performance.name}
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    {results.best_performance.recommendation_reason}
                  </p>
                </div>
                <div className="pt-2 border-t border-purple-100 dark:border-purple-900/30 flex items-center justify-between">
                  <span className="text-base font-mono font-bold text-purple-600 dark:text-purple-400">
                    ₹{results.best_performance.price_inr.toLocaleString()}
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-slate-500">
                    P(i,w): {results.best_performance.performance_score.toFixed(1)}
                  </span>
                </div>
              </div>
            )}

            {/* Best Value */}
            {results.best_value && (
              <div className="p-4 rounded-xl bg-gradient-to-b from-emerald-50/80 to-white dark:from-emerald-950/20 dark:to-[#11141A] border border-emerald-300 dark:border-emerald-800/60 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-600 text-white">
                    <TrendingUp className="w-3 h-3" />
                    Best Value
                  </span>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm" title={results.best_value.name}>
                    {results.best_value.name}
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    {results.best_value.recommendation_reason}
                  </p>
                </div>
                <div className="pt-2 border-t border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
                  <span className="text-base font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{results.best_value.price_inr.toLocaleString()}
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-slate-500">
                    VI: {results.best_value.relative_value_index.toFixed(1)}
                  </span>
                </div>
              </div>
            )}

          </div>

          {/* All Ranked Recommendations Table / Cards */}
          <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                All Ranked Eligible Candidates ({results.ranked_candidates.length} Configurations within ₹{results.budget_inr.toLocaleString()} Budget)
              </span>
              <button
                type="button"
                onClick={() => setShowTopsisDetails(!showTopsisDetails)}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{showTopsisDetails ? 'Hide TOPSIS Details' : 'View TOPSIS Criteria & Weights'}</span>
                {showTopsisDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Collapsible TOPSIS Methodology */}
            {showTopsisDetails && (
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-[#202632] text-xs font-mono space-y-2">
                <span className="font-bold text-slate-900 dark:text-white block">TOPSIS Vector Normalization Methodology:</span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {results.methodology_note}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-200 dark:border-white/10 text-[10px]">
                  {Object.entries(results.topsis_weights_used).map(([key, weight]) => (
                    <div key={key} className="p-1.5 rounded bg-white dark:bg-black/40">
                      <span className="text-slate-400 block">{key}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{(weight * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Candidate List */}
            <div className="space-y-3">
              {results.ranked_candidates.map((c, idx) => (
                <div key={c.id} className="p-4 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50/40 dark:bg-white/5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                  
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        #{idx + 1} {c.name}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                        {c.category_tag}
                      </span>
                    </div>
                    
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {c.cpu} ({c.cores} Cores) • {c.graphics} ({c.vram_gb} GB VRAM) • {c.ram_gb} GB {c.ram_type} • {c.ssd_gb} GB SSD
                    </p>
                    
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 italic">
                      {c.recommendation_reason}
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 gap-2">
                    <div className="text-left sm:text-right">
                      <span className="text-base font-mono font-bold text-slate-900 dark:text-white block">
                        ₹{c.price_inr.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                        TOPSIS: {c.topsis_score.toFixed(3)} | VI: {c.relative_value_index.toFixed(1)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleSaveBuild(c)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-[#202632] hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        title="Save configuration"
                      >
                        {savedIds.has(c.id) ? (
                          <BookmarkCheck className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <Bookmark className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => copyConfigText(c)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-[#202632] hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        title="Copy configuration text"
                      >
                        {copiedId === c.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onAddToCompare({
                          cpu: c.cpu,
                          ram_gb: c.ram_gb,
                          ssd_gb: c.ssd_gb,
                          graphics: c.graphics,
                          price_inr: c.price_inr,
                          device_type: c.device_type
                        })}
                        className="px-2.5 py-1.5 rounded-lg text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 font-semibold text-[11px] transition-colors cursor-pointer"
                      >
                        Compare
                      </button>

                      <button
                        type="button"
                        onClick={() => onAnalyzeConfig({
                          cpu: c.cpu,
                          ram_gb: c.ram_gb,
                          ssd_gb: c.ssd_gb,
                          graphics: c.graphics,
                          price_inr: c.price_inr,
                          device_type: c.device_type
                        })}
                        className="px-2.5 py-1.5 rounded-lg text-white bg-blue-600 hover:bg-blue-700 font-semibold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span>Evaluate</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                  </div>

                </div>
              ))}
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
