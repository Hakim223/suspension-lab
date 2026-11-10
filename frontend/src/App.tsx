import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useContent } from './data/contentStore';
import { useKioskIdleReset } from './hooks/useKioskIdleReset';
import HomePage from './pages/HomePage';

const ExplorerPage = lazy(() => import('./pages/ExplorerPage'));
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

export function AppRoutes() {
  useKioskIdleReset();
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/jelajah" element={<Navigate to="/jelajah/macpherson" replace />} />
        <Route path="/jelajah/:suspensionId" element={<ExplorerPage />} />
        <Route path="/belajar" element={<LearnPage />} />
        <Route path="/kuis" element={<QuizPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  const load = useContent((s) => s.load);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
