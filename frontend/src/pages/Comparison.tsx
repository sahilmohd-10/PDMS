import React, { useState, useEffect } from 'react';
import { 
  GitCompare, Plus, Trash2, 
  X, RefreshCw, Award, Zap, TrendingUp, DollarSign
} from 'lucide-react';
import { hirsApi } from '../services/api';
import type { 
  EvaluationRequest, 
  EvaluationCompareResponse,
  WorkloadType 
} from '../types';
import { EmptyState } from '../components/ui/EmptyState';
import { Toast, type ToastMessage } from '../components/ui/Toast';

interface ComparisonProps {
  compareQueue?: EvaluationRequest[];
  onRemoveFromQueue?: (index: number) => void;
  onNavigateToCatalogue?: () => void;
}

export const Comparison: React.FC<ComparisonProps> = ({
  compareQueue = [],
  onRemoveFromQueue,
  onNavigateToCatalogue
}) => {
  const defaultItems: EvaluationRequest[] = [
    {
      cpu: 'AMD Ryzen 7 7800X3D',
      ram_gb: 32,
      ssd_gb: 1000,
      graphics: 'NVIDIA GeForce RTX 4070',
      price_inr: 145000,
      device_type: 'Desktop',
      workload: 'Gaming'
    },
    {
      cpu: 'Intel Core i5-13500',
      ram_gb: 32,
      ssd_gb: 1000,
      graphics: 'NVIDIA GeForce RTX 4060 Ti',
      price_inr: 112000,
      device_type: 'Desktop',
      workload: 'Gaming'
    },
    {
      cpu: 'Intel Core i7-870',
      ram_gb: 16,
      ssd_gb: 512,
      graphics: 'NVIDIA GeForce GTX 1650',
      price_inr: 45000,
      device_type: 'Desktop',
      workload: 'Gaming'
    }
  ];

  const [items, setItems] = useState<EvaluationRequest[]>(() => {
    return compareQueue.length >= 2 ? compareQueue : defaultItems;
  });

  const [workload, setWorkload] = useState<WorkloadType>('Gaming');
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState<EvaluationCompareResponse | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Form for custom build addition in modal
  const [customCpu, setCustomCpu] = useState('AMD Ryzen 5 7600X');
  const [customGpu, setCustomGpu] = useState('AMD Radeon RX 7800 XT');
  const [customRam, setCustomRam] = useState(32);
  const [customSsd, setCustomSsd] = useState(1000);
  const [customPrice, setCustomPrice] = useState(125000);
  const [customDeviceType, setCustomDeviceType] = useState('Desktop');

  // Trigger evaluation comparison when items or workload change
  useEffect(() => {
    if (items.length >= 2) {
      runCompare();
    }
  }, [items, workload]);

  const runCompare = async () => {
    setLoading(true);
    try {
      const candidatesPayload = items.map(it => ({
        ...it,
        workload: workload
      }));
      const res = await hirsApi.evaluateCompare({
        candidates: candidatesPayload,
        workload: workload
      });
      setComparison(res);
    } catch (err: any) {
      console.error(err);
      setToast({
        id: String(Date.now()),
        type: 'error',
        text: err.message || 'Comparison failed. Verify API connection.'
      });
    } finally {
      setLoading(false);
    }
  };

  const removeItem = (idx: number) => {
    if (items.length <= 2) {
      setToast({
        id: String(Date.now()),
        type: 'info',
        text: 'A minimum of 2 configurations is required for side-by-side comparison.'
      });
      return;
    }
    const updated = items.filter((_, i) => i !== idx);
    setItems(updated);
    if (onRemoveFromQueue) onRemoveFromQueue(idx);
    setToast({
      id: String(Date.now()),
      type: 'info',
      text: `Removed Build #${idx + 1} from comparison.`
    });
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length >= 4) {
      setToast({
        id: String(Date.now()),
        type: 'error',
        text: 'Maximum of 4 configurations can be compared simultaneously.'
      });
      return;
    }

    const newItem: EvaluationRequest = {
      cpu: customCpu.trim(),
      ram_gb: customRam,
      ssd_gb: customSsd,
      graphics: customGpu.trim(),
      price_inr: customPrice,
      device_type: customDeviceType,
      workload: workload
    };

    setItems([...items, newItem]);
    setShowAddModal(false);
    setToast({
      id: String(Date.now()),
      type: 'success',
      text: `Added '${newItem.cpu}' to comparison matrix.`
    });
  };

  const presetChoices = [
    { label: 'AMD Ryzen 5 7600X + RX 7800 XT (₹1,25,000)', cpu: 'AMD Ryzen 5 7600X', gpu: 'AMD Radeon RX 7800 XT', ram: 32, ssd: 1000, price: 125000 },
    { label: 'Intel Core i7-14700K + RTX 4070 Ti (₹1,95,000)', cpu: 'Intel Core i7-14700K', gpu: 'NVIDIA GeForce RTX 4070 Ti', ram: 32, ssd: 2000, price: 195000 },
    { label: 'Budget Entry i5-12400F + RTX 3060 (₹65,000)', cpu: 'Intel Core i5-12400', gpu: 'NVIDIA GeForce RTX 3060', ram: 16, ssd: 512, price: 65000 },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#202632]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Multi-Criteria Hardware Comparison
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Evaluate 2 to 4 configurations side-by-side using TOPSIS relative closeness, workload benchmarks, and price fairness.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Workload Selector */}
          <select
            value={workload}
            onChange={(e) => setWorkload(e.target.value as WorkloadType)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-[#202632] bg-white dark:bg-[#11141A] text-slate-900 dark:text-white font-medium focus:outline-none"
          >
            <option value="Gaming">Gaming Workload</option>
            <option value="Programming">Programming Workload</option>
            <option value="Data Analytics">Data Analytics Workload</option>
            <option value="Deep Learning">Deep Learning Workload</option>
            <option value="Video Editing">Video Editing Workload</option>
            <option value="Office">Office Workload</option>
          </select>

          {items.length < 4 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Build ({items.length}/4)</span>
            </button>
          )}

          {onNavigateToCatalogue && (
            <button
              onClick={onNavigateToCatalogue}
              className="px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Catalogue
            </button>
          )}
        </div>
      </div>

      {/* Loading state indicator */}
      {loading && (
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Recalculating TOPSIS Euclidean closeness vectors across {workload} criteria...</span>
        </div>
      )}

      {/* Empty State when less than 2 items */}
      {items.length < 2 && (
        <EmptyState
          icon={GitCompare}
          title="At least 2 configurations required"
          description="Add one or more configurations from the Smart Recommendations, Catalogue, or click Add Build below."
          actionLabel="Add Build to Compare"
          onAction={() => setShowAddModal(true)}
        />
      )}

      {/* Category Winners Summary */}
      {comparison && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-lg bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-blue-500" />
              TOPSIS Winner
            </span>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 truncate block mt-0.5" title={comparison.category_winners['Best Balanced Choice (TOPSIS Winner)']}>
              {comparison.category_winners['Best Balanced Choice (TOPSIS Winner)']}
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-purple-500" />
              Peak Performance
            </span>
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 truncate block mt-0.5" title={comparison.category_winners['Best Performance']}>
              {comparison.category_winners['Best Performance']}
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              Best Value
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate block mt-0.5" title={comparison.category_winners['Best Value']}>
              {comparison.category_winners['Best Value']}
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-slate-500" />
              Lowest Price
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-white truncate block mt-0.5" title={comparison.category_winners['Lowest Price']}>
              {comparison.category_winners['Lowest Price']}
            </span>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Matrix */}
      {comparison && comparison.evaluated_items.length >= 2 && (
        <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#202632]">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Comparative Telemetry Matrix ({comparison.evaluated_items.length} Configurations)
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Workload Profile: {comparison.workload}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  <th className="py-2.5 text-left text-slate-400 font-medium w-48">Evaluation Metric</th>
                  {comparison.evaluated_items.map((item, idx) => (
                    <th key={idx} className="py-2.5 text-left font-bold text-slate-900 dark:text-white px-3">
                      <div className="flex items-center justify-between">
                        <span>Option {idx + 1}</span>
                        {items.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                            title="Remove from comparison"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-mono text-[11px]">
                
                {/* Decision Verdict */}
                <tr className="bg-slate-50/50 dark:bg-white/5 font-sans">
                  <td className="py-2.5 font-semibold text-slate-700 dark:text-slate-300">Decision Policy Verdict</td>
                  {comparison.evaluated_items.map((item, idx) => (
                    <td key={idx} className="py-2.5 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.decision === 'BUY'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : item.decision === 'NOT BUY'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        {item.decision}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* TOPSIS Closeness */}
                <tr>
                  <td className="py-2.5 font-semibold font-sans text-slate-700 dark:text-slate-300">TOPSIS Relative Closeness T(i)</td>
                  {comparison.topsis_rankings.map((t, idx) => (
                    <td key={idx} className="py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400">
                      {t.topsis_score.toFixed(3)} (Rank #{t.topsis_rank})
                    </td>
                  ))}
                </tr>

                {/* Workload Performance Score */}
                <tr>
                  <td className="py-2.5 font-semibold font-sans text-slate-700 dark:text-slate-300">Performance Index P(i,w)</td>
                  {comparison.evaluated_items.map((item, idx) => (
                    <td key={idx} className="py-2.5 px-3 text-slate-900 dark:text-white font-bold">
                      {item.performance_score.toFixed(1)}
                    </td>
                  ))}
                </tr>

                {/* Relative Value Index */}
                <tr>
                  <td className="py-2.5 font-semibold font-sans text-slate-700 dark:text-slate-300">Peer Value Index VI(i)</td>
                  {comparison.evaluated_items.map((item, idx) => (
                    <td key={idx} className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                      {item.relative_value_index.toFixed(1)}
                    </td>
                  ))}
                </tr>

                {/* Listing Price */}
                <tr>
                  <td className="py-2.5 font-semibold font-sans text-slate-700 dark:text-slate-300">Retail Price (INR)</td>
                  {items.map((item, idx) => (
                    <td key={idx} className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                      ₹{item.price_inr.toLocaleString()}
                    </td>
                  ))}
                </tr>

                {/* Fair Price & Premium */}
                <tr>
                  <td className="py-2.5 font-semibold font-sans text-slate-700 dark:text-slate-300">Fair Market Estimate</td>
                  {comparison.evaluated_items.map((item, idx) => (
                    <td key={idx} className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {item.fair_price_assessment.estimated_fair_price ? `₹${item.fair_price_assessment.estimated_fair_price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : 'N/A'}
                      {item.fair_price_assessment.price_premium_pct !== null && item.fair_price_assessment.price_premium_pct !== undefined && (
                        <span className={`block text-[10px] ${item.fair_price_assessment.price_premium_pct <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          ({item.fair_price_assessment.price_premium_pct > 0 ? `+${item.fair_price_assessment.price_premium_pct}%` : `${item.fair_price_assessment.price_premium_pct}%`})
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Processor */}
                <tr className="font-sans">
                  <td className="py-2.5 font-semibold text-slate-700 dark:text-slate-300">Processor (CPU)</td>
                  {items.map((item, idx) => (
                    <td key={idx} className="py-2.5 px-3 text-slate-900 dark:text-white">
                      {item.cpu}
                    </td>
                  ))}
                </tr>

                {/* Graphics */}
                <tr className="font-sans">
                  <td className="py-2.5 font-semibold text-slate-700 dark:text-slate-300">Graphics (GPU)</td>
                  {items.map((item, idx) => (
                    <td key={idx} className="py-2.5 px-3 text-slate-900 dark:text-white">
                      {item.graphics}
                    </td>
                  ))}
                </tr>

                {/* RAM */}
                <tr>
                  <td className="py-2.5 font-semibold font-sans text-slate-700 dark:text-slate-300">RAM Capacity</td>
                  {items.map((item, idx) => (
                    <td key={idx} className="py-2.5 px-3 text-slate-900 dark:text-white">
                      {item.ram_gb} GB
                    </td>
                  ))}
                </tr>

                {/* Storage */}
                <tr>
                  <td className="py-2.5 font-semibold font-sans text-slate-700 dark:text-slate-300">SSD Storage</td>
                  {items.map((item, idx) => (
                    <td key={idx} className="py-2.5 px-3 text-slate-900 dark:text-white">
                      {item.ssd_gb} GB
                    </td>
                  ))}
                </tr>

                {/* Eligibility */}
                <tr className="font-sans">
                  <td className="py-2.5 font-semibold text-slate-700 dark:text-slate-300">Workload Eligibility</td>
                  {comparison.evaluated_items.map((item, idx) => (
                    <td key={idx} className="py-2.5 px-3">
                      <span className={`text-[11px] font-bold ${
                        item.eligibility.overall_status === 'PASS' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {item.eligibility.overall_status}
                      </span>
                    </td>
                  ))}
                </tr>

              </tbody>
            </table>
          </div>

          <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400">
            {comparison.comparison_summary}
          </div>
        </div>
      )}

      {/* Add Custom Build Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#11141A] rounded-xl border border-slate-200 dark:border-[#202632] max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#202632]">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                Add Configuration to Comparison
              </span>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500">Quick Presets:</span>
              <div className="space-y-1">
                {presetChoices.map((pc, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setCustomCpu(pc.cpu);
                      setCustomGpu(pc.gpu);
                      setCustomRam(pc.ram);
                      setCustomSsd(pc.ssd);
                      setCustomPrice(pc.price);
                    }}
                    className="w-full text-left p-1.5 rounded bg-slate-50 dark:bg-white/5 hover:bg-slate-100 text-[11px] text-slate-700 dark:text-slate-300 truncate transition-colors cursor-pointer"
                  >
                    {pc.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddCustom} className="space-y-3 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">CPU</label>
                <input
                  type="text"
                  value={customCpu}
                  onChange={(e) => setCustomCpu(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">GPU</label>
                <input
                  type="text"
                  value={customGpu}
                  onChange={(e) => setCustomGpu(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">RAM (GB)</label>
                  <input
                    type="number"
                    min={4}
                    max={256}
                    value={customRam}
                    onChange={(e) => setCustomRam(Number(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">SSD (GB)</label>
                  <input
                    type="number"
                    min={128}
                    max={8000}
                    step={128}
                    value={customSsd}
                    onChange={(e) => setCustomSsd(Number(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Price (₹ INR)</label>
                <input
                  type="number"
                  min={10000}
                  max={800000}
                  step={1000}
                  value={customPrice}
                  onChange={(e) => setCustomPrice(Number(e.target.value))}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#202632] text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 cursor-pointer"
                >
                  Add to Matrix
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
