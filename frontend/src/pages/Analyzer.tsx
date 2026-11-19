import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, XCircle, AlertTriangle, 
  RefreshCw, GitCompare, Compass
} from 'lucide-react';
import { hirsApi } from '../services/api';
import type { PredictResponse, HardwareItem } from '../types';
import { Toast, type ToastMessage } from '../components/ui/Toast';

interface AnalyzerProps {
  initialConfig?: any;
  onAddToCompare?: (config: any) => void;
  onNavigateToRecommendations?: (budget: number) => void;
}

export const Analyzer: React.FC<AnalyzerProps> = ({ 
  initialConfig, 
  onAddToCompare,
  onNavigateToRecommendations 
}) => {
  const [cpu, setCpu] = useState(initialConfig?.cpu || 'AMD Ryzen 7 7800X3D');
  const [ram, setRam] = useState<number>(initialConfig?.ram_gb || 32);
  const [ssd, setSsd] = useState<number>(initialConfig?.ssd_gb || 1000);
  const [graphics, setGraphics] = useState(initialConfig?.graphics || 'NVIDIA GeForce RTX 4070');
  const [price, setPrice] = useState<number>(initialConfig?.price_inr || 145000);
  const [deviceType, setDeviceType] = useState(initialConfig?.device_type || 'Desktop');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [alternatives, setAlternatives] = useState<HardwareItem[]>([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);
  const [options, setOptions] = useState<{ cpus: string[], gpus: string[] }>({ cpus: [], gpus: [] });
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Synchronize if initialConfig changes
  useEffect(() => {
    if (initialConfig) {
      if (initialConfig.cpu) setCpu(initialConfig.cpu);
      if (initialConfig.ram_gb) setRam(initialConfig.ram_gb);
      if (initialConfig.ssd_gb) setSsd(initialConfig.ssd_gb);
      if (initialConfig.graphics) setGraphics(initialConfig.graphics);
      if (initialConfig.price_inr) setPrice(initialConfig.price_inr);
      if (initialConfig.device_type) setDeviceType(initialConfig.device_type);
    }
  }, [initialConfig]);

  useEffect(() => {
    hirsApi.getHardwareOptions()
      .then(res => setOptions({ cpus: res.cpus, gpus: res.gpus }))
      .catch(err => console.error(err));
  }, []);

  const presets = [
    { label: 'Gaming Build (Mid-High)', cpu: 'AMD Ryzen 7 7800X3D', ram: 32, ssd: 1000, graphics: 'NVIDIA GeForce RTX 4070', price: 145000 },
    { label: 'Budget Entry PC', cpu: 'Intel Core i5-13400F', ram: 16, ssd: 512, graphics: 'NVIDIA GeForce RTX 3060', price: 68000 },
    { label: 'Low Core Legacy Rig', cpu: 'Intel Core 2 Quad Q9300', ram: 64, ssd: 2000, graphics: 'Zotac ZT-70601-10M', price: 195000 },
    { label: 'Workstation Compute', cpu: 'AMD Ryzen 9 7950X', ram: 64, ssd: 2000, graphics: 'NVIDIA GeForce RTX 4080', price: 280000 },
  ];

  const applyPreset = (p: typeof presets[0]) => {
    setCpu(p.cpu);
    setRam(p.ram);
    setSsd(p.ssd);
    setGraphics(p.graphics);
    setPrice(p.price);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cpu.trim() || !graphics.trim()) {
      setToast({
        id: String(Date.now()),
        type: 'error',
        text: 'Please enter both CPU and GPU component names.'
      });
      return;
    }

    if (price <= 0) {
      setToast({
        id: String(Date.now()),
        type: 'error',
        text: 'Price must be greater than zero.'
      });
      return;
    }

    setLoading(true);
    setAlternatives([]);

    try {
      const res = await hirsApi.predictHardware({
        cpu: cpu.trim(),
        ram_gb: ram,
        ssd_gb: ssd,
        graphics: graphics.trim(),
        price_inr: price,
        device_type: deviceType
      });
      setResult(res);

      // Save to recent evaluations in local storage
      const existing = JSON.parse(localStorage.getItem('hirs-recent-evals') || '[]');
      const newEntry = {
        cpu,
        graphics,
        ram_gb: ram,
        ssd_gb: ssd,
        price_inr: price,
        prediction: res.prediction,
        buy_probability: res.buy_probability,
        date: new Date().toLocaleTimeString()
      };
      localStorage.setItem('hirs-recent-evals', JSON.stringify([newEntry, ...existing.slice(0, 9)]));

      // If prediction is NOT BUY, auto-fetch high-value alternative configurations within the same budget ceiling
      if (res.prediction === 'NOT BUY') {
        fetchAlternatives(price);
      }
    } catch (err: any) {
      setToast({
        id: String(Date.now()),
        type: 'error',
        text: err.message || 'Analysis failed. Please verify API service connectivity.'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAlternatives = async (targetBudget: number) => {
    setLoadingAlternatives(true);
    try {
      const recRes = await hirsApi.recommendHardware({
        budget_inr: targetBudget,
        device_type: deviceType,
        workload: ['General Purpose'],
        limit: 2
      });
      if (recRes && recRes.recommendations) {
        setAlternatives(recRes.recommendations.slice(0, 2));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAlternatives(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      
      {/* Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-[#202632]">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Is this hardware worth buying?
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Evaluate any hardware configuration against our trained machine learning model to verify value and detect bottlenecks.
        </p>
      </div>

      {/* Preset Pills */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          Sample Configurations:
        </span>
        <div className="flex flex-wrap gap-2">
          {presets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyPreset(p)}
              className="text-xs px-2.5 py-1 rounded-md font-medium bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleAnalyze} className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] space-y-4 text-xs">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Processor (CPU)
            </label>
            <input
              type="text"
              list="cpu-datalist"
              value={cpu}
              onChange={(e) => setCpu(e.target.value)}
              placeholder="e.g. AMD Ryzen 7 7800X3D"
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
            <datalist id="cpu-datalist">
              {options.cpus.slice(0, 50).map((c, i) => <option key={i} value={c} />)}
            </datalist>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Graphics (GPU)
            </label>
            <input
              type="text"
              list="gpu-datalist"
              value={graphics}
              onChange={(e) => setGraphics(e.target.value)}
              placeholder="e.g. NVIDIA GeForce RTX 4070"
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
            <datalist id="gpu-datalist">
              {options.gpus.slice(0, 50).map((g, i) => <option key={i} value={g} />)}
            </datalist>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              RAM Capacity (GB)
            </label>
            <input
              type="number"
              min={4}
              max={512}
              value={ram}
              onChange={(e) => setRam(Number(e.target.value))}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Storage SSD (GB)
            </label>
            <input
              type="number"
              min={128}
              max={8000}
              step={128}
              value={ssd}
              onChange={(e) => setSsd(Number(e.target.value))}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Retail Price (₹ INR)
            </label>
            <input
              type="number"
              min={10000}
              max={1000000}
              step={1000}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Form Factor
            </label>
            <select
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="Desktop">Desktop PC</option>
              <option value="Laptop">Laptop</option>
            </select>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg font-semibold text-xs text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Evaluating Configuration...</span>
              </>
            ) : (
              <span>Analyze Configuration</span>
            )}
          </button>
        </div>
      </form>

      {/* Results View */}
      {result && (
        <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] space-y-6">
          
          {/* Out of Distribution Warning Banner */}
          {result.is_out_of_distribution && (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">Out-of-Distribution Hardware Detected</span>
                <p className="leading-relaxed">
                  One or more hardware components (or pricing ratio) falls outside the primary parameter distributions of our training dataset. The model's prediction is extrapolated based on parsed feature heuristics.
                </p>
              </div>
            </div>
          )}

          {/* Top Banner Decision */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100 dark:border-[#202632]">
            <div className="flex items-center gap-3">
              {result.prediction === 'BUY' ? (
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <XCircle className="w-6 h-6" />
                </div>
              )}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Model Decision
                </div>
                <div className={`text-2xl font-black ${
                  result.prediction === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {result.prediction}
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs">
              <span className="text-slate-500 block text-[11px]">Model Probability</span>
              <span className="font-mono font-bold text-xl text-slate-900 dark:text-white">
                {(result.buy_probability * 100).toFixed(1)}%
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Confidence: <strong className="text-slate-800 dark:text-slate-200">{result.confidence_level}</strong>
              </span>
            </div>
          </div>

          {/* Scores Overview */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-[#202632]">
              <span className="text-[11px] font-medium text-slate-500 block">Hardware Compute Score</span>
              <span className="text-lg font-bold font-mono text-slate-900 dark:text-white block mt-0.5">
                {result.hardware_score?.toFixed(1) || '0.0'} / 100
              </span>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-[#202632]">
              <span className="text-[11px] font-medium text-slate-500 block">Value-to-Price Index</span>
              <span className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400 block mt-0.5">
                {result.value_score?.toFixed(2) || '0.00'}
              </span>
            </div>
          </div>

          {/* Explanation */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-900 dark:text-white block">
              Explanation:
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-white/5 p-3.5 rounded-lg">
              {result.explanation}
            </p>
          </div>

          {/* Key Influencing Factors */}
          {result.feature_contributions.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Influential Features:
              </span>
              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                {result.feature_contributions.map((fc, i) => (
                  <div key={i} className="p-3 rounded-lg border border-slate-200/80 dark:border-[#202632] bg-slate-50/50 dark:bg-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-900 dark:text-white">{fc.feature}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        fc.impact === 'Positive'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}>
                        {fc.impact}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      {fc.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alternative Recommendation (Shown when NOT BUY) */}
          {result.prediction === 'NOT BUY' && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#202632]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-blue-600" />
                  <span>Better Alternatives Within ₹{price.toLocaleString()} Budget:</span>
                </span>
                {onNavigateToRecommendations && (
                  <button
                    onClick={() => onNavigateToRecommendations(price)}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    View All Matches →
                  </button>
                )}
              </div>

              {loadingAlternatives ? (
                <div className="p-3 text-xs text-slate-400 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Searching candidate builds for higher compute/value score...</span>
                </div>
              ) : alternatives.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {alternatives.map((alt) => (
                    <div key={alt.id} className="p-3 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50/50 dark:bg-white/5 text-xs flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-baseline">
                          <span className="font-bold text-slate-900 dark:text-white truncate block max-w-[200px]" title={alt.name}>
                            {alt.name}
                          </span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{alt.price.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          {alt.cpu} ({alt.cores} Cores) • {alt.graphics} ({alt.vram_gb} GB VRAM) • {alt.ram_gb} GB RAM
                        </div>
                      </div>

                      <div className="pt-2 mt-2 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between">
                        <span className="text-[10px] text-emerald-600 font-mono">
                          {(alt.buy_probability * 100).toFixed(0)}% BUY Prob
                        </span>
                        {onAddToCompare && (
                          <button
                            onClick={() => onAddToCompare({
                              cpu: alt.cpu,
                              ram_gb: alt.ram_gb,
                              ssd_gb: alt.ssd_gb,
                              graphics: alt.graphics,
                              price_inr: alt.price,
                              device_type: alt.device_type
                            })}
                            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            Compare with this build
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-xs text-slate-400">
                  No direct pre-configured alternatives indexed under ₹{price.toLocaleString()}.
                </div>
              )}
            </div>
          )}

          {/* Action Row */}
          <div className="pt-3 border-t border-slate-100 dark:border-[#202632] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="max-w-xl">
              Notice: The underlying dataset labels were derived from deterministic hardware rules. This prediction indicates alignment with training data cutoffs and should not replace professional retail procurement advice.
            </span>

            {onAddToCompare && (
              <button
                onClick={() => {
                  onAddToCompare({
                    cpu,
                    ram_gb: ram,
                    ssd_gb: ssd,
                    graphics,
                    price_inr: price,
                    device_type: deviceType
                  });
                  setToast({
                    id: String(Date.now()),
                    type: 'success',
                    text: 'Configuration sent to comparison matrix.'
                  });
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>Send to Compare</span>
              </button>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
