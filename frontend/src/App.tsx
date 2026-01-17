import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/common/Layout';

// Eager load: Dashboard is the landing page
import DashboardPage from './pages/DashboardPage';

// Lazy load: Route-based code splitting for better initial bundle size
// LineagePage is especially important to lazy load due to heavy @xyflow/react + dagre deps (~130KB)
const CatalogPage = lazy(() => import('./pages/CatalogPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const LineagePage = lazy(() => import('./pages/LineagePage'));
const QualityPage = lazy(() => import('./pages/QualityPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));

// Loading fallback component for Suspense
function PageLoader() {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin mb-3" />
        <p className="text-slate-500 text-sm">Loading...</p>
      </div>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Dashboard is eagerly loaded for fast initial render */}
            <Route index element={<DashboardPage />} />
            {/* All other routes are lazy loaded with Suspense boundaries */}
            <Route path="catalog" element={<Suspense fallback={<PageLoader />}><CatalogPage /></Suspense>} />
            <Route path="catalog/:productUri" element={<Suspense fallback={<PageLoader />}><ProductDetailPage /></Suspense>} />
            <Route path="lineage" element={<Suspense fallback={<PageLoader />}><LineagePage /></Suspense>} />
            <Route path="quality" element={<Suspense fallback={<PageLoader />}><QualityPage /></Suspense>} />
            <Route path="register" element={<Suspense fallback={<PageLoader />}><RegisterPage /></Suspense>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
