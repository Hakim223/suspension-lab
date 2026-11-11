import { lazy, Suspense } from 'react';
import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useKioskIdleReset } from './hooks/useKioskIdleReset';
import { modeOfPath, useMode } from './state/modeStore';
import LandingPage from './pages/LandingPage';

const HomePage = lazy(() => import('./pages/HomePage'));
const ExplorerPage = lazy(() => import('./pages/ExplorerPage'));
const MechanicHome = lazy(() => import('./mechanic/pages/MechanicHome'));
const ArchitectureWorkbench = lazy(() => import('./mechanic/pages/ArchitectureWorkbench'));
const SteeringModule = lazy(() => import('./mechanic/pages/SteeringModule'));
const AnatomyPage = lazy(() => import('./mechanic/pages/AnatomyPage'));
const DiagnosticsPage = lazy(() => import('./mechanic/pages/DiagnosticsPage'));
const LearnPage = lazy(() => import('./pages/LearnPage'));
const QuizPage = lazy(() => import('./pages/QuizPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function PageFallback() {
  return (
    <div className="flex h-dvh items-center justify-center" role="status">
      <div className="h-10 w-10 rounded-full border-[3px] border-line-strong border-t-accent animate-spin" />
      <span className="sr-only">Memuat…</span>
    </div>
  );
}

/** Remembers the last location in each mode so the mode switch can return there. */
function useRememberMode() {
  const loc = useLocation();
  const remember = useMode((s) => s.remember);
  useEffect(() => {
    const m = modeOfPath(loc.pathname);
    if (m) remember(m, loc.pathname + loc.search);
  }, [loc.pathname, loc.search, remember]);
}

export function AppRoutes() {
  useKioskIdleReset();
  useRememberMode();
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        {/* Consumer Mode (existing experience, unchanged routes) */}
        <Route path="/consumer" element={<HomePage />} />
        <Route path="/jelajah" element={<Navigate to="/jelajah/macpherson" replace />} />
        <Route path="/jelajah/:suspensionId" element={<ExplorerPage />} />
        <Route path="/belajar" element={<LearnPage />} />
        <Route path="/kuis" element={<QuizPage />} />
        {/* Mechanic Mode */}
        <Route path="/mechanic" element={<MechanicHome />} />
        <Route path="/mechanic/arsitektur" element={<Navigate to="/mechanic/arsitektur/macpherson" replace />} />
        <Route path="/mechanic/arsitektur/:suspensionId" element={<ArchitectureWorkbench />} />
        <Route path="/mechanic/kemudi" element={<SteeringModule />} />
        <Route path="/mechanic/kemudi/:systemId" element={<SteeringModule />} />
        <Route path="/mechanic/anatomi" element={<AnatomyPage />} />
        <Route path="/mechanic/anatomi/:anatomyId" element={<AnatomyPage />} />
        <Route path="/mechanic/diagnosis" element={<DiagnosticsPage />} />
        <Route path="/mechanic/diagnosis/:caseId" element={<DiagnosticsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
