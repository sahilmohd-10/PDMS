import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Recommendations } from './pages/Recommendations';
import { Analyzer } from './pages/Analyzer';
import { Comparison } from './pages/Comparison';
import { HardwareCatalogue } from './pages/HardwareCatalogue';
import { DatasetValidation } from './pages/DatasetValidation';
import { ModelPerformance } from './pages/ModelPerformance';
import { Settings } from './pages/Settings';
import type { PredictRequest } from './types';

export function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('hirs-dark-mode');
    return saved !== null ? saved === 'true' : true; // Default dark mode
  });

  // Default to Dashboard per instructions
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Cross-page state transfers
  const [analyzerConfig, setAnalyzerConfig] = useState<any>(null);
  const [compareQueue, setCompareQueue] = useState<PredictRequest[]>([]);

  // Dark mode effect
  useEffect(() => {
    localStorage.setItem('hirs-dark-mode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSendToAnalyzer = (config: any) => {
    setAnalyzerConfig(config);
    setActiveTab('analyzer');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddToCompare = (config: PredictRequest) => {
    if (compareQueue.length >= 4) {
      alert("Comparison matrix already has 4 builds. Opening comparison...");
    } else {
      setCompareQueue(prev => [...prev, config]);
    }
    setActiveTab('comparison');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRemoveFromCompare = (index: number) => {
    setCompareQueue(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={`min-h-screen flex flex-col bg-[#F7F8FA] dark:bg-[#0D0F12] text-slate-900 dark:text-slate-100 transition-colors duration-200 ${darkMode ? 'dark' : ''}`}>
      
      {/* Top Header */}
      <Navbar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        activeTab={activeTab}
        setActiveTab={handleNavigate}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        
        {/* Collapsible Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleNavigate}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          mobileOpen={mobileMenuOpen}
          setMobileOpen={setMobileMenuOpen}
        />

        {/* Dynamic Page Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <Dashboard 
              onNavigate={handleNavigate}
              onAnalyzeSample={handleSendToAnalyzer}
              onAddToCompare={handleAddToCompare}
            />
          )}

          {activeTab === 'recommendations' && (
            <Recommendations
              onAnalyzeConfig={handleSendToAnalyzer}
              onAddToCompare={handleAddToCompare}
            />
          )}

          {activeTab === 'analyzer' && (
            <Analyzer
              initialConfig={analyzerConfig}
              onAddToCompare={handleAddToCompare}
              onNavigateToRecommendations={(_budget) => {
                handleNavigate('recommendations');
              }}
            />
          )}

          {activeTab === 'comparison' && (
            <Comparison
              compareQueue={compareQueue}
              onRemoveFromQueue={handleRemoveFromCompare}
              onNavigateToCatalogue={() => handleNavigate('catalogue')}
            />
          )}

          {activeTab === 'catalogue' && (
            <HardwareCatalogue
              onAnalyzeConfig={handleSendToAnalyzer}
              onAddToCompare={handleAddToCompare}
            />
          )}

          {activeTab === 'validation' && (
            <DatasetValidation />
          )}

          {activeTab === 'model-performance' && (
            <ModelPerformance />
          )}

          {activeTab === 'settings' && (
            <Settings
              darkMode={darkMode}
              setDarkMode={setDarkMode}
            />
          )}
        </main>
      </div>

    </div>
  );
}

export default App;
