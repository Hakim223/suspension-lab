import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CircleCheck, ShieldAlert } from 'lucide-react';
import { suspensions } from '@suspension-lab/shared';
import { MechHeading, MechPage } from '../components/MechLayout';
import { COMPLAINT_LABELS, DIAGNOSTIC_CASES, DIAGNOSTIC_PRINCIPLES } from '../data/diagnostics';
import { findSteeringPart, getMechComponent, type CauseCandidate, type ComplaintCategory, type DiagnosticCase } from '../data';
import { useMechanic } from '../state/mechanicStore';
import { BulletList, Notice, Section, cx } from '../../components/ui/primitives';

const STEPS = ['Keluhan', 'Hipotesis', 'Inspeksi', 'Temuan'] as const;

function refLink(c: CauseCandidate, d: DiagnosticCase): { to: string; onClick: () => void; label: string } | null {
  const mech = getMechComponent(c.ref);
  if (mech) {
    return {
      to: `/mechanic/arsitektur/${d.architecture}`,
      label: mech.name,
      onClick: () => {
        const s = useMechanic.getState();
        s.selectComponent(mech.id);
        if (c.failureId && mech.failureModes.some((f) => f.id === c.failureId)) s.selectFailure(c.failureId);
      },
    };
  }
  const sp = findSteeringPart(c.ref);
  if (sp) {
    return {
      to: `/mechanic/kemudi/${sp.system.id}`,
      label: sp.part.name,
      onClick: () => useMechanic.getState().setSteering({ steeringSystem: sp.system.id, steeringPartId: sp.part.id, steeringFailureId: c.failureId ?? null }),
    };
  }
  return null;
}

