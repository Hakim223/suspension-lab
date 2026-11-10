import { useState } from 'react';
import { Award, CircleCheck, CircleX, RefreshCw } from 'lucide-react';
import type { QuizQuestion } from '@suspension-lab/shared';
import { cx } from '../../components/ui/primitives';

export function Quiz({ questions }: { questions: QuizQuestion[] }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const done = index >= questions.length;

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="panel p-6 text-center" data-testid="quiz-result">
        <Award size={44} className="mx-auto text-accent" />
        <h2 className="mt-3 text-[24px] font-bold">Skor Anda: {score} / {questions.length}</h2>
        <p className="mt-2 text-[16px] text-ink-2">
          {pct >= 80 ? 'Luar biasa! Anda memahami dasar-dasar suspensi dengan baik.' : pct >= 50 ? 'Bagus! Jelajahi model 3D untuk memperdalam pemahaman.' : 'Tidak apa-apa — coba jelajahi model 3D lalu ulangi kuisnya.'}
        </p>
        <button className="btn btn-primary mt-6" onClick={() => { setIndex(0); setPicked(null); setScore(0); }}>
          <RefreshCw size={18} /> Ulangi kuis
        </button>
      </div>
    );
  }

  const q = questions[index]!;
  const answered = picked !== null;
  return (
    <div className="panel p-5 sm:p-6" data-testid="quiz-question">
      <div className="flex items-center justify-between text-[13px] text-muted">
        <span>Pertanyaan {index + 1} dari {questions.length}</span>
        <span>Skor: {score}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-line"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(index / questions.length) * 100}%` }} /></div>
      <h2 className="mt-5 text-[20px] font-semibold leading-snug">{q.question}</h2>
      <ul className="mt-4 space-y-2">
        {q.options.map((o, i) => {
          const correct = i === q.answerIndex;
          const chosen = picked === i;
          return (
            <li key={i}>
              <button
                type="button"
                disabled={answered}
                onClick={() => { setPicked(i); if (correct) setScore((s) => s + 1); }}
                className={cx(
                  'w-full min-h-12 rounded-xl border px-4 py-2.5 text-left text-[15.5px] transition-colors flex items-center justify-between gap-3',
                  !answered && 'border-line-strong hover:border-accent/60 hover:bg-panel-2',
                  answered && correct && 'border-ok bg-ok/10',
                  answered && chosen && !correct && 'border-danger bg-danger/10',
                  answered && !chosen && !correct && 'border-line opacity-60',
                )}
                data-testid={`quiz-option-${i}`}
              >
                <span>{o}</span>
                {answered && correct && <CircleCheck size={20} className="text-ok shrink-0" />}
                {answered && chosen && !correct && <CircleX size={20} className="text-danger shrink-0" />}
              </button>
            </li>
          );
        })}
      </ul>
      {answered && (
        <div className="mt-4 rounded-xl border border-line-strong bg-panel-2 p-4 text-[15px] leading-relaxed text-ink-2" role="status">
          <b className={picked === q.answerIndex ? 'text-ok' : 'text-danger'}>{picked === q.answerIndex ? 'Benar. ' : 'Kurang tepat. '}</b>
          {q.explanation}
        </div>
      )}
      <div className="mt-5 flex justify-end">
        <button className="btn btn-primary" disabled={!answered} onClick={() => { setIndex((i) => i + 1); setPicked(null); }} data-testid="quiz-next">
          {index + 1 === questions.length ? 'Lihat hasil' : 'Berikutnya'}
        </button>
      </div>
    </div>
  );
}
