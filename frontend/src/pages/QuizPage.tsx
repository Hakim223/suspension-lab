import { quiz } from '@suspension-lab/shared';
import { TopBar } from '../components/layout/TopBar';
import { Quiz } from '../features/quiz/Quiz';

export default function QuizPage() {
  return (
    <div className="min-h-dvh flex flex-col">
      <TopBar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
        <h1 className="text-[30px] font-bold tracking-tight">Kuis Suspensi</h1>
        <p className="mt-2 mb-6 text-[16px] text-ink-2">Opsional, tanpa pendaftaran. Jawaban tidak disimpan.</p>
        <Quiz questions={quiz} />
      </main>
    </div>
  );
}
