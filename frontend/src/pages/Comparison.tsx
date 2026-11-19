import React, { useState, useEffect } from 'react';
import { 
  GitCompare, Plus, Trash2, 
  X, RefreshCw
} from 'lucide-react';
import { hirsApi } from '../services/api';
import type { PredictRequest, CompareResponse } from '../types';
import { EmptyState } from '../components/ui/EmptyState';
import { Toast, type ToastMessage } from '../components/ui/Toast';

interface ComparisonProps {
  compareQueue?: PredictRequest[];
  onRemoveFromQueue?: (index: number) => void;
  onNavigateToCatalogue?: () => void;
}

export const Comparison: React.FC<ComparisonProps> = ({
  compareQueue = [],
  onRemoveFromQueue,
  onNavigateToCatalogue
}) => {
  const defaultItems: PredictRequest[] = [
    {
      cpu: 'AMD Ryzen 7 7800X3D',
      ram_gb: 32,
      ssd_gb: 1000,
      graphics: 'NVIDIA GeForce RTX 4070',
      price_inr: 145000,
      device_type: 'Desktop'
    },
    {
      cpu: 'Intel Core i5-13500',
      ram_gb: 32,
      ssd_gb: 1000,
      graphics: 'NVIDIA GeForce RTX 4060 Ti',
      price_inr: 112000,
      device_type: 'Desktop'
    },
    {
      cpu: 'Intel Core i3-3240',
      ram_gb: 16,
      ssd_gb: 512,
      graphics: 'Zotac ZT-70601-10M',
      price_inr: 95000,
      device_type: 'Desktop'
    }
  ];

  const [items, setItems] = useState<PredictRequest[]>(() => {
    return compareQueue.length >= 2 ? compareQueue : defaultItems;
  });

  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState<CompareResponse | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Form for custom build addition in modal
  const [customCpu, setCustomCpu] = useState('AMD Ryzen 5 7600X');
  const [customGpu, setCustomGpu] = useState('AMD Radeon RX 7800 XT');
  const [customRam, setCustomRam] = useState(32);
  const [customSsd, setCustomSsd] = useState(1000);
  const [customPrice, setCustomPrice] = useState(125000);
  const [customDeviceType, setCustomDeviceType] = useState('Desktop');

  useEffect(() => {
    if (compareQueue.length >= 2) {
      setItems(compareQueue);
    }
  }, [compareQueue]);

  useEffect(() => {
    if (items.length >= 2) {
      let isMounted = true;
      setLoading(true);
      hirsApi.compareHardware({ items })
        .then(res => {
          if (isMounted) setComparison(res);
        })
        .catch(err => {
          if (isMounted) {
            console.error(err);
            setToast({
              id: String(Date.now()),
              type: 'error',
              text: 'Failed to run hardware comparison calculation.'
            });
          }
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });

      return () => { isMounted = false; };
    } else {
      setComparison(null);
    }
  }, [items]);

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

    const newItem: PredictRequest = {
      cpu: customCpu.trim(),
      ram_gb: customRam,
      ssd_gb: customSsd,
      graphics: customGpu.trim(),
      price_inr: customPrice,
      device_type: customDeviceType
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
    { label: 'Budget Entry i5-12400F + RTX 3060 (₹65,000)', cpu: 'Intel Core i5-12400F', gpu: 'NVIDIA GeForce RTX 3060', ram: 16, ssd: 512, price: 65000 },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#202632]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Compare Hardware
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Evaluate 2 to 4 configurations side-by-side to highlight price, value, and performance differences.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {items.length < 4 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Configuration ({items.length}/4)</span>
            </button>
          )}

          {onNavigateToCatalogue && (
            <button
              onClick={onNavigateToCatalogue}
              className="px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Browse Catalogue
            </button>
          )}
        </div>
      </div>

      {/* Loading state indicator */}
      {loading && (
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Recalculating comparison matrix and score differentials...</span>
        </div>
      )}

      {/* Empty State when less than 2 items */}
      {items.length < 2 && (
        <EmptyState
          icon={GitCompare}
          title="At least 2 configurations required"
          description="Add one or more configurations from the Smart Recommendations, Catalogue, or click Add Configuration below."
          actionLabel="Add Build to Compare"
          onAction={() => setShowAddModal(true)}
        />
      )}

      {/* Category Winners Summary */}
      {comparison && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-lg bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Best Value</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate block mt-0.5" title={comparison.category_winners.best_value}>
              {comparison.category_winners.best_value}
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Peak Performance</span>
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 truncate block mt-0.5" title={comparison.category_winners.best_performance}>
              {comparison.category_winners.best_performance}
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Highest BUY Probability</span>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 truncate block mt-0.5" title={comparison.category_winners.highest_buy_probability}>
              {comparison.category_winners.highest_buy_probability}
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lowest Cost</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white truncate block mt-0.5" title={comparison.category_winners.lowest_price}>
              {comparison.category_winners.lowest_price}
            </span>
          </div>
        </div>
      )}

      {/* Comparison Table */}
      {comparison && (
        <div className="rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#202632] bg-slate-50/50 dark:bg-white/5 text-slate-500 font-semibold">
                  <th className="p-3.5 w-44 sticky left-0 bg-slate-50 dark:bg-[#11141A] z-10">Attribute</th>
                  {comparison.items.map((it, idx) => (
                    <th key={idx} className="p-3.5 min-w-[220px]">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">Build #{idx + 1}</span>
                        {items.length > 2 && (
                          <button
                            onClick={() => removeItem(idx)}
                            className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                            title="Remove build from matrix"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-[#202632]">
                {/* Decision */}
                <tr>
                  <td className="p-3.5 font-medium text-slate-500 sticky left-0 bg-white dark:bg-[#11141A] z-10">Model Decision</td>
                  {comparison.items.map((it, idx) => (
                    <td key={idx} className="p-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                        it.prediction === 'BUY'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
                      }`}>
                        {it.prediction} ({(it.buy_probability * 100).toFixed(0)}%)
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Price */}
                <tr>
                  <td className="p-3.5 font-medium text-slate-500 sticky left-0 bg-white dark:bg-[#11141A] z-10">Price (INR)</td>
                  {comparison.items.map((it, idx) => (
                    <td key={idx} className="p-3.5 font-bold text-slate-900 dark:text-white font-mono">
                      ₹{it.price_inr.toLocaleString()}
                    </td>
                  ))}
                </tr>

                {/* CPU */}
                <tr>
                  <td className="p-3.5 font-medium text-slate-500 sticky left-0 bg-white dark:bg-[#11141A] z-10">Processor</td>
                  {comparison.items.map((it, idx) => (
                    <td key={idx} className="p-3.5 font-medium text-slate-800 dark:text-slate-200">
                      {it.cpu}
                    </td>
                  ))}
                </tr>

                {/* Graphics */}
                <tr>
                  <td className="p-3.5 font-medium text-slate-500 sticky left-0 bg-white dark:bg-[#11141A] z-10">Graphics</td>
                  {comparison.items.map((it, idx) => (
                    <td key={idx} className="p-3.5 font-medium text-slate-800 dark:text-slate-200">
                      {it.graphics}
                    </td>
                  ))}
                </tr>

                {/* RAM */}
                <tr>
                  <td className="p-3.5 font-medium text-slate-500 sticky left-0 bg-white dark:bg-[#11141A] z-10">Memory (RAM)</td>
                  {comparison.items.map((it, idx) => (
                    <td key={idx} className="p-3.5 font-mono text-slate-800 dark:text-slate-200">
                      {it.ram_gb} GB
                    </td>
                  ))}
                </tr>

                {/* SSD */}
                <tr>
                  <td className="p-3.5 font-medium text-slate-500 sticky left-0 bg-white dark:bg-[#11141A] z-10">Storage (SSD)</td>
                  {comparison.items.map((it, idx) => (
                    <td key={idx} className="p-3.5 font-mono text-slate-800 dark:text-slate-200">
                      {it.ssd_gb} GB
                    </td>
                  ))}
                </tr>

                {/* Hardware Score */}
                <tr>
                  <td className="p-3.5 font-medium text-slate-500 sticky left-0 bg-white dark:bg-[#11141A] z-10">Compute Score</td>
                  {comparison.items.map((it, idx) => (
                    <td key={idx} className="p-3.5 font-mono font-semibold text-slate-900 dark:text-white">
                      {it.hardware_score.toFixed(1)} / 100
                    </td>
                  ))}
                </tr>

                {/* Value Score */}
                <tr>
                  <td className="p-3.5 font-medium text-slate-500 sticky left-0 bg-white dark:bg-[#11141A] z-10">Value-to-Price Index</td>
                  {comparison.items.map((it, idx) => (
                    <td key={idx} className="p-3.5 font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {it.value_score.toFixed(2)}
                    </td>
                  ))}
                </tr>

                {/* Strengths / Weaknesses */}
                <tr>
                  <td className="p-3.5 font-medium text-slate-500 sticky left-0 bg-white dark:bg-[#11141A] z-10">Key Assessment</td>
                  {comparison.items.map((it, idx) => {
                    const isHighRam = it.ram_gb >= 32;
                    const isHighPrice = it.price_inr > 150000;
                    return (
                      <td key={idx} className="p-3.5 space-y-1">
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                          ✓ {isHighRam ? `${it.ram_gb} GB High Capacity RAM` : 'Budget-focused entry profile'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          • {isHighPrice ? 'High absolute investment' : 'Lower capital requirement'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Synthesis */}
      {comparison && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-[#202632] text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Synthesis:</span>
          {comparison.analysis_summary}
        </div>
      )}

      {/* Add Configuration Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#202632]">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Add Configuration to Compare
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500">Quick Presets:</span>
              <div className="space-y-1.5">
                {presetChoices.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setCustomCpu(p.cpu);
                      setCustomGpu(p.gpu);
                      setCustomRam(p.ram);
                      setCustomSsd(p.ssd);
                      setCustomPrice(p.price);
                    }}
                    className="w-full text-left p-2 rounded-lg text-xs bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Form */}
            <form onSubmit={handleAddCustom} className="space-y-3 pt-2 border-t border-slate-100 dark:border-[#202632] text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Processor</label>
                  <input
                    type="text"
                    value={customCpu}
                    onChange={(e) => setCustomCpu(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Graphics Card</label>
                  <input
                    type="text"
                    value={customGpu}
                    onChange={(e) => setCustomGpu(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">RAM (GB)</label>
                  <input
                    type="number"
                    value={customRam}
                    onChange={(e) => setCustomRam(Number(e.target.value))}
                    min={4}
                    max={512}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Storage SSD (GB)</label>
                  <input
                    type="number"
                    value={customSsd}
                    onChange={(e) => setCustomSsd(Number(e.target.value))}
                    min={128}
                    max={8000}
                    step={128}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Form Factor</label>
                  <select
                    value={customDeviceType}
                    onChange={(e) => setCustomDeviceType(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white"
                  >
                    <option value="Desktop">Desktop PC</option>
                    <option value="Laptop">Laptop</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Price (₹ INR)</label>
                  <input
                    type="number"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(Number(e.target.value))}
                    min={10000}
                    max={1000000}
                    step={1000}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                >
                  Add to Comparison
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
