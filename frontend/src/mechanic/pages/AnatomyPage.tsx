import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { MechHeading, MechPage } from '../components/MechLayout';
import { FailureDetail, SeverityBadge } from '../components/FailureDetail';
import { ANATOMY_MODELS, anatomyFailures, partDescription } from '../anatomy/models';
import { useMechanic, type AnatomyView } from '../state/mechanicStore';
import { isWebGLAvailable } from '../../three/webgl';
import { Notice, Segmented, cx } from '../../components/ui/primitives';
import { LoadingOverlay } from '../../components/viewer/ViewerHost';

const AnatomyViewer = lazy(() => import('../anatomy/AnatomyViewer'));

const VIEWS: Array<{ value: AnatomyView; label: string }> = [
  { value: 'assembled', label: 'Rakitan' },
  { value: 'exploded', label: 'Urai' },
  { value: 'cutaway', label: 'Potongan' },
];

export default function AnatomyPage() {
  const { anatomyId } = useParams();
  const nav = useNavigate();
  const st = useMechanic();
  const model = ANATOMY_MODELS.find((m) => m.id === (anatomyId ?? st.anatomyId)) ?? ANATOMY_MODELS[0]!;
  const [playing, setPlaying] = useState(true);
  const failures = useMemo(() => anatomyFailures(model), [model]);
  const failure = failures.find((f) => f.id === st.anatomyFailureId) ?? null;
  const visual = failure ? model.failures[failure.id] ?? null : null;
  const part = model.parts.find((p) => p.id === st.anatomyPartId) ?? null;

  useEffect(() => {
    if (model.id !== st.anatomyId) st.setAnatomy({ anatomyId: model.id, anatomyFailureId: null, anatomyPartId: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.id]);

  return (
    <MechPage testId="anatomy-page">
      <main className="mx-auto w-full max-w-[1500px] flex-1 px-3 sm:px-5 py-5">
        <div className="font-mono text-[11px] tracking-[0.2em] text-mech">M3 · ANATOMI KOMPONEN</div>
        <h1 className="text-[24px] font-bold">{model.name}</h1>
        <div className="mt-3 flex gap-1.5 overflow-x-auto scroll-thin pb-1" role="tablist" aria-label="Pilih komponen">
          {ANATOMY_MODELS.map((m) => (
            <button key={m.id} role="tab" aria-selected={m.id === model.id} onClick={() => nav(`/mechanic/anatomi/${m.id}`)} data-testid={`anatomy-${m.id}`}
              className={cx('shrink-0 rounded-lg border px-3 min-h-10 text-[13.5px]', m.id === model.id ? 'border-mech bg-mech/10 text-mech font-semibold' : 'border-line text-ink-2 hover:bg-panel-2')}>
              {m.name}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_400px]">
          <section className="min-w-0">
            <div className="panel relative overflow-hidden h-[52vh] min-h-[340px]" data-testid="anatomy-viewport">
              {isWebGLAvailable() ? (
                <Suspense fallback={<LoadingOverlay label="Memuat model anatomi…" />}>
                  <AnatomyViewer key={model.id} model={model} view={st.anatomyView} failure={visual} selectedPart={st.anatomyPartId} playing={playing}
                    onPick={(id) => st.setAnatomy({ anatomyPartId: id })} />
                </Suspense>
              ) : (
                <div className="p-5"><Notice>WebGL tidak tersedia — daftar bagian dan penjelasan di samping tetap dapat digunakan.</Notice></div>
              )}
              <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-line bg-bg/85 px-2.5 py-1 text-[12px] text-ink-2">
                Visualisasi teknis disederhanakan — bukan CAD
              </div>
              {visual && (
                <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-lg border border-danger/50 bg-bg/90 px-3 py-2 text-[12.5px] text-ink" data-testid="anatomy-failure-note">
                  <b className="text-danger">Visual kegagalan:</b> {visual.note}
                </div>
              )}
            </div>
            <div className="panel mt-3 flex flex-wrap items-center gap-2 p-3">
              <Segmented ariaLabel="Mode tampilan anatomi" value={st.anatomyView} onChange={(v) => st.setAnatomy({ anatomyView: v })} options={VIEWS} />
              <button type="button" className="btn" onClick={() => setPlaying(!playing)} data-testid="anatomy-play">{playing ? <Pause size={17} /> : <Play size={17} />}{playing ? 'Jeda gerak' : 'Gerakkan'}</button>
              <button type="button" className="btn" onClick={() => st.setAnatomy({ anatomyFailureId: null, anatomyPartId: null, anatomyView: 'assembled' })} data-testid="anatomy-reset"><RotateCcw size={17} /> Reset</button>
              {failure && (
                <Segmented ariaLabel="Bandingkan" size="sm" value="failed" onChange={(v) => v === 'normal' && st.setAnatomy({ anatomyFailureId: null })} options={[{ value: 'normal', label: 'Normal' }, { value: 'failed', label: 'Gagal' }]} />
              )}
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{model.description} <span className="text-ink-2">Penyederhanaan:</span> {model.simplification}</p>
          </section>

          <aside className="panel p-4 lg:max-h-[calc(100dvh-180px)] lg:overflow-y-auto scroll-thin" data-testid="anatomy-info">
            <MechHeading code="PRT">Bagian ({model.parts.length})</MechHeading>
            <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1">
              {model.parts.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => st.setAnatomy({ anatomyPartId: st.anatomyPartId === p.id ? null : p.id })} aria-pressed={st.anatomyPartId === p.id} data-testid={`part-${p.id}`}
                    className={cx('w-full rounded-lg px-2.5 min-h-9 text-left text-[13.5px]', st.anatomyPartId === p.id ? 'bg-mech/10 text-mech font-semibold' : 'text-ink-2 hover:bg-panel-2')}>
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
            {part && (
              <div className="mt-3 rounded-xl border border-mech/30 bg-mech/5 p-3 text-[13.5px] text-ink-2" data-testid="part-detail">
                <div className="font-semibold text-ink">{part.name}</div>
                <div className="mt-1">{partDescription(model, part) ?? 'Bagian konteks untuk menunjukkan pemasangan.'}</div>
              </div>
            )}
            <div className="mt-5"><MechHeading code="FMEA">Mode kegagalan ({failures.length})</MechHeading></div>
            <ul className="mt-2 space-y-1">
              {failures.map((f) => (
                <li key={f.id}>
                  <button type="button" onClick={() => st.setAnatomy({ anatomyFailureId: st.anatomyFailureId === f.id ? null : f.id, anatomyView: st.anatomyView === 'exploded' ? 'cutaway' : st.anatomyView })} aria-pressed={st.anatomyFailureId === f.id} data-testid={`anatomy-failure-${f.id}`}
                    className={cx('flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[13.5px]', st.anatomyFailureId === f.id ? 'border-mech bg-mech/10' : 'border-transparent hover:bg-panel-2')}>
                    <span>{f.name}</span><SeverityBadge s={f.severity} />
                  </button>
                </li>
              ))}
            </ul>
            {failure && <div className="mt-5"><FailureDetail failure={failure} /></div>}
            <div className="mt-5 text-[13px]"><Link to="/mechanic/arsitektur" className="text-mech">→ Lihat komponen pada arsitektur 3D</Link></div>
          </aside>
        </div>
      </main>
    </MechPage>
  );
}
