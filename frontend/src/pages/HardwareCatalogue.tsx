import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, ChevronLeft, ChevronRight, 
  Monitor, Laptop, GitCompare, X, RotateCcw
} from 'lucide-react';
import { hirsApi } from '../services/api';
import type { HardwareExploreResponse } from '../types';
import { EmptyState } from '../components/ui/EmptyState';
import { Toast, type ToastMessage } from '../components/ui/Toast';

interface HardwareCatalogueProps {
  onAnalyzeConfig: (config: any) => void;
  onAddToCompare: (config: any) => void;
}

export const HardwareCatalogue: React.FC<HardwareCatalogueProps> = ({
  onAnalyzeConfig,
  onAddToCompare
}) => {
  const [query, setQuery] = useState('');
  const [deviceType, setDeviceType] = useState('All');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minRam, setMinRam] = useState<string>('');
  const [sortBy, setSortBy] = useState('price_asc');
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<HardwareExploreResponse | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const fetchCatalogue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hirsApi.exploreHardware({
        query: query || undefined,
        device_type: deviceType,
        min_price: minPrice ? Number(minPrice) : undefined,
        max_price: maxPrice ? Number(maxPrice) : undefined,
        min_ram: minRam ? Number(minRam) : undefined,
        sort_by: sortBy,
        page: page,
        page_size: 15
      });
      setData(res);
    } catch (err: any) {
      console.error(err);
      setToast({
        id: String(Date.now()),
        type: 'error',
        text: 'Failed to fetch catalogue items from server.'
      });
    } finally {
      setLoading(false);
    }
  }, [query, deviceType, minPrice, maxPrice, minRam, sortBy, page]);

  useEffect(() => {
    fetchCatalogue();
  }, [fetchCatalogue]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCatalogue();
  };

  const handleResetFilters = () => {
    setQuery('');
    setDeviceType('All');
    setMinPrice('');
    setMaxPrice('');
    setMinRam('');
    setSortBy('price_asc');
    setPage(1);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      
      {/* Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-[#202632]">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Hardware Catalogue
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Search and inspect 984,000+ unique physical configurations indexed from the dataset.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <form onSubmit={handleSearchSubmit} className="p-4 rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by CPU (e.g. Ryzen 7, i5-13500) or GPU (e.g. RTX 4070)..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Filter
            </button>
            {(query || minPrice || maxPrice || minRam || deviceType !== 'All') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-[#202632] transition-colors cursor-pointer flex items-center gap-1.5"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter controls row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100 dark:border-[#202632] text-xs">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Form Factor</label>
            <select
              value={deviceType}
              onChange={(e) => { setDeviceType(e.target.value); setPage(1); }}
              className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="All">All Form Factors</option>
              <option value="Desktop">Desktop PC</option>
              <option value="Laptop">Laptop</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Min Price (₹)</label>
            <input
              type="number"
              placeholder="Min ₹"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Max Price (₹)</label>
            <input
              type="number"
              placeholder="Max ₹"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Min RAM</label>
            <select
              value={minRam}
              onChange={(e) => { setMinRam(e.target.value); setPage(1); }}
              className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="">Any RAM</option>
              <option value="16">16 GB+</option>
              <option value="32">32 GB+</option>
              <option value="64">64 GB+</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-[#202632] bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="performance">Compute Score</option>
              <option value="value">Value-to-Price Index</option>
            </select>
          </div>
        </div>
      </form>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div>
          {loading ? (
            <span>Querying catalogue...</span>
          ) : data ? (
            <span>Showing {data.items.length} of {data.total.toLocaleString()} configurations</span>
          ) : null}
        </div>
        {data && data.total_pages > 0 && (
          <div className="font-mono text-[11px]">
            Page {data.page} of {data.total_pages}
          </div>
        )}
      </div>

      {/* Empty State when no results */}
      {data && data.items.length === 0 && !loading && (
        <EmptyState
          icon={Search}
          title="No configurations found"
          description="No hardware matches your active filters. Try clearing some criteria or expanding your price range."
          actionLabel="Reset All Filters"
          onAction={handleResetFilters}
        />
      )}

      {/* Catalogue Table */}
      {data && data.items.length > 0 && (
        <div className="rounded-xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#202632] bg-slate-50/50 dark:bg-white/5 text-slate-500 font-semibold">
                  <th className="p-3">Type</th>
                  <th className="p-3">Processor</th>
                  <th className="p-3">Graphics</th>
                  <th className="p-3">RAM</th>
                  <th className="p-3">Storage</th>
                  <th className="p-3 font-mono">Price (INR)</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#202632]">
                {data.items.map((item) => (
                  <tr 
                    key={item.id} 
                    onClick={() => setSelectedItem(item)}
                    className="hover:bg-slate-50/70 dark:hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <td className="p-3 text-slate-500">
                      <span className="flex items-center gap-1">
                        {item.device_type === 'Laptop' ? <Laptop className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
                        <span className="text-[11px]">{item.device_type}</span>
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-900 dark:text-white max-w-[200px] truncate" title={item.cpu}>
                      {item.cpu}
                      <span className="text-[10px] text-slate-400 block">{item.cores} Cores</span>
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300 max-w-[200px] truncate" title={item.graphics}>
                      {item.graphics}
                      <span className="text-[10px] text-slate-400 block">{item.vram_gb} GB VRAM</span>
                    </td>
                    <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                      {item.ram_gb} GB
                    </td>
                    <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                      {item.ssd_gb} GB
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                      ₹{item.price.toLocaleString()}
                    </td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onAnalyzeConfig({
                            cpu: item.cpu,
                            ram_gb: item.ram_gb,
                            ssd_gb: item.ssd_gb,
                            graphics: item.graphics,
                            price_inr: item.price,
                            device_type: item.device_type
                          })}
                          className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          Analyze
                        </button>
                        <button
                          onClick={() => {
                            onAddToCompare({
                              cpu: item.cpu,
                              ram_gb: item.ram_gb,
                              ssd_gb: item.ssd_gb,
                              graphics: item.graphics,
                              price_inr: item.price,
                              device_type: item.device_type
                            });
                            setToast({
                              id: String(Date.now()),
                              type: 'success',
                              text: 'Added build to comparison matrix.'
                            });
                          }}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                          title="Add to Compare"
                        >
                          <GitCompare className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-[#202632] disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Page {page} of {data.total_pages}
          </span>
          <button
            onClick={() => setPage(Math.min(data.total_pages, page + 1))}
            disabled={page === data.total_pages}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-[#202632] disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
            aria-label="Next Page"
          >
            <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      )}

      {/* Hardware Detail Modal Sheet */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-white dark:bg-[#11141A] border border-slate-200 dark:border-[#202632] shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#202632]">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Configuration Detail
                </span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white mt-0.5">
                  {selectedItem.cpu} Build
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-[#202632]">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Form Factor</span>
                <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">{selectedItem.device_type}</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-[#202632]">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Retail Price</span>
                <span className="font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">₹{selectedItem.price.toLocaleString()}</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-[#202632] col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Processor</span>
                <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">{selectedItem.cpu}</span>
                <span className="text-[11px] text-slate-500">{selectedItem.cores} Cores</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-[#202632] col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Graphics Card</span>
                <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">{selectedItem.graphics}</span>
                <span className="text-[11px] text-slate-500">{selectedItem.vram_gb} GB VRAM</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-[#202632]">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">RAM Memory</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5 block">{selectedItem.ram_gb} GB {selectedItem.ram_type}</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-[#202632]">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">SSD Storage</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5 block">{selectedItem.ssd_gb} GB</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#202632]">
              <button
                onClick={() => {
                  onAddToCompare({
                    cpu: selectedItem.cpu,
                    ram_gb: selectedItem.ram_gb,
                    ssd_gb: selectedItem.ssd_gb,
                    graphics: selectedItem.graphics,
                    price_inr: selectedItem.price,
                    device_type: selectedItem.device_type
                  });
                  setSelectedItem(null);
                  setToast({
                    id: String(Date.now()),
                    type: 'success',
                    text: 'Build sent to comparison matrix.'
                  });
                }}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 cursor-pointer"
              >
                Send to Compare
              </button>

              <button
                onClick={() => {
                  onAnalyzeConfig({
                    cpu: selectedItem.cpu,
                    ram_gb: selectedItem.ram_gb,
                    ssd_gb: selectedItem.ssd_gb,
                    graphics: selectedItem.graphics,
                    price_inr: selectedItem.price,
                    device_type: selectedItem.device_type
                  });
                  setSelectedItem(null);
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
              >
                Inspect in Analyzer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
