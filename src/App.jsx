import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import background from './assets/funspot-background.webp';
import { useImageReady } from './hooks/useImageReady';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingScreen from './components/common/LoadingScreen';
import SiteLayout from './components/layout/SiteLayout';
import Landing from './pages/Landing';
import NotFound from './pages/NotFound';
import GlobalAudioManager from './components/audio/GlobalAudioManager';

// Active game pages lazy-loaded to keep landing initial load fast
const DontLaugh = lazy(() => import('./pages/DontLaugh'));
const FaceOff = lazy(() => import('./pages/FaceOff'));
const LookALike = lazy(() => import('./pages/LookALike'));

export default function App() {
  const location = useLocation();
  const backgroundReady = useImageReady(background);

  if (!backgroundReady) return <LoadingScreen fullscreen />;

  // Re-key per top-level section so each page gets an entrance transition
  const section = location.pathname.split('/')[1] || 'home';

  return (
    <ErrorBoundary key={section}>
      <GlobalAudioManager />
      <Suspense fallback={<LoadingScreen fullscreen message="LOADING ARCADE..." />}>
        <div className="page-enter" key={section}>
          <Routes location={location}>
            <Route index element={<Landing />} />
            <Route element={<SiteLayout />}>
              {/* Exactly Three Active Game Modes */}
              <Route path="dont-laugh" element={<DontLaugh />} />
              <Route path="face-off" element={<FaceOff />} />
              <Route path="look-a-like" element={<LookALike />} />

              {/* Backward-compatibility Route Aliases */}
              <Route path="lookalike" element={<LookALike />} />
              <Route path="wrong-answers" element={<FaceOff />} />

              {/* AR Dance Floor Clean Redirects */}
              <Route path="ar-dance-floor" element={<Navigate to="/" replace />} />
              <Route path="dance-floor" element={<Navigate to="/" replace />} />
              <Route path="transform" element={<Navigate to="/" replace />} />
              <Route path="virtual-partner" element={<Navigate to="/" replace />} />

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </div>
      </Suspense>
    </ErrorBoundary>
  );
}