function CaseView({ d }: { d: DiagnosticCase }) {
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);
  useEffect(() => { setStep(0); setPicked(new Set()); setChecked(false); }, [d.id]);
  const arch = suspensions.find((s) => s.id === d.architecture)!;
  const toggle = (i: number) => setPicked((p) => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });

  return (
    <article data-testid="case-view">
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip !text-[11.5px] font-mono">{COMPLAINT_LABELS[d.category]}</span>
        <span className="chip !text-[11.5px]">{arch.name}</span>
      </div>
      <h2 className="mt-2 text-[22px] font-bold">{d.title}</h2>
      <ol className="mt-4 flex gap-1" aria-label="Langkah diagnosis">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <button type="button" onClick={() => setStep(i)} aria-current={step === i ? 'step' : undefined} data-testid={`step-${i}`}
              className={cx('w-full rounded-lg border px-2 min-h-10 text-[12.5px] font-semibold', step === i ? 'border-mech bg-mech/10 text-mech' : i < step ? 'border-line text-ink-2' : 'border-line text-muted')}>
              <span className="font-mono">{i + 1}</span> {s}
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-5">
        {step === 0 && (
          <div>
            <Section title="Kendaraan">{d.vehicle} · arsitektur {arch.name}</Section>
            <Section title="Keluhan pelanggan"><p className="text-[16px] italic text-ink">{d.complaint}</p></Section>
            <Section title="Kondisi saat gejala muncul"><BulletList items={d.conditions} /></Section>
            <p className="mt-4 text-[13.5px] text-muted">Sebelum melanjutkan: komponen apa saja yang dapat menghasilkan gejala ini? Apa yang perlu disingkirkan (ban, rem, driveline)?</p>
          </div>
        )}
        {step === 1 && (
          <div data-testid="hypotheses">
            <p className="text-[14px] text-ink-2">Pilih komponen yang menurut Anda perlu dicurigai, lalu periksa penalaran untuk setiap kemungkinan.</p>
            <ul className="mt-3 space-y-2">
              {d.possibleCauses.map((c, i) => {
                const link = refLink(c, d);
                return (
                  <li key={i} className={cx('rounded-xl border p-3', picked.has(i) ? 'border-mech/60 bg-mech/5' : 'border-line')}>
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <input type="checkbox" className="mt-1 h-4 w-4 accent-[#f5a524]" checked={picked.has(i)} onChange={() => toggle(i)} data-testid={`cause-${i}`} />
                      <span className="text-[15px] font-semibold">{c.label}</span>
                    </label>
                    {checked && (
                      <div className="mt-2 pl-6 text-[13.5px] text-ink-2">
                        {c.reasoning}
                        {link && <> · <Link to={link.to} onClick={link.onClick} className="text-mech">pelajari {link.label}</Link></>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <button type="button" className="btn btn-primary mt-3" onClick={() => setChecked(true)} disabled={picked.size === 0} data-testid="check-hypotheses">Periksa penalaran</button>
            {checked && (
              <div className="mt-3"><Notice>Semua kandidat di atas masuk akal untuk gejala ini — itulah sebabnya inspeksi fisik diperlukan. Lanjutkan ke prosedur inspeksi.</Notice></div>
            )}
          </div>
        )}
        {step === 2 && (
          <div>
            <Section title="Komponen yang diperiksa">
              <ul className="flex flex-wrap gap-1.5">
                {d.inspectComponents.map((id) => {
                  const name = getMechComponent(id)?.name ?? findSteeringPart(id)?.part.name ?? id;
                  return <li key={id} className="chip">{name}</li>;
                })}
              </ul>
            </Section>
            <Section title="Prosedur inspeksi"><BulletList items={d.procedure} marker="num" /></Section>
          </div>
        )}
        {step === 3 && (
          <div data-testid="findings">
            <Section title="Temuan yang diharapkan bila komponen bermasalah">
              <ul className="space-y-2">
                {d.expectedFindings.map((f) => (
                  <li key={f.component} className="rounded-lg border border-line p-2.5"><b className="text-ink">{f.component}:</b> {f.finding}</li>
                ))}
              </ul>
            </Section>
            <Section title="Penjelasan alternatif"><BulletList items={d.alternatives} /></Section>
            <Section title="Pembeda penting"><BulletList items={d.distinctions} /></Section>
            <Section title="Hasil pada kasus ini" icon={<CircleCheck size={15} />}>
              {d.resolution}
              {picked.size > 0 && (
                <p className="mt-2 text-[13px] text-muted">
                  Hipotesis Anda {d.possibleCauses.some((c, i) => c.confirmed && picked.has(i)) ? 'mencakup' : 'tidak mencakup'} penyebab yang ditemukan pada kasus ini.
                </p>
              )}
            </Section>
            <div className="mt-4"><Notice tone="warn" icon={<ShieldAlert size={16} className="text-warn" />}>Hasil ini contoh pembelajaran. Pada kendaraan nyata, kesimpulan hanya sah setelah inspeksi fisik dan, bila perlu, uji ulang setelah perbaikan.</Notice></div>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-between">
        <button type="button" className="btn" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> Sebelumnya</button>
        <button type="button" className="btn btn-primary" disabled={step === STEPS.length - 1} onClick={() => setStep(step + 1)} data-testid="next-step">Berikutnya <ArrowRight size={16} /></button>
      </div>
    </article>
  );
}

export default function DiagnosticsPage() {
  const { caseId } = useParams();
  const nav = useNavigate();
  const st = useMechanic();
  const [filter, setFilter] = useState<ComplaintCategory | 'all'>('all');
  const list = useMemo(() => DIAGNOSTIC_CASES.filter((c) => filter === 'all' || c.category === filter), [filter]);
  const current = DIAGNOSTIC_CASES.find((c) => c.id === (caseId ?? st.caseId)) ?? null;
  useEffect(() => { if (caseId) st.setCase(caseId); }, [caseId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MechPage testId="diagnostics-page">
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-3 sm:px-5 py-5">
        <div className="font-mono text-[11px] tracking-[0.2em] text-mech">M4 · LATIHAN DIAGNOSIS</div>
        <h1 className="text-[24px] font-bold">Dari keluhan ke prosedur inspeksi</h1>
        <p className="mt-1 max-w-3xl text-[14.5px] text-ink-2">Gejala tidak otomatis menunjukkan komponen yang rusak. Latih penalaran: kumpulkan kondisi, susun hipotesis, buktikan dengan inspeksi.</p>

        <div className="mt-5 grid gap-4 lg:grid-cols-[340px_1fr]">
          <aside className="panel p-3" data-testid="case-list">
            <label className="block">
              <span className="text-[12.5px] text-muted">Kategori keluhan</span>
              <select className="mt-1 w-full min-h-11 rounded-xl border border-line-strong bg-panel-2 px-3 text-[14px]" value={filter} onChange={(e) => setFilter(e.target.value as ComplaintCategory | 'all')} data-testid="case-filter">
                <option value="all">Semua ({DIAGNOSTIC_CASES.length})</option>
                {Object.entries(COMPLAINT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <ul className="mt-3 space-y-1">
              {list.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => nav(`/mechanic/diagnosis/${c.id}`)} aria-current={current?.id === c.id ? 'page' : undefined} data-testid={`case-${c.id}`}
                    className={cx('w-full rounded-lg px-3 py-2 text-left', current?.id === c.id ? 'bg-mech/10' : 'hover:bg-panel-2')}>
                    <div className={cx('text-[14px] font-semibold', current?.id === c.id && 'text-mech')}>{c.title}</div>
                    <div className="font-mono text-[11px] text-muted">{COMPLAINT_LABELS[c.category]} · {c.architecture}</div>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <section className="panel p-5 min-w-0">
            {current ? <CaseView d={current} /> : (
              <div>
                <MechHeading code="DX">Prinsip diagnosis</MechHeading>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {DIAGNOSTIC_PRINCIPLES.map((p) => (
                    <li key={p.title} className="rounded-xl border border-line p-3">
                      <div className="font-semibold">{p.title}</div>
                      <p className="mt-1 text-[13.5px] text-ink-2">{p.text}</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[14px] text-muted">Pilih kasus di daftar untuk mulai.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </MechPage>
  );
}
