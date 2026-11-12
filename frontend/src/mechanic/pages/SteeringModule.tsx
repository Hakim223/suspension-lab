import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Box, Pause, Play, RotateCcw } from 'lucide-react';
import { MechHeading, MechPage } from '../components/MechLayout';
import { DomainBadge, FailureDetail, SeverityBadge } from '../components/FailureDetail';
import { STEERING_SYSTEMS } from '../data';
import type { SteeringFailure, SteeringFaultModel, SteeringSystemId } from '../data/types';
import { useMechanic } from '../state/mechanicStore';
import { applyBacklash, solveSteering, torqueCurve, MAX_SW_DEG } from '../steering/steeringModel';
import { SteeringSchematic, TorqueChart } from '../steering/SteeringSchematic';
import { BulletList, Notice, Section, Segmented, cx } from '../../components/ui/primitives';
import { hasAnatomy } from '../anatomy/catalog';
import { useLab } from '../../state/labStore';

const NORMAL: SteeringFaultModel = {};

const Detail = memo(function Detail({ failure, subName }: { failure: SteeringFailure; subName?: string }) {
  return <FailureDetail failure={failure} domain={failure.domain} subcomponentName={subName} />;
});

export default function SteeringModule() {
  const { systemId } = useParams();
  const nav = useNavigate();
  const st = useMechanic();
  const system = STEERING_SYSTEMS.find((s) => s.id === (systemId ?? st.steeringSystem)) ?? STEERING_SYSTEMS[0]!;
  const [sw, setSw] = useState(0);
  const [auto, setAuto] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [rpm, setRpm] = useState(750);
  const [view, setView] = useState<'normal' | 'failed'>('failed');
  const [flowPhase, setFlowPhase] = useState(0);
  const pinionRef = useRef(0);
  const dirRef = useRef<1 | -1>(1);
  const prevSw = useRef(0);

  useEffect(() => {
    if (systemId && systemId !== st.steeringSystem) st.setSteering({ steeringSystem: systemId as SteeringSystemId, steeringPartId: null, steeringFailureId: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemId]);

  const part = system.parts.find((p) => p.id === st.steeringPartId) ?? null;
  const failure = part?.failureModes.find((f) => f.id === st.steeringFailureId) ?? null;
  const fault = failure && view === 'failed' ? failure.model : NORMAL;

  // Auto sweep: steering wheel moves lock-to-lock slowly; pump/flow phase animates.
  useEffect(() => {
    if (!auto) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      setSw(Math.sin(t * 0.55) * MAX_SW_DEG * 0.85);
      setFlowPhase((p) => (p + 0.016) % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [auto]);

  // Direction & backlash (free play) between steering wheel and pinion.
  if (sw !== prevSw.current) {
    const growing = Math.abs(sw) > Math.abs(prevSw.current);
    dirRef.current = growing ? 1 : -1;
    pinionRef.current = applyBacklash(pinionRef.current, sw, fault.freePlayDeg ?? 0);
    prevSw.current = sw;
  }
  const pinionDeg = (fault.freePlayDeg ?? 0) > 0 ? pinionRef.current : sw;

  const base = { system: system.id, speedKmh: speed, rpm };
  const outFailed = solveSteering({ ...base, swDeg: pinionDeg, direction: dirRef.current, fault });
  const outNormal = solveSteering({ ...base, swDeg: sw, direction: dirRef.current, fault: NORMAL });
  const curves = useMemo(
    () => ({ normal: torqueCurve({ ...base, fault: NORMAL }), failed: torqueCurve({ ...base, fault: failure?.model ?? NORMAL }) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [system.id, speed, rpm, failure],
  );

  // Schematic id → part (across all systems so clicks on shared hardware still work).
  const schematicMap = useMemo(() => {
    const map = new Map<string, { sys: SteeringSystemId; partId: string }>();
    for (const s of STEERING_SYSTEMS) for (const p of s.parts) if (p.schematic && (s.id === system.id || !map.has(p.schematic))) map.set(p.schematic, { sys: s.id, partId: p.id });
    return map;
  }, [system.id]);

  const selectPart = (partId: string | null, sys: SteeringSystemId = system.id) => {
    if (sys !== system.id) nav(`/mechanic/kemudi/${sys}`);
    st.setSteering({ steeringSystem: sys, steeringPartId: partId, steeringFailureId: null });
  };
  const failedIds = failure && part?.schematic && view === 'failed' ? [part.schematic] : [];
  const noise = view === 'failed' ? failure?.model.noise : undefined;

  const metric = (label: string, a: string, b: string, testId?: string) => (
    <div className="rounded-lg border border-line bg-bg/50 px-3 py-2" data-testid={testId}>
      <div className="text-[11.5px] text-muted">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-2 font-mono">
        <span className="text-[16px] text-mech">{a}</span>
        {failure && <span className="text-[12px] text-ok">normal {b}</span>}
      </div>
    </div>
  );

  return (
    <MechPage testId="steering-module">
      <main className="mx-auto w-full max-w-[1500px] flex-1 px-3 sm:px-5 py-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[11px] tracking-[0.2em] text-mech">M2 · SISTEM KEMUDI</div>
            <h1 className="text-[24px] font-bold">{system.name}</h1>
          </div>
          <div role="tablist" className="flex gap-1 rounded-xl border border-line bg-bg/60 p-1">
            {STEERING_SYSTEMS.map((s) => (
              <button key={s.id} role="tab" aria-selected={s.id === system.id} onClick={() => selectPart(null, s.id)} data-testid={`steer-${s.id}`}
                className={cx('rounded-lg px-3 min-h-10 text-[13.5px] font-semibold', s.id === system.id ? 'bg-mech text-[#1c1300]' : 'text-ink-2')}>
                {s.id === 'mechanical' ? 'Rack & Pinion' : s.id === 'hps' ? 'HPS' : 'EPS'}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 max-w-4xl text-[14.5px] text-ink-2">{system.summary}</p>

        <div className="mt-5 grid gap-4 lg:grid-cols-[280px_1fr] xl:grid-cols-[280px_1fr_400px]">
          {/* Parts & failures */}
          <aside className="panel p-3 lg:max-h-[calc(100dvh-210px)] lg:overflow-y-auto scroll-thin" data-testid="steering-parts">
            <MechHeading code="PRT">Komponen & kegagalan</MechHeading>
            <ul className="mt-2 space-y-1">
              {system.parts.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => selectPart(part?.id === p.id ? null : p.id)} aria-expanded={part?.id === p.id} data-testid={`steer-part-${p.id}`}
                    className={cx('w-full rounded-lg px-2.5 min-h-10 text-left text-[14px]', part?.id === p.id ? 'bg-mech/10 text-ink font-semibold' : 'text-ink-2 hover:bg-panel-2')}>
                    {p.name}<span className="ml-1.5 font-mono text-[10.5px] text-muted">{p.failureModes.length}</span>
                  </button>
                  {part?.id === p.id && (
                    <ul className="ml-2 mt-1 space-y-1 border-l border-line pl-2">
                      {p.failureModes.map((f) => (
                        <li key={f.id}>
                          <button type="button" onClick={() => { st.setSteering({ steeringFailureId: f.id }); setView('failed'); }} aria-pressed={st.steeringFailureId === f.id} data-testid={`steer-failure-${f.id}`}
                            className={cx('w-full rounded-lg border px-2 py-1.5 text-left text-[13px]', st.steeringFailureId === f.id ? 'border-mech bg-mech/10' : 'border-transparent hover:bg-panel-2')}>
                            <span className="block">{f.name}</span>
                            <span className="mt-1 flex flex-wrap gap-1"><DomainBadge d={f.domain} /><SeverityBadge s={f.severity} /></span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </aside>

          {/* Schematic + controls */}
          <section className="min-w-0">
            <div className="panel overflow-hidden">
              <div className="aspect-[800/470] w-full">
                <SteeringSchematic system={system.id} epsVariant={st.epsVariant} swDeg={sw} pinionDeg={view === 'failed' ? pinionDeg : sw} out={view === 'failed' ? outFailed : outNormal}
                  failedIds={failedIds} selectedId={part?.schematic ?? null} flowPhase={flowPhase} noise={noise}
                  onPick={(id) => { const t = schematicMap.get(id); if (t) selectPart(t.partId, t.sys); }} />
              </div>
            </div>
            <div className="panel mt-3 p-3" data-testid="steering-controls">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className={cx('btn', auto ? '' : 'btn-primary')} onClick={() => setAuto(!auto)} data-testid="steer-auto">{auto ? <Pause size={17} /> : <Play size={17} />}{auto ? 'Jeda' : 'Putar setir otomatis'}</button>
                <button type="button" className="btn" onClick={() => { setAuto(false); setSw(0); pinionRef.current = 0; st.setSteering({ steeringFailureId: null }); }} data-testid="steer-reset"><RotateCcw size={17} /> Reset</button>
                {failure && (
                  <Segmented ariaLabel="Bandingkan" size="sm" value={view} onChange={setView} options={[{ value: 'normal', label: 'Normal' }, { value: 'failed', label: 'Gagal' }]} />
                )}
                {system.id === 'hps' && (
                  <Segmented ariaLabel="Putaran mesin" size="sm" value={rpm === 750 ? 'idle' : 'high'} onChange={(v) => setRpm(v === 'idle' ? 750 : 2000)} options={[{ value: 'idle', label: 'Idle 750 rpm' }, { value: 'high', label: '2000 rpm' }]} />
                )}
                {system.id === 'eps' && system.variants && (
                  <Segmented ariaLabel="Tipe EPS" size="sm" value={String(st.epsVariant)} onChange={(v) => st.setSteering({ epsVariant: Number(v) })} options={system.variants.map((v, i) => ({ value: String(i), label: v.name.split(' ')[0]! }))} />
                )}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="flex justify-between text-[12.5px] text-muted"><span>Sudut setir</span><span className="font-mono text-ink">{sw.toFixed(0)}°</span></span>
                  <input type="range" className="range" min={-MAX_SW_DEG} max={MAX_SW_DEG} step={1} value={sw} onChange={(e) => { setAuto(false); setSw(Number(e.target.value)); }} aria-label="Sudut setir" data-testid="steer-angle" />
                </label>
                <label className="block">
                  <span className="flex justify-between text-[12.5px] text-muted"><span>Kecepatan kendaraan</span><span className="font-mono text-ink">{speed} km/jam</span></span>
                  <input type="range" className="range" min={0} max={120} step={5} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Kecepatan kendaraan" />
                </label>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {metric('Torsi pengemudi', `${outFailed.driverTorqueNm.toFixed(1)} Nm`, `${outNormal.driverTorqueNm.toFixed(1)} Nm`, 'metric-torque')}
                {metric('Porsi bantuan', `${Math.round(outFailed.assistShare * 100)}%`, `${Math.round(outNormal.assistShare * 100)}%`)}
                {metric('Gaya rack', `${(outFailed.rackLoadN / 1000).toFixed(2)} kN`, `${(outNormal.rackLoadN / 1000).toFixed(2)} kN`)}
                {speed < 15
                  ? metric('Self-centering', '—', 'naikkan kecepatan')
                  : metric('Self-centering', outFailed.centringN > 0 ? 'kembali' : 'tidak kembali', outNormal.centringN > 0 ? 'kembali' : 'tidak kembali', 'metric-centring')}
              </div>
              {Math.abs(outFailed.handsOffForceN) > 0 && view === 'failed' && (
                <p className="mt-2 text-[13px] text-warn" data-testid="pull-warning">Lepas tangan: sistem menghasilkan gaya ±{Math.abs(outFailed.handsOffForceN).toFixed(0)} N di rack → kendaraan cenderung menarik / menyetir sendiri.</p>
              )}
              <div className="mt-3 rounded-lg border border-line bg-bg/40 p-2"><TorqueChart normal={curves.normal} failed={curves.failed} current={{ sw: pinionDeg, t: outFailed.driverTorqueNm }} /></div>
              <p className="mt-2 text-[12px] leading-relaxed text-muted">Model kuasi-statis sederhana (beban scrub parkir, beban aligning, gesekan, kurva boost katup / peta bantuan EPS). Angka bersifat representatif untuk perbandingan normal vs gagal, bukan data kendaraan tertentu.</p>
            </div>
          </section>

          {/* Information */}
          <aside className="panel p-4 lg:col-span-2 xl:col-span-1 xl:max-h-[calc(100dvh-210px)] xl:overflow-y-auto scroll-thin" data-testid="steering-info">
            {failure ? (
              <>
                <Detail failure={failure} subName={part?.name} />
                {failure.sim && (
                  <Link to="/mechanic/arsitektur/macpherson" className="btn mt-4" data-testid="view-in-3d"
                    onClick={() => {
                      const mechId = part!.id === 'outer-tie-rod-end' ? 'outer-tie-rod-end' : part!.id === 'inner-tie-rod' ? 'inner-tie-rod' : part!.id === 'rack-mount-bushing' ? 'rack-mount-bushing' : 'rack-and-pinion';
                      useMechanic.getState().selectComponent(mechId);
                      useMechanic.getState().selectFailure(failure.id);
                      useLab.getState().select(mechId === 'rack-and-pinion' || mechId === 'rack-mount-bushing' ? 'rack-and-pinion' : 'tie-rod-end');
                    }}>
                    <Box size={17} /> Lihat efeknya pada suspensi 3D
                  </Link>
                )}
              </>
            ) : part ? (
              <article>
                <div className="font-mono text-[11.5px] text-muted">{part.term}</div>
                <h2 className="text-[20px] font-bold">{part.name}</h2>
                <Section title="Fungsi">{part.function}</Section>
                <Section title="Konstruksi">{part.construction}</Section>
                <p className="mt-4 text-[13.5px] text-muted">Pilih salah satu mode kegagalan di daftar untuk melihat efeknya pada skema dan grafik torsi.</p>
                {hasAnatomy(part.anatomy) && <Link className="btn mt-3" to={`/mechanic/anatomi/${part.anatomy}`}>Lihat anatomi</Link>}
              </article>
            ) : (
              <article>
                <MechHeading code="PRN">Prinsip kerja</MechHeading>
                <div className="mt-2 text-[14.5px] leading-relaxed text-ink-2"><BulletList items={system.principle} marker="num" /></div>
                {system.variants && (
                  <Section title="Varian EPS">
                    <ul className="space-y-2">
                      {system.variants.map((v) => (
                        <li key={v.name} className="rounded-lg border border-line p-2.5">
                          <div className="font-semibold text-ink">{v.name}</div>
                          <div className="text-[13.5px]">{v.description}</div>
                          <div className="mt-1 text-[12.5px]"><span className="text-ok">+</span> {v.pros} <span className="ml-1 text-danger">−</span> {v.cons}</div>
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
                {system.id === 'eps' && (
                  <div className="mt-4"><Notice>Kegagalan elektronik (sensor, ECU) biasanya disertai DTC dan lampu peringatan, dan sistem masuk mode aman (bantuan dikurangi/dimatikan). Kegagalan mekanis (worm gear, U-joint, binding) umumnya tanpa DTC dan terasa sebagai bunyi, kelonggaran atau titik berat.</Notice></div>
                )}
              </article>
            )}
          </aside>
        </div>
      </main>
    </MechPage>
  );
}
