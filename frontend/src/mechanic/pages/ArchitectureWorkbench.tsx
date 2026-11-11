import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, FlaskConical, Info, Layers, ListTree, Play, RotateCcw, ScanLine } from 'lucide-react';
import type { DamageScenario, SuspensionId } from '@suspension-lab/shared';
import { suspensions } from '@suspension-lab/shared';
import { useSuspension, type ResolvedComponent } from '../../hooks/useSuspension';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useLab } from '../../state/labStore';
import { simClock } from '../../three/sim/clock';
import { ViewerHost } from '../../components/viewer/ViewerHost';
import { AnimationControls } from '../../components/simulation/AnimationControls';
import { BulletList, Notice, Section, Segmented, Sheet, cx } from '../../components/ui/primitives';
import { MechHeading, MechPage } from '../components/MechLayout';
import { FailureDetail, SeverityBadge } from '../components/FailureDetail';
import { ASSEMBLIES, getArchitecture, getMechComponent, type FailureMode, type MechComponent } from '../data';
import { useMechanic } from '../state/mechanicStore';
import { hasAnatomy } from '../anatomy/catalog';

type Tab = 'component' | 'failure' | 'architecture';
const TABS: Array<{ id: Tab; label: string; icon: typeof Info }> = [
  { id: 'component', label: 'Komponen', icon: Info },
  { id: 'failure', label: 'Kegagalan', icon: FlaskConical },
  { id: 'architecture', label: 'Arsitektur', icon: Layers },
];

/** Key used in the shared lab store for an active mechanic failure simulation. */
const simKey = (componentId: string, failureId: string) => `mech:${componentId}:${failureId}`;

