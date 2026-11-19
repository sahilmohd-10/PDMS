# FRONTEND COMPLETION AUDIT — HIRS AI HARDWARE INTELLIGENCE PLATFORM

**Audit Date:** 2026-11-19  
**Auditor:** Principal Frontend Engineer, Senior React Architect & QA Lead  
**Application:** HIRS — Hardware Intelligence & Recommendation System  
**Framework:** React 19, TypeScript 5, Vite 8, Tailwind CSS v4, Lucide Icons  

---

## 1. Executive Summary

This comprehensive audit evaluates the existing HIRS frontend codebase, mapping every page, component, design token, API integration, and interactive element. 

The application architecture is functional, with a clean backend API (FastAPI) and an established LightGBM ML model. However, several pages require refinement, missing features (such as saved recommendations, custom dataset upload, configuration picker for comparison, and out-of-distribution alerts in the analyzer), responsive polish, accessibility enhancements, and elimination of lint warnings.

---

## 2. Inventory of Routes, Pages & Layout Components

| Route / Tab ID | Page Component | Status | Completeness |
| :--- | :--- | :--- | :---: |
| `dashboard` | `src/pages/Dashboard.tsx` | Functional | 80% |
| `recommendations` | `src/pages/Recommendations.tsx` | Functional | 90% |
| `analyzer` | `src/pages/Analyzer.tsx` | Functional | 85% |
| `comparison` | `src/pages/Comparison.tsx` | Functional | 75% |
| `catalogue` | `src/pages/HardwareCatalogue.tsx` | Functional | 80% |
| `validation` | `src/pages/DatasetValidation.tsx` | Functional | 85% |
| `model-performance`| `src/pages/ModelPerformance.tsx` | Functional | 85% |
| `settings` | `src/pages/Settings.tsx` | Functional | 80% |

### Layout & Global Components
- `src/components/layout/Navbar.tsx`: Minimal top bar with brand mark, breadcrumb navigation, "New Recommendation" action, and dark/light toggle.
- `src/components/layout/Sidebar.tsx`: Collapsible side navigation with WORKSPACE and SYSTEM sections.
- `src/App.tsx`: Top-level router state container managing tab switching, cross-page configuration transfers, and theme persistence.

---

## 3. Detailed Issue Classification

Issues are prioritized across four categories: **Critical**, **High**, **Medium**, and **Low**.

### [CRITICAL]
- None. The frontend compiles cleanly with Vite and connects directly to the live backend.

### [HIGH]
1. **[H-1] Missing Saved Recommendations Feature on Dashboard & Recommendations Page**:
   - *Description*: Phase 3 requires "Saved recommendations" on Dashboard. Currently, users can generate recommendations, but there is no mechanism to bookmark/save a recommendation to `localStorage` or view saved configurations on the Dashboard.
   - *Impact*: Incomplete user journey; users lose candidate builds upon page reload.
   - *Fix*: Implement a `SavedRecommendations` storage service and an interactive "Saved Builds" tab/card on the Dashboard with one-click reload into Analyzer or Compare. Add a "Save Configuration" toggle button on each recommendation card.

2. **[H-2] Dataset Validation Missing File Upload Capability**:
   - *Description*: Phase 3 requires "Dataset upload" on the Dataset Validation page. Currently, the page only triggers server-side validation of the existing `Dataset.csv`.
   - *Impact*: Incomplete feature requirement.
   - *Fix*: Implement an interactive drag-and-drop CSV/JSON upload card with file parsing, instant schema verification against the 6 required columns (`cpu`, `ram`, `rom_ssd`, `graphics`, `price`, `buy`), and batch validation via `/api/dataset/validate`.

3. **[H-3] Hardware Comparison Lacks Build Selector Modal / Catalogue Picker**:
   - *Description*: In `Comparison.tsx`, clicking "Add Configuration" appends a single hardcoded preset (`AMD Ryzen 5 7600X`).
   - *Impact*: Users cannot easily select arbitrary configurations from the catalogue or enter custom specs directly inside the comparison view.
   - *Fix*: Provide a configuration builder / preset selector modal that allows choosing from popular tiers or searching the catalogue.

4. **[H-4] Analyzer Lacks Explicit Out-of-Distribution (OOD) Warning & Alternative Recommendation**:
   - *Description*: The backend returns `is_out_of_distribution: bool`, but the UI does not highlight when a CPU/GPU is completely unrecognized. When a prediction is `NOT BUY`, the UI does not offer an alternative within budget.
   - *Impact*: Violates Phase 3 requirements ("Out-of-distribution warning", "Alternative recommendation").
   - *Fix*: Add an explicit amber OOD banner when `is_out_of_distribution === true`. When prediction is `NOT BUY`, display an "Alternative Recommendation" card with a button to query the recommendation engine within the same price point.

### [MEDIUM]
1. **[M-1] Empty States & Loading Skeletons Missing in Catalogue & Comparison**:
   - *Description*: If the catalogue search yields 0 items, a blank table appears without guidance. If comparison has 0 or 1 item, table rendering behavior is unguided.
   - *Fix*: Create dedicated `EmptyState` and `LoadingSkeleton` components.

