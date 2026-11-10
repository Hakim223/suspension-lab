import { useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { FlaskConical, Info, Layers, List } from 'lucide-react';
import { useSuspension } from '../hooks/useSuspension';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useLab } from '../state/labStore';
import { simClock } from '../three/sim/clock';
import { TopBar } from '../components/layout/TopBar';
import { ViewerHost } from '../components/viewer/ViewerHost';
import { AnimationControls } from '../components/simulation/AnimationControls';
import { ComponentInfoPanel } from '../components/component-info/ComponentInfoPanel';
import { SuspensionSelector } from '../features/suspension-selector/SuspensionSelector';
import { SuspensionOverview } from '../features/suspension-selector/SuspensionOverview';
import { ComponentList } from '../features/component-explorer/ComponentList';
import { DamagePanel } from '../features/damage-simulator/DamagePanel';
import { Sheet, cx } from '../components/ui/primitives';

type Tab = 'info' | 'damage' | 'system';

const TABS: Array<{ id: Tab; label: string; icon: typeof Info }> = [
  { id: 'info', label: 'Komponen', icon: Info },
  { id: 'damage', label: 'Kerusakan', icon: FlaskConical },
  { id: 'system', label: 'Sistem', icon: Layers },
];

export default function ExplorerPage() {
  const { suspensionId = 'macpherson' } = useParams();
  const view = useSuspension(suspensionId);
  const selectedId = useLab((s) => s.selectedComponentId);
  const scenarioId = useLab((s) => s.damageScenarioId);
  const mobileSheet = useLab((s) => s.mobileSheet);
  const setMobileSheet = useLab((s) => s.setMobileSheet);
  const [tab, setTab] = useState<Tab>('info');
  const isPhone = useMediaQuery('(max-width: 639px)');
  const showLeft = useMediaQuery('(min-width: 1024px)');
  const showRight = useMediaQuery('(min-width: 768px)');

  useEffect(() => {
    useLab.getState().resetForSuspension();
    simClock.reset();
    setTab('info');
  }, [suspensionId]);

  useEffect(() => {
    if (selectedId && tab === 'system') setTab('info');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const availableIds = useMemo(() => new Set(view?.components.map((c) => c.id) ?? []), [view]);

  if (!view) return <Navigate to="/jelajah/macpherson" replace />;
  const { suspension, components, damageScenarios } = view;
  const selected = selectedId ? (view.componentById.get(selectedId) ?? null) : null;
  const scenario = damageScenarios.find((d) => d.id === scenarioId) ?? null;

  const simulate = (id: string) => {
    const s = damageScenarios.find((d) => d.id === id);
    if (!s) return;
    const st = useLab.getState();
    st.setDamageScenario(id);
    st.select(s.componentId);
    st.setMode(s.simulation.recommendedMode);
    st.setPlaying(true);
    st.focusSelection();
    setTab('damage');
    if (st.mobileSheet !== 'none') st.setMobileSheet('info');
  };

  const tabBody = (t: Tab) =>
    t === 'info' ? (
      <ComponentInfoPanel component={selected} scenarios={damageScenarios} onSimulate={simulate} />
    ) : t === 'damage' ? (
      <DamagePanel scenarios={damageScenarios} availableComponentIds={availableIds} />
    ) : (
      <SuspensionOverview suspension={suspension} />
    );

  const tabBar = (
    <div role="tablist" aria-label="Panel informasi" className="flex gap-1 rounded-xl border border-line bg-bg/60 p-1">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          role="tab"
          aria-selected={tab === id}
          onClick={() => setTab(id)}
          data-testid={`tab-${id}`}
          className={cx('flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg min-h-10 px-2 text-[13.5px] font-medium', tab === id ? 'bg-panel-2 text-accent border border-line-strong' : 'text-ink-2 hover:text-ink')}
        >
          <Icon size={15} />
          <span className="truncate">{label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex h-dvh flex-col" data-testid="explorer" data-suspension={suspension.id}>
      <TopBar suspensionId={suspension.id} />
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-rows-[minmax(0,1fr)_minmax(0,38%)] lg:grid-rows-1 lg:grid-cols-[272px_1fr_372px] xl:grid-cols-[300px_1fr_420px]">
        {/* LEFT: architecture selector + component list */}
        {showLeft && <aside className="hidden lg:flex min-h-0 flex-col gap-6 overflow-y-auto scroll-thin border-r border-line bg-panel p-4" aria-label="Pilih sistem dan komponen">
          <div>
            <h2 className="section-title mb-2">Jenis suspensi</h2>
            <SuspensionSelector activeId={suspension.id} />
          </div>
          <ComponentList components={components} />
        </aside>}

        {/* CENTER: viewer + animation controls */}
        <main className="flex min-h-0 flex-col">
          <div className="relative min-h-[280px] flex-1">
            <ViewerHost modelKey={suspension.modelKey} steerable={suspension.steerable} components={components} damageScenario={scenario} />
            <button
              type="button"
              className="btn absolute left-3 top-14 z-10 lg:hidden"
              onClick={() => setMobileSheet('components')}
              data-testid="open-components"
            >
              <List size={18} /> Komponen
            </button>
          </div>
          <div className="border-t border-line bg-panel">
            <AnimationControls steerable={suspension.steerable} compact={isPhone} />
          </div>
          {/* Mobile bottom navigation */}
          {!showRight && <nav className="grid grid-cols-3 gap-1 border-t border-line bg-panel p-1.5 md:hidden pb-[max(0.375rem,env(safe-area-inset-bottom))]" aria-label="Panel">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className="flex flex-col items-center justify-center gap-0.5 rounded-lg min-h-12 text-[12px] font-medium text-ink-2 hover:bg-panel-2"
                onClick={() => {
                  setTab(id);
                  setMobileSheet('info');
                }}
                data-testid={`mobile-tab-${id}`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>}
        </main>

        {/* RIGHT: information panel */}
        {showRight && <aside className="hidden md:flex min-h-0 flex-col border-t lg:border-t-0 lg:border-l border-line bg-panel" aria-label="Informasi">
          <div className="p-3 border-b border-line">{tabBar}</div>
          <div className="min-h-0 flex-1 overflow-y-auto scroll-thin p-5" role="tabpanel">{tabBody(tab)}</div>
        </aside>}
      </div>

      <Sheet open={mobileSheet === 'components'} onClose={() => setMobileSheet('none')} title="Sistem & Komponen">
        <div className="space-y-6 pt-1">
          <div className="lg:hidden">
            <h2 className="section-title mb-2">Jenis suspensi</h2>
            <SuspensionSelector activeId={suspension.id} onNavigate={() => setMobileSheet('none')} />
          </div>
          <ComponentList
            components={components}
            onPick={() => {
              if (window.matchMedia('(max-width: 767px)').matches) {
                setTab('info');
                setMobileSheet('info');
              } else setMobileSheet('none');
            }}
          />
        </div>
      </Sheet>
      <Sheet open={mobileSheet === 'info'} onClose={() => setMobileSheet('none')} title={TABS.find((t) => t.id === tab)!.label}>
        <div className="pt-1 pb-4">
          <div className="mb-4">{tabBar}</div>
          {tabBody(tab)}
        </div>
      </Sheet>
    </div>
  );
}