export default function ArchitectureWorkbench() {
  const { suspensionId = 'macpherson' } = useParams();
  const nav = useNavigate();
  const arch = getArchitecture(suspensionId);
  const view = useSuspension(suspensionId);
  const m = useMechanic();
  const labSelected = useLab((s) => s.selectedComponentId);
  const damageView = useLab((s) => s.damageView);
  const intensity = useLab((s) => s.damageIntensity);
  const [tab, setTab] = useState<Tab>('component');
  const [sheet, setSheet] = useState<'none' | 'tree' | 'panel'>('none');
  const isPhone = useMediaQuery('(max-width: 639px)');
  const showLeft = useMediaQuery('(min-width: 1024px)');
  const showRight = useMediaQuery('(min-width: 768px)');

  // Components of this architecture, in hierarchy order.
  const archComponents = useMemo(() => {
    if (!arch) return [] as Array<{ c: MechComponent; role: string; note?: string }>;
    return arch.assemblies.flatMap((a) => a.components.map((r) => ({ c: getMechComponent(r.componentId)!, role: r.role, note: r.note })));
  }, [arch]);
  const model3dIds = useMemo(() => new Set(view?.components.map((c) => c.id) ?? []), [view]);

  // Entering an architecture: keep the shared session if it is the same one; drop foreign damage keys.
  useEffect(() => {
    const lab = useLab.getState();
    if (lab.enterSuspension(suspensionId)) simClock.reset();
    if (lab.damageScenarioId && !lab.damageScenarioId.startsWith('mech:')) lab.setDamageScenario(null);
    const mstate = useMechanic.getState();
    const current = mstate.componentId;
    if (current && !archComponents.some((x) => x.c.id === current)) mstate.selectComponent(null);
    else if (current) {
      // Restore the 3D selection (and the failure's animation mode) for the remembered component.
      const c = getMechComponent(current);
      if (c?.model3d && model3dIds.has(c.model3d) && lab.selectedComponentId !== c.model3d) lab.select(c.model3d);
      const f = c?.failureModes.find((x) => x.id === mstate.failureId);
      if (f?.sim && mstate.simActive) {
        lab.setMode(f.sim.mode === 'steer' && !view?.suspension.steerable ? 'bump' : f.sim.mode);
        lab.setPlaying(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suspensionId]);

  // 3D pick → mechanic component (prefer the current one if it maps to the same 3D part).
  useEffect(() => {
    const cur = getMechComponent(useMechanic.getState().componentId);
    if (!labSelected) return;
    if (cur?.model3d === labSelected) return;
    const match = archComponents.find((x) => x.c.model3d === labSelected || (labSelected === 'strut-assembly' && x.c.id === 'strut-assembly'));
    if (match) {
      useMechanic.getState().selectComponent(match.c.id);
      useLab.getState().setDamageScenario(null);
      setTab('component');
    }
  }, [labSelected, archComponents]);

  const component = getMechComponent(m.componentId);
  const archRef = archComponents.find((x) => x.c.id === component?.id);
  const failure = component?.failureModes.find((f) => f.id === m.failureId) ?? null;
  const simAvailable = !!(failure?.sim && component?.model3d && model3dIds.has(component.model3d));

  // Viewer labels use mechanic names for each 3D part present in this architecture.
  const viewerComponents: ResolvedComponent[] = useMemo(() => {
    if (!view) return [];
    return view.components.map((rc) => {
      const names = archComponents.filter((x) => x.c.model3d === rc.id).map((x) => x.c.name);
      return { ...rc, displayName: names.length ? [...new Set(names)].join(' / ') : rc.displayName };
    });
  }, [view, archComponents]);

  const damageScenario: DamageScenario | null = useMemo(() => {
    if (!component || !failure?.sim || !simAvailable || !m.simActive) return null;
    return {
      id: simKey(component.id, failure.id), componentId: component.model3d!, title: failure.name, shortTitle: failure.name,
      severity: failure.severity === 'rendah' ? 'sedang' : failure.severity === 'kritis' ? 'tinggi' : failure.severity,
      normalCondition: '', damagedCondition: '', failureDescription: failure.whatFails, symptoms: failure.symptoms,
      safetyImplications: [], inspection: failure.inspection,
      simulation: { kind: failure.sim.kind, params: failure.sim.params, recommendedMode: failure.sim.mode }, sortOrder: 0,
    };
  }, [component, failure, simAvailable, m.simActive]);

  // Keep the shared lab store in sync with the mechanic simulation state.
  useEffect(() => {
    const lab = useLab.getState();
    const key = damageScenario?.id ?? null;
    if (lab.damageScenarioId !== key) lab.setDamageScenario(key);
  }, [damageScenario]);

  if (!arch || !view) return <Navigate to="/mechanic/arsitektur/macpherson" replace />;
  const suspension = view.suspension;

  const pickComponent = (c: MechComponent) => {
    m.selectComponent(c.id);
    useLab.getState().select(c.model3d && model3dIds.has(c.model3d) ? c.model3d : null);
    setTab('component');
  };

  const pickFailure = (f: FailureMode) => {
    if (!component) return;
    m.selectFailure(f.id);
    setTab('failure');
    if (f.sim && component.model3d && model3dIds.has(component.model3d)) {
      const lab = useLab.getState();
      lab.setMode(f.sim.mode === 'steer' && !suspension.steerable ? 'bump' : f.sim.mode);
      lab.setPlaying(true);
      lab.focusSelection();
    }
  };

  const resetSim = () => {
    m.resetSimulation();
    const lab = useLab.getState();
    lab.setDamageScenario(null);
    lab.setPlaying(false);
    simClock.reset();
  };

  /* ---------------- panels ---------------- */

  const tree = (
    <div data-testid="hierarchy-tree">
      <MechHeading code="ARC">Arsitektur</MechHeading>
      <div className="mt-2 grid grid-cols-1 gap-1">
        {suspensions.map((s) => (
          <button key={s.id} type="button" onClick={() => { nav(`/mechanic/arsitektur/${s.id}`); setSheet('none'); }} aria-current={s.id === suspensionId ? 'page' : undefined} data-testid={`mech-arch-${s.id}`}
            className={cx('flex items-center justify-between rounded-lg border px-3 min-h-10 text-left text-[14px]', s.id === suspensionId ? 'border-mech/60 bg-mech/10 text-mech font-semibold' : 'border-transparent text-ink-2 hover:bg-panel-2')}>
            <span>{s.name}</span><span className="font-mono text-[10.5px] text-muted">{s.axlePosition === 'depan' ? 'FRT' : 'RR'}</span>
          </button>
        ))}
      </div>
      <div className="mt-5"><MechHeading code="TREE">Rakitan → Komponen → Subkomponen</MechHeading></div>
      <ul className="mt-2 space-y-3">
        {arch.assemblies.map((a) => (
          <li key={a.assembly}>
            <div className="font-mono text-[11px] uppercase tracking-wider text-mech/90">{ASSEMBLIES.find((x) => x.id === a.assembly)?.name}</div>
            <ul className="mt-1 space-y-0.5">
              {a.components.map((r) => {
                const c = getMechComponent(r.componentId)!;
                const open = c.id === component?.id;
                return (
                  <li key={c.id}>
                    <button type="button" onClick={() => pickComponent(c)} aria-expanded={open} data-testid={`tree-${c.id}`}
                      className={cx('flex w-full items-center gap-1.5 rounded-lg px-2 min-h-10 text-left text-[14px]', open ? 'bg-mech/10 text-ink font-semibold' : 'text-ink-2 hover:bg-panel-2')}>
                      {open ? <ChevronDown size={15} className="text-mech" /> : <ChevronRight size={15} className="text-muted" />}
                      <span className="flex-1">{c.name}</span>
                      {c.model3d && model3dIds.has(c.model3d) ? <span className="font-mono text-[10px] text-accent">3D</span> : <span className="font-mono text-[10px] text-muted">—</span>}
                    </button>
                    {open && (
                      <ul className="ml-5 mt-0.5 border-l border-line pl-2">
                        {c.subcomponents.map((sc) => (
                          <li key={sc.id}>
                            <button type="button" onClick={() => { m.selectSubcomponent(m.subcomponentId === sc.id ? null : sc.id); setTab('failure'); }} data-testid={`sub-${sc.id}`}
                              className={cx('w-full rounded-md px-2 min-h-8 text-left text-[13px]', m.subcomponentId === sc.id ? 'text-mech font-semibold' : 'text-muted hover:text-ink')}>
                              {sc.name}
                              <span className="ml-1 font-mono text-[10.5px] text-muted">({c.failureModes.filter((f) => f.subcomponentId === sc.id).length})</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );

  const componentTab = component ? (
    <article data-testid="mech-component-detail">
      <div className="font-mono text-[11.5px] text-muted">{component.term}</div>
      <h2 className="mt-0.5 text-[21px] font-bold">{component.name}</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-ink">{component.summary}</p>
      {archRef && (
        <div className="mt-3 rounded-xl border border-mech/30 bg-mech/5 px-3.5 py-2.5 text-[14px] text-ink-2">
          <span className="font-semibold text-mech">Pada {suspension.name}: </span>{archRef.role}{archRef.note && <span className="text-muted"> ({archRef.note})</span>}
        </div>
      )}
      {!(component.model3d && model3dIds.has(component.model3d)) && (
        <div className="mt-3"><Notice>Komponen ini tidak direpresentasikan pada model 3D arsitektur ini; gunakan deskripsi, anatomi, atau modul kemudi.</Notice></div>
      )}
      <div className="mt-4">
        <Section title="Fungsi">{component.function}</Section>
        {component.mounting && <Section title="Pemasangan & titik tumpu">{component.mounting}</Section>}
        {component.movement && <Section title="Gerakan">{component.movement}</Section>}
        <Section title={`Subkomponen (${component.subcomponents.length})`}>
          <ul className="space-y-2">
            {component.subcomponents.map((sc) => (
              <li key={sc.id} className="rounded-lg border border-line bg-bg/40 p-2.5">
                <button type="button" className="text-left" onClick={() => { m.selectSubcomponent(sc.id); setTab('failure'); }}>
                  <span className="font-semibold text-ink">{sc.name}</span>
                  {sc.term && <span className="ml-1.5 font-mono text-[11.5px] text-muted">{sc.term}</span>}
                </button>
                <div className="mt-0.5 text-[13.5px]">{sc.function}</div>
                {sc.construction && <div className="mt-0.5 font-mono text-[11.5px] text-muted">{sc.construction}</div>}
              </li>
            ))}
          </ul>
        </Section>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className="btn" onClick={() => setTab('failure')}><FlaskConical size={17} /> {component.failureModes.length} mode kegagalan</button>
        {hasAnatomy(component.anatomy) && (
          <Link className="btn" to={`/mechanic/anatomi/${component.anatomy}`} data-testid="open-anatomy"><ScanLine size={17} /> Lihat anatomi</Link>
        )}
        {component.assembly === 'steering-linkage' && <Link className="btn" to="/mechanic/kemudi">Modul kemudi</Link>}
      </div>
    </article>
  ) : (
    <div className="py-10 text-center text-[14.5px] text-muted" data-testid="mech-empty">Pilih komponen pada pohon hierarki atau ketuk bagian pada model 3D.</div>
  );

  const failures = component ? component.failureModes.filter((f) => !m.subcomponentId || f.subcomponentId === m.subcomponentId) : [];
  const subName = (id?: string) => component?.subcomponents.find((s) => s.id === id)?.name;

  const failureTab = component ? (
    <div data-testid="failure-panel">
      <MechHeading code="FMEA" right={m.subcomponentId ? <button className="text-[12.5px] text-mech" onClick={() => m.selectSubcomponent(null)}>Semua subkomponen</button> : null}>
        {component.name}{m.subcomponentId ? ` · ${subName(m.subcomponentId)}` : ''}
      </MechHeading>
      <ul className="mt-2 space-y-1.5" data-testid="failure-list">
        {failures.map((f) => (
          <li key={f.id}>
            <button type="button" onClick={() => pickFailure(f)} aria-pressed={m.failureId === f.id} data-testid={`failure-${f.id}`}
              className={cx('w-full rounded-xl border px-3 py-2 text-left', m.failureId === f.id ? 'border-mech bg-mech/10' : 'border-line hover:border-line-strong hover:bg-panel-2')}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[14.5px] font-semibold">{f.name}</span>
                <SeverityBadge s={f.severity} />
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 font-mono text-[11px] text-muted">
                {f.subcomponentId && <span>{subName(f.subcomponentId)}</span>}
                <span>{f.sim && component.model3d && model3dIds.has(component.model3d) ? 'SIM 3D' : 'PENJELASAN'}</span>
              </div>
            </button>
          </li>
        ))}
        {failures.length === 0 && <li className="text-[13.5px] text-muted">Tidak ada mode kegagalan untuk subkomponen ini.</li>}
      </ul>

      {failure && (
        <div className="mt-5">
          <div className="rounded-xl border border-line-strong bg-bg/60 p-3" data-testid="sim-controls">
            <MechHeading code="SIM">Kontrol simulasi</MechHeading>
            {simAvailable ? (
              <>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button type="button" className={cx('btn', m.simActive ? '' : 'btn-primary')} onClick={() => m.setSimActive(!m.simActive)} data-testid="toggle-sim">
                    <Play size={16} /> {m.simActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <Segmented ariaLabel="Bandingkan kondisi" size="sm" value={damageView} onChange={(v) => useLab.getState().setDamageView(v)}
                    options={[{ value: 'normal', label: 'Normal' }, { value: 'damaged', label: 'Gagal' }]} />
                  <button type="button" className="btn" onClick={resetSim} data-testid="reset-sim"><RotateCcw size={16} /> Reset</button>
                </div>
                <label className="mt-3 block">
                  <span className="flex justify-between text-[12.5px] text-muted"><span>Tingkat kegagalan</span><span className="font-mono text-ink">{Math.round(intensity * 100)}%</span></span>
                  <input type="range" className="range" min={0} max={1} step={0.05} value={intensity} onChange={(e) => useLab.getState().setDamageIntensity(Number(e.target.value))} aria-label="Tingkat kegagalan" />
                </label>
                <p className="mt-1 text-[12.5px] text-muted">Sisi kanan = kondisi gagal, sisi kiri = referensi normal. Besaran gerak diperbesar sesuai faktor visual pada parameter; arah dan jenis gerak sesuai mekanismenya.</p>
                {failure.sim?.kind === 'rack-backlash' && <p className="mt-1 text-[12.5px] text-warn">Kelonggaran rack/linkage memengaruhi kedua roda sekaligus.</p>}
              </>
            ) : (
              <p className="mt-2 text-[13.5px] text-ink-2" data-testid="no-sim-note">
                Kegagalan ini tidak menghasilkan perubahan geometri yang benar untuk ditampilkan pada model 3D arsitektur ini. Lihat penjelasan di bawah{component.anatomy ? ' dan modul Anatomi' : ''}.
              </p>
            )}
          </div>
          <div className="mt-4"><FailureDetail failure={failure} subcomponentName={subName(failure.subcomponentId)} /></div>
        </div>
      )}
    </div>
  ) : (
    <div className="py-10 text-center text-[14.5px] text-muted">Pilih komponen terlebih dahulu.</div>
  );

  const architectureTab = (
    <article data-testid="architecture-detail">
      <h2 className="text-[21px] font-bold">{suspension.name}</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-ink">{arch.layout}</p>
      <Section title="Jalur beban (load path)"><BulletList items={arch.loadPath} /></Section>
      <Section title="Kinematika (dan penyederhanaan model)"><BulletList items={arch.kinematics} /></Section>
      <Section title="Catatan servis"><BulletList items={arch.serviceNotes} /></Section>
    </article>
  );

  const body = tab === 'component' ? componentTab : tab === 'failure' ? failureTab : architectureTab;
  const tabBar = (
    <div role="tablist" className="flex gap-1 rounded-xl border border-line bg-bg/60 p-1">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} data-testid={`mtab-${id}`}
          className={cx('flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg min-h-10 text-[13.5px] font-medium', tab === id ? 'bg-panel-2 text-mech border border-line-strong' : 'text-ink-2')}>
          <Icon size={15} />{label}
        </button>
      ))}
    </div>
  );

  return (
    <MechPage scroll={false} testId="workbench">
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-rows-[minmax(0,1fr)_minmax(0,42%)] lg:grid-rows-1 lg:grid-cols-[290px_1fr_420px]" data-suspension={suspensionId}>
        {showLeft && <aside className="min-h-0 overflow-y-auto scroll-thin border-r border-line bg-panel p-4">{tree}</aside>}
        <main className="flex min-h-0 flex-col">
          <div className="relative min-h-[260px] flex-1">
            <ViewerHost modelKey={suspension.modelKey} steerable={suspension.steerable} components={viewerComponents} damageScenario={damageScenario} />
            {!showLeft && (
              <button type="button" className="btn absolute left-3 top-14 z-10" onClick={() => setSheet('tree')} data-testid="open-tree"><ListTree size={18} /> Hierarki</button>
            )}
            {failure && m.simActive && simAvailable && (
              <div className="pointer-events-none absolute left-3 right-16 top-[104px] z-10 lg:top-14">
                <span className="inline-block rounded-lg border border-mech/60 bg-bg/85 px-2.5 py-1 font-mono text-[12px] text-mech">SIM · {failure.name}</span>
              </div>
            )}
          </div>
          <div className="border-t border-line bg-panel"><AnimationControls steerable={suspension.steerable} compact={isPhone} /></div>
          {!showRight && (
            <nav className="grid grid-cols-3 gap-1 border-t border-line bg-panel p-1.5">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" onClick={() => { setTab(id); setSheet('panel'); }} className="flex flex-col items-center gap-0.5 rounded-lg min-h-12 text-[12px] text-ink-2" data-testid={`mobile-mtab-${id}`}>
                  <Icon size={18} />{label}
                </button>
              ))}
            </nav>
          )}
        </main>
        {showRight && (
          <aside className="flex min-h-0 flex-col border-t lg:border-t-0 lg:border-l border-line bg-panel">
            <div className="border-b border-line p-3">{tabBar}</div>
            <div className="min-h-0 flex-1 overflow-y-auto scroll-thin p-5">{body}</div>
          </aside>
        )}
      </div>
      <Sheet open={sheet === 'tree'} onClose={() => setSheet('none')} title="Hierarki komponen">
        <div className="pb-4" onClick={(e) => { if ((e.target as HTMLElement).closest('[data-testid^="tree-"]') && !showRight) { setSheet('panel'); } }}>{tree}</div>
      </Sheet>
      <Sheet open={sheet === 'panel'} onClose={() => setSheet('none')} title={TABS.find((t) => t.id === tab)!.label}>
        <div className="pb-4"><div className="mb-4">{tabBar}</div>{body}</div>
      </Sheet>
    </MechPage>
  );
}

export type { SuspensionId };