2. **[M-2] Hardware Detail Inspection Modal Missing in Catalogue**:
   - *Description*: Catalogue rows display truncated names and lack an in-depth component breakdown sheet.
   - *Fix*: Add a slide-over / modal inspection panel when clicking any row in the catalogue.

3. **[M-3] Settings Page Lacks User Preferences & History Reset**:
   - *Description*: Settings page only toggles theme and tests API connection; lacks preferences (default budget, default form factor) and local data management (clearing evaluation history).
   - *Fix*: Add preference controls and storage management options.

4. **[M-4] React Hook & Lint Warnings (41 warnings in oxlint)**:
   - *Description*: Oxlint identifies unused imports (`Trophy`, `Sparkles`, `SettingsIcon`, `Database`), unused state variables, and unmemoized dependencies in `useEffect`.
   - *Fix*: Clean up all unused variables, fix hook dependencies, and remove dead code.

### [LOW]
1. **[L-1] Legacy Vite CSS File**:
   - *Description*: `frontend/src/App.css` contains unused boilerplate styles from the Vite template.
   - *Fix*: Remove `App.css`.

2. **[L-2] Mobile Table Horizontal Scroll Visual Indicator**:
   - *Description*: On screens <640px, tables scroll horizontally without a visual hint.
   - *Fix*: Add a subtle "Scroll horizontally to inspect full table" badge or shadow gradient.

---

## 4. Design System & Token Audit

- **Palette**: Deep graphite surfaces (`#11141A`, `#14171E`), dark app canvas (`#090B0E`), crisp white/light gray (`#F8FAFC`), electric blue accent (`#2563EB`, `#3B82F6`), restrained status colors (`#059669` BUY, `#DC2626` NOT BUY).
- **Typography**: Apple/Inter system font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Geist"`).
- **Borders & Radii**: Uniform `rounded-xl` and `rounded-lg` with subtle border contrast (`border-slate-200 dark:border-[#202632]`).
- **Removals Verified**: No generic sparkle icons, no "AI 2.0" tags, no decorative neon gradients, and no fake stats.

---

## 5. API Endpoint Integration Matrix

| Endpoint | Method | Service Method | UI Consumer | Status |
| :--- | :---: | :--- | :--- | :---: |
| `/health` | GET | `hirsApi.checkHealth` | Navbar, Settings | Verified |
| `/api/predict` | POST | `hirsApi.predictHardware` | Analyzer, Dashboard | Verified |
| `/api/recommend` | POST | `hirsApi.recommendHardware` | Recommendations, Analyzer | Verified |
| `/api/compare` | POST | `hirsApi.compareHardware` | Comparison | Verified |
| `/api/hardware/explore` | GET | `hirsApi.exploreHardware` | Hardware Catalogue | Verified |
| `/api/hardware/options` | GET | `hirsApi.getHardwareOptions` | Analyzer Form Datalists | Verified |
| `/api/dataset/summary` | GET | `hirsApi.getDatasetSummary` | Dashboard, Validation | Verified |
| `/api/dataset/validate` | POST | `hirsApi.validateDataset` | Dataset Validation | Verified |
| `/api/model/metrics` | GET | `hirsApi.getModelMetrics` | Model Performance | Verified |
| `/api/model/status` | GET | `hirsApi.getModelStatus` | Dashboard, Performance, Navbar | Verified |

---

## 6. Action Plan for Phase 2 – Phase 9

1. **Delete Dead Boilerplate**: Remove `frontend/src/App.css`.
2. **Build Shared UI Components**:
   - `src/components/ui/Toast.tsx` (success/notification feedback)
   - `src/components/ui/EmptyState.tsx` (accessible empty states)
   - `src/components/ui/Skeleton.tsx` (loading placeholders)
3. **Upgrade Dashboard**: Add Welcome intro banner (dismissible) and real Saved Recommendations list with delete and reload actions.
4. **Upgrade Smart Recommendations**: Add "Bookmark / Save Build" action with instant feedback.
5. **Upgrade BUY / NOT BUY Analyzer**: Add explicit OOD banner, Alternative Recommendation finder for NOT BUY verdicts, and input error boundaries.
6. **Upgrade Hardware Comparison**: Add "Select Build" modal allowing custom input or selection from catalogue/presets, plus strengths/weaknesses synthesis.
7. **Upgrade Hardware Catalogue**: Add empty search state with clear filters button, and an expandable Hardware Detail Drawer / Modal.
8. **Upgrade Dataset Validation**: Add drag-and-drop CSV/JSON upload card with client-side header and record validation.
9. **Upgrade Model Performance**: Add loading skeletons, model runtime metadata card (architecture, hyperparameters, features), and robust empty states.
10. **Upgrade Settings**: Add user preferences (default budget, device form factor), evaluation history clear tool, and official technical disclosure.
11. **Testing & Verification**: Run `oxlint`, `tsc -b`, `npm run build`, and execute all 5 End-to-End user journeys.
