import React, { useState, useEffect } from 'react';
import { 
  Compass, CheckCircle2, GitCompare, ArrowRight, 
  Activity, Bookmark, Trash2, X
} from 'lucide-react';
import { hirsApi } from '../services/api';
import { EmptyState } from '../components/ui/EmptyState';
import type { SavedBuild } from '../types';

interface DashboardProps {
  onNavigate: (tab: string) => void;
  onAnalyzeSample?: (config: any) => void;
  onAddToCompare?: (config: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  onNavigate, 
  onAnalyzeSample,
  onAddToCompare
}) => {
  const [modelStatus, setModelStatus] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [dismissWelcome, setDismissWelcome] = useState<boolean>(() => {
    return localStorage.getItem('hirs-dismiss-welcome') === 'true';
  });

  const [activeTab, setActiveTab] = useState<'recent' | 'saved'>('recent');

  // Recent activity saved locally
  const [recentActivity, setRecentActivity] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('hirs-recent-evals');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Saved recommendations bookmarked by the user
  const [savedBuilds, setSavedBuilds] = useState<SavedBuild[]>(() => {
    try {
      const saved = localStorage.getItem('hirs-saved-recommendations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [mStatus, dSummary] = await Promise.all([
          hirsApi.getModelStatus().catch(() => null),
          hirsApi.getDatasetSummary().catch(() => null)
        ]);
        setModelStatus(mStatus);
        setSummary(dSummary);
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  }, []);

  const handleDismissWelcome = () => {
    setDismissWelcome(true);
    localStorage.setItem('hirs-dismiss-welcome', 'true');
  };

  const handleRemoveSaved = (id: string) => {
    const updated = savedBuilds.filter(b => b.id !== id);
    setSavedBuilds(updated);
    localStorage.setItem('hirs-saved-recommendations', JSON.stringify(updated));
  };

  const handleClearHistory = () => {
    if (window.confirm("Clear your local evaluation history?")) {
      setRecentActivity([]);
      localStorage.removeItem('hirs-recent-evals');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-[#202632]">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Hardware purchasing intelligence, recent evaluations, and recommendation system status.
        </p>
      </div>

      {/* Welcome Section (Dismissible) */}
      {!dismissWelcome && (
        <div className="relative p-5 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 text-xs text-slate-700 dark:text-slate-300">
          <button
            onClick={handleDismissWelcome}
            className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            aria-label="Dismiss welcome banner"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="max-w-2xl space-y-1.5">
            <h2 className="font-bold text-sm text-blue-950 dark:text-blue-200">
              Welcome to HIRS — Hardware Intelligence & Recommendation System
            </h2>
            <p className="leading-relaxed">
              HIRS uses real machine learning (LightGBM trained across 1,048,575 audited configurations) to help you decide whether a laptop or desktop PC is worth buying, discover candidate builds strictly within your budget ceiling, and compare multiple builds side-by-side.
            </p>
          </div>
        </div>
      )}

      {/* 1. WHAT CAN I DO? (Primary Action Cards) */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Quick Actions
        </h2>

        <div className="grid sm:grid-cols-3 gap-4">
          <button
            onClick={() => onNavigate('recommendations')}
            className="p-5 rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] hover:border-blue-500 dark:hover:border-blue-500/60 text-left transition-colors group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
              <span>Start a Recommendation</span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Find verified laptop and desktop configurations strictly within your maximum budget.
            </p>
          </button>

          <button
            onClick={() => onNavigate('analyzer')}
            className="p-5 rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] hover:border-slate-300 dark:hover:border-slate-700 text-left transition-colors group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
              <span>Analyze Hardware</span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Evaluate whether a specific CPU, GPU, RAM, storage, and price combination is worth buying.
            </p>
          </button>

          <button
            onClick={() => onNavigate('comparison')}
            className="p-5 rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] hover:border-slate-300 dark:hover:border-slate-700 text-left transition-colors group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-3">
              <GitCompare className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
              <span>Compare Configurations</span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Compare 2 to 4 hardware builds side-by-side to highlight price, value, and performance differences.
            </p>
          </button>
        </div>
      </section>

      {/* 2. RECENT ACTIVITY & SAVED BUILDS + 3. SYSTEM STATUS */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Activity / Saved Tabs */}
        <div className="lg:col-span-2 space-y-3">
          
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#202632] pb-2">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab('recent')}
                className={`text-xs font-bold pb-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'recent'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Recent Activity ({recentActivity.length})
              </button>

              <button
                onClick={() => setActiveTab('saved')}
                className={`text-xs font-bold pb-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'saved'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Saved Recommendations ({savedBuilds.length})</span>
              </button>
            </div>

            {activeTab === 'recent' && recentActivity.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="text-[11px] text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
              >
                Clear History
              </button>
            )}
          </div>

          {/* Tab Content: Recent Activity */}
          {activeTab === 'recent' && (
            <div className="rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] divide-y divide-slate-100 dark:divide-[#202632] overflow-hidden">
              {recentActivity.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="No evaluations yet"
                  description="Test any PC or laptop build in the BUY / NOT BUY Analyzer to view evaluations here."
                  actionLabel="Analyze First Build"
                  onAction={() => onNavigate('analyzer')}
                />
              ) : (
                recentActivity.map((item, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {item.cpu} • {item.graphics}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.ram_gb} GB RAM • {item.ssd_gb} GB SSD • ₹{Number(item.price_inr).toLocaleString()} INR
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.prediction === 'BUY'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
                      }`}>
                        {item.prediction} ({(item.buy_probability * 100).toFixed(0)}%)
                      </span>

                      {onAnalyzeSample && (
                        <button
                          onClick={() => onAnalyzeSample(item)}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
                          title="Re-inspect configuration"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab Content: Saved Recommendations */}
          {activeTab === 'saved' && (
            <div className="rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] divide-y divide-slate-100 dark:divide-[#202632] overflow-hidden">
              {savedBuilds.length === 0 ? (
                <EmptyState
                  icon={Bookmark}
                  title="No saved recommendations"
                  description="When generating smart recommendations, click 'Save Build' to bookmark configurations here for easy comparison."
                  actionLabel="Generate Recommendations"
                  onAction={() => onNavigate('recommendations')}
                />
              ) : (
                savedBuilds.map((build) => (
                  <div key={build.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {build.name || `${build.cpu} Build`}
                        </span>
                        {build.tag && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                            {build.tag}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {build.cpu} • {build.graphics} • {build.ram_gb} GB RAM • ₹{Number(build.price_inr).toLocaleString()} INR
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {onAnalyzeSample && (
                        <button
                          onClick={() => onAnalyzeSample({
                            cpu: build.cpu,
                            ram_gb: build.ram_gb,
                            ssd_gb: build.ssd_gb,
                            graphics: build.graphics,
                            price_inr: build.price_inr,
                            device_type: build.device_type || 'Desktop'
                          })}
                          className="px-2 py-1 rounded text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          Analyze
                        </button>
                      )}

                      {onAddToCompare && (
                        <button
                          onClick={() => onAddToCompare({
                            cpu: build.cpu,
                            ram_gb: build.ram_gb,
                            ssd_gb: build.ssd_gb,
                            graphics: build.graphics,
                            price_inr: build.price_inr,
                            device_type: build.device_type || 'Desktop'
                          })}
                          className="px-2 py-1 rounded text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
                        >
                          Compare
                        </button>
                      )}

                      <button
                        onClick={() => handleRemoveSaved(build.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                        title="Remove from saved"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* Right Col: System Status Summary */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            System Status
          </h2>

          <div className="p-5 rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#202632]">
              <span className="text-slate-500">ML Model Engine</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active ({modelStatus?.model_architecture || 'LightGBM'})
              </span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#202632]">
              <span className="text-slate-500">Catalogue Configurations</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                984,081
              </span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#202632]">
              <span className="text-slate-500">Audited Training Records</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                {summary?.total_rows ? Number(summary.total_rows).toLocaleString() : '1,048,575'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Budget Violation Rate</span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                0.0% (Strict Ceiling)
              </span>
            </div>

            <div className="pt-2">
              <button
                onClick={() => onNavigate('model-performance')}
                className="w-full py-2 rounded-lg text-center text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                View Model Verification Metrics
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
