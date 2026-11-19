import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, XCircle, HelpCircle, 
  RefreshCw, GitCompare, Compass, 
  ChevronDown, ChevronUp, ShieldCheck, 
  Cpu, HardDrive, Zap, Tag
} from 'lucide-react';
import { hirsApi } from '../services/api';
import type { 
  EvaluationResponse, 
  RecommendationCandidate, 
  WorkloadType 
} from '../types';
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
  const [workload, setWorkload] = useState<WorkloadType>('Gaming');
  const [userBudget, setUserBudget] = useState<number | undefined>(undefined);
  const [ramGeneration, setRamGeneration] = useState('DDR5');
  const [ssdInterface, setSsdInterface] = useState('NVMe Gen4');

  const [loading, setLoading] = useState(false);
  const [evalResult, setEvalResult] = useState<EvaluationResponse | null>(null);
  const [showDetailedMath, setShowDetailedMath] = useState(false);
  const [alternatives, setAlternatives] = useState<RecommendationCandidate[]>([]);
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
    { label: 'Gaming Build (Mid-High)', cpu: 'AMD Ryzen 7 7800X3D', ram: 32, ssd: 1000, graphics: 'NVIDIA GeForce RTX 4070', price: 145000, workload: 'Gaming' as WorkloadType, ramGen: 'DDR5' },
    { label: 'Deep Learning Rig', cpu: 'AMD Ryzen 9 9950X', ram: 64, ssd: 2000, graphics: 'NVIDIA GeForce RTX 4090', price: 340000, workload: 'Deep Learning' as WorkloadType, ramGen: 'DDR5' },
    { label: 'Programming Devbox', cpu: 'Intel Core i7-13700K', ram: 32, ssd: 1000, graphics: 'NVIDIA GeForce RTX 4060', price: 118000, workload: 'Programming' as WorkloadType, ramGen: 'DDR5' },
    { label: 'Budget Office PC', cpu: 'Intel Core i5-12400', ram: 16, ssd: 512, graphics: 'Integrated Graphics', price: 42000, workload: 'Office' as WorkloadType, ramGen: 'DDR4' },
  ];

  const applyPreset = (p: typeof presets[0]) => {
    setCpu(p.cpu);
    setRam(p.ram);
    setSsd(p.ssd);
    setGraphics(p.graphics);
    setPrice(p.price);
    setWorkload(p.workload);
    setRamGeneration(p.ramGen);
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
      const res = await hirsApi.evaluateHardware({
        cpu: cpu.trim(),
        ram_gb: ram,
        ssd_gb: ssd,
        graphics: graphics.trim(),
        price_inr: price,
        device_type: deviceType,
        workload: workload,
        user_budget_inr: userBudget,
        ram_generation: ramGeneration,
        ssd_interface: ssdInterface
      });
      setEvalResult(res);

      // Save to recent evaluations in local storage
      const existing = JSON.parse(localStorage.getItem('hirs-recent-evals') || '[]');
      const newEntry = {
        cpu,
        graphics,
        ram_gb: ram,
        ssd_gb: ssd,
        price_inr: price,
        decision: res.decision,
        performance_score: res.performance_score,
        value_index: res.relative_value_index,
        date: new Date().toLocaleTimeString()
      };
      localStorage.setItem('hirs-recent-evals', JSON.stringify([newEntry, ...existing.slice(0, 9)]));

      // If prediction is NOT BUY or INSUFFICIENT_DATA, auto-fetch high-value alternatives
      if (res.decision !== 'BUY') {
        fetchAlternatives(userBudget || price);
      }
    } catch (err: any) {
      setToast({
        id: String(Date.now()),
        type: 'error',
        text: err.message || 'Evaluation failed. Please verify API service connectivity.'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAlternatives = async (targetBudget: number) => {
    setLoadingAlternatives(true);
    try {
      const recRes = await hirsApi.evaluateRecommend({
        budget_inr: targetBudget,
        device_type: deviceType,
        workload: workload,
        limit: 2
      });
      if (recRes && recRes.ranked_candidates) {
        setAlternatives(recRes.ranked_candidates.slice(0, 2));
      }
    } catch (err) {
      console.error('Alternatives query error:', err);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Hardware Purchasing Evaluator
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Scientific hybrid evaluation combining normalized benchmark ratios, deterministic eligibility rules, peer-relative value, and fair-price bounds.
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Hybrid Decision Engine</span>
          </span>
        </div>
      </div>

      {/* Preset Pills */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          Sample Evaluation Profiles:
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
              Target Workload
            </label>
            <select
              value={workload}
              onChange={(e) => setWorkload(e.target.value as WorkloadType)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="Gaming">Gaming (Heavy GPU)</option>
              <option value="Programming">Programming & Compilation (Heavy CPU)</option>
              <option value="Data Analytics">Data Analytics (High RAM & Multi-core)</option>
              <option value="Deep Learning">Deep Learning & AI (Dedicated VRAM + GPU)</option>
              <option value="Video Editing">Video Editing (High Bandwidth RAM & GPU)</option>
              <option value="Office">Office & Productivity (Balanced)</option>
            </select>
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

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              RAM Capacity & Generation
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={4}
                max={512}
                value={ram}
                onChange={(e) => setRam(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                placeholder="GB RAM"
                required
              />
              <select
                value={ramGeneration}
                onChange={(e) => setRamGeneration(e.target.value)}
                className="w-full text-xs px-2 py-2 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="DDR5">DDR5</option>
                <option value="DDR4">DDR4</option>
                <option value="DDR3">DDR3</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Storage SSD & Interface
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={128}
                max={16000}
                step={128}
                value={ssd}
                onChange={(e) => setSsd(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                placeholder="GB SSD"
                required
              />
              <select
                value={ssdInterface}
                onChange={(e) => setSsdInterface(e.target.value)}
                className="w-full text-xs px-2 py-2 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="NVMe Gen4">NVMe Gen4</option>
                <option value="NVMe Gen3">NVMe Gen3</option>
                <option value="NVMe Gen5">NVMe Gen5</option>
                <option value="SATA">SATA III</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Listing Retail Price (₹ INR)
            </label>
            <input
              type="number"
              min={10000}
              max={1500000}
              step={1000}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Optional Budget Ceiling (₹ INR)
            </label>
            <input
              type="number"
              min={10000}
              max={2000000}
              step={5000}
              value={userBudget || ''}
              onChange={(e) => setUserBudget(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="e.g. 160000 (Leave blank if open)"
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
            />
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
                <span>Running Evaluation Pipeline...</span>
              </>
            ) : (
              <span>Evaluate Hardware</span>
            )}
          </button>
        </div>
      </form>

      {/* Results View */}
      {evalResult && (
        <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] space-y-6">
          
          {/* Top Banner Decision */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100 dark:border-[#202632]">
            <div className="flex items-center gap-3">
              {evalResult.decision === 'BUY' && (
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
              )}
              {evalResult.decision === 'NOT BUY' && (
                <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <XCircle className="w-7 h-7" />
                </div>
              )}
              {evalResult.decision === 'INSUFFICIENT_DATA' && (
                <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <HelpCircle className="w-7 h-7" />
                </div>
              )}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Evaluation Verdict ({evalResult.workload})
                </div>
                <div className={`text-2xl font-black ${
                  evalResult.decision === 'BUY' 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : evalResult.decision === 'NOT BUY' 
                    ? 'text-rose-600 dark:text-rose-400' 
                    : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {evalResult.decision}
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs">
              <span className="text-slate-500 block text-[11px]">Fair Price Assessment</span>
              <span className="font-mono font-bold text-lg text-slate-900 dark:text-white">
                {evalResult.fair_price_assessment.estimated_fair_price 
                  ? `₹${evalResult.fair_price_assessment.estimated_fair_price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` 
                  : 'N/A'}
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Premium: {evalResult.fair_price_assessment.price_premium_pct !== null && evalResult.fair_price_assessment.price_premium_pct !== undefined ? (
                  <strong className={evalResult.fair_price_assessment.price_premium_pct <= 0 ? 'text-emerald-600' : 'text-amber-600'}>
                    {evalResult.fair_price_assessment.price_premium_pct > 0 ? `+${evalResult.fair_price_assessment.price_premium_pct}%` : `${evalResult.fair_price_assessment.price_premium_pct}%`}
                  </strong>
                ) : 'Unverified'} ({evalResult.fair_price_assessment.status})
              </span>
            </div>
          </div>

          {/* Scores Overview Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-[#202632]">
              <span className="text-[11px] font-medium text-slate-500 block flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-blue-500" />
                Workload Index P(i,w)
              </span>
              <span className="text-lg font-bold font-mono text-slate-900 dark:text-white block mt-0.5">
                {evalResult.performance_score.toFixed(1)}
              </span>
              <span className="text-[10px] text-slate-400">Baseline Ref = 100.0</span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-[#202632]">
              <span className="text-[11px] font-medium text-slate-500 block flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-emerald-500" />
                Peer Value Index VI(i)
              </span>
              <span className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400 block mt-0.5">
                {evalResult.relative_value_index.toFixed(1)}
              </span>
              <span className="text-[10px] text-slate-400">Peer Median = 100.0</span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-[#202632]">
              <span className="text-[11px] font-medium text-slate-500 block flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-purple-500" />
                Eligibility Status
              </span>
              <span className={`text-sm font-bold block mt-1 ${
                evalResult.eligibility.overall_status === 'PASS' ? 'text-emerald-600' : evalResult.eligibility.overall_status === 'FAIL' ? 'text-rose-600' : 'text-amber-600'
              }`}>
                {evalResult.eligibility.overall_status}
              </span>
              <span className="text-[10px] text-slate-400">{evalResult.eligibility.checks.length} Rules Evaluated</span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-[#202632]">
              <span className="text-[11px] font-medium text-slate-500 block flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-amber-500" />
                Evidence Completeness
              </span>
              <span className="text-lg font-bold font-mono text-slate-900 dark:text-white block mt-0.5">
                {(evalResult.evidence_completeness * 100).toFixed(0)}%
              </span>
              <span className="text-[10px] text-slate-400">Zero Fabricated Data</span>
            </div>
          </div>

          {/* Structured Explanation */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Executive Synthesis:
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-white/5 p-3.5 rounded-lg border border-slate-200/50 dark:border-[#202632]">
                {evalResult.explanation.summary}
              </p>
            </div>

            {/* Reasons */}
            {evalResult.explanation.reasons.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Verified Decision Factors:
                </span>
                <ul className="space-y-1 text-xs">
                  {evalResult.explanation.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                      <span className="text-emerald-500 font-bold shrink-0">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {evalResult.explanation.warnings.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-1">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 block">
                  Advisory Warnings:
                </span>
                <ul className="space-y-1 text-[11px] text-amber-700 dark:text-amber-200">
                  {evalResult.explanation.warnings.map((w, i) => (
                    <li key={i}>⚠ {w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Missing Evidence */}
            {evalResult.explanation.missing_evidence.length > 0 && (
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-white/5 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <span className="font-semibold block">Missing or Unverified Evidence (Reported as UNKNOWN, Not Fabricated):</span>
                <ul className="list-disc list-inside space-y-0.5">
                  {evalResult.explanation.missing_evidence.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Deterministic Eligibility Breakdown */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#202632]">
            <span className="text-xs font-bold text-slate-900 dark:text-white block">
              Deterministic Eligibility Verification:
            </span>
            <div className="grid sm:grid-cols-2 gap-2 text-xs">
              {evalResult.eligibility.checks.map((c, i) => (
                <div key={i} className="p-2.5 rounded-lg border border-slate-200/80 dark:border-[#202632] bg-slate-50/50 dark:bg-white/5 flex items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white block text-[11px]">{c.name}</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">{c.message}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                    c.status === 'PASS' 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : c.status === 'FAIL'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Mathematical Evaluation View (Collapsible) */}
          <div className="pt-2 border-t border-slate-100 dark:border-[#202632]">
            <button
              type="button"
              onClick={() => setShowDetailedMath(!showDetailedMath)}
              className="flex items-center justify-between w-full py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              <span>{showDetailedMath ? 'Hide Detailed Evaluation Telemetry' : 'Show Detailed Evaluation Telemetry (Formulas & Benchmark Ratios)'}</span>
              {showDetailedMath ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showDetailedMath && (
              <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-[#202632] space-y-4 text-xs font-mono">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block text-[11px]">
                    Performance Formula:
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                    P(i,w) = 100 × exp( Σ [ α(w,j) × ln(Score_j / Baseline_j) ] )
                  </p>
                </div>

                {/* Benchmark Ratio Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/10 text-slate-400">
                        <th className="py-1">Component</th>
                        <th className="py-1">Raw Metric</th>
                        <th className="py-1">Baseline Ref</th>
                        <th className="py-1">Ratio R(i,j)</th>
                        <th className="py-1">Weight α</th>
                        <th className="py-1">Weighted Log</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(evalResult.benchmark_ratios).map(([key, item]) => (
                        <tr key={key} className="border-b border-slate-200/50 dark:border-white/5 text-slate-700 dark:text-slate-300">
                          <td className="py-1 font-semibold">{item.component}</td>
                          <td className="py-1">{item.raw_metric.toLocaleString()}</td>
                          <td className="py-1">{item.reference_metric.toLocaleString()}</td>
                          <td className="py-1 font-bold text-blue-600 dark:text-blue-400">{item.ratio}×</td>
                          <td className="py-1">{(item.weight * 100).toFixed(0)}%</td>
                          <td className="py-1">{item.weighted_log.toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-white/10 text-[10px] text-slate-500 dark:text-slate-400 space-y-1">
                  <p>Resolved Hardware: CPU = {evalResult.detailed_evaluation_metrics.resolved_cpu || 'Generic'} | GPU = {evalResult.detailed_evaluation_metrics.resolved_gpu || 'Integrated'}</p>
                  <p>Comparable Market Peers Sampled: {evalResult.detailed_evaluation_metrics.comparable_peers_count} units (Same form factor, non-mixed).</p>
                  <p className="italic">Disclosure: {evalResult.ml_support.synthetic_supervision_notice}</p>
                </div>
              </div>
            )}
          </div>

          {/* Alternatives Row */}
          {evalResult.decision !== 'BUY' && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#202632]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-blue-600" />
                  <span>Recommended High-Value Alternatives Within Budget:</span>
                </span>
                {onNavigateToRecommendations && (
                  <button
                    onClick={() => onNavigateToRecommendations(userBudget || price)}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    View All Matches →
                  </button>
                )}
              </div>

              {loadingAlternatives ? (
                <div className="p-3 text-xs text-slate-400 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Searching eligible alternatives using TOPSIS relative closeness...</span>
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
                            ₹{alt.price_inr.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          {alt.cpu} ({alt.cores} Cores) • {alt.graphics} ({alt.vram_gb} GB VRAM) • {alt.ram_gb} GB RAM
                        </div>
                      </div>

                      <div className="pt-2 mt-2 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between">
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                          TOPSIS: {alt.topsis_score.toFixed(3)}
                        </span>
                        {onAddToCompare && (
                          <button
                            onClick={() => onAddToCompare({
                              cpu: alt.cpu,
                              ram_gb: alt.ram_gb,
                              ssd_gb: alt.ssd_gb,
                              graphics: alt.graphics,
                              price_inr: alt.price_inr,
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
                  No direct alternatives indexed under ₹{(userBudget || price).toLocaleString()}.
                </div>
              )}
            </div>
          )}

          {/* Action Row */}
          <div className="pt-3 border-t border-slate-100 dark:border-[#202632] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="max-w-xl">
              Strict Policy: Incompatible sockets, insufficient VRAM, or over-budget listings cannot receive a BUY recommendation.
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
