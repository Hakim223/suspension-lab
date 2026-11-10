import { Component, lazy, Suspense, useCallback, useState, type ReactNode } from 'react';
import { Boxes, Camera, Focus, Info, ScanSearch, Tag, WifiOff } from 'lucide-react';
import type { DamageScenario } from '@suspension-lab/shared';
import { useLab } from '../../state/labStore';
import { isWebGLAvailable } from '../../three/webgl';
import type { ResolvedComponent } from '../../hooks/useSuspension';
import type { SuspensionModel } from '../../three/rig/types';
import { IconButton, cx } from '../ui/primitives';

const SuspensionViewer = lazy(() => import('./SuspensionViewer'));

class ViewerErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error('[viewer] 3D viewer failed, showing fallback', err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function LoadingOverlay({ label = 'Memuat model 3D…' }: { label?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg/70 z-10" role="status" data-testid="viewer-loading">
      <div className="h-10 w-10 rounded-full border-[3px] border-line-strong border-t-accent animate-spin" />
      <span className="text-[14px] text-ink-2">{label}</span>
    </div>
  );
}

/** Non-WebGL educational fallback: component cards that drive the same info panel. */
export function FallbackViewer({ components }: { components: ResolvedComponent[] }) {
  const selected = useLab((s) => s.selectedComponentId);
  const select = useLab((s) => s.select);
  return (
    <div className="absolute inset-0 overflow-y-auto scroll-thin p-5" data-testid="viewer-fallback">
      <div className="flex items-start gap-3 rounded-xl border border-warn/40 bg-warn/10 p-4 text-[14px] text-[#fde3b0]">
        <WifiOff size={18} className="mt-0.5 shrink-0" />
        <div>
          <b>Mode tanpa 3D.</b> Perangkat atau browser ini tidak mendukung WebGL, sehingga model 3D tidak dapat ditampilkan. Semua materi edukasi tetap tersedia — pilih komponen di bawah ini.
        </div>
      </div>
      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {components.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => select(c.id)}
              className={cx('w-full h-full min-h-20 rounded-xl border p-3.5 text-left', selected === c.id ? 'border-accent bg-accent/10' : 'border-line bg-panel hover:border-line-strong')}
            >
              <div className="text-[15px] font-semibold">{c.displayName}</div>
              <div className="mt-1 text-[13px] text-muted leading-snug">{c.summary}</div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Toolbar() {
  const exploded = useLab((s) => s.exploded);
  const showLabels = useLab((s) => s.showLabels);
  const ghost = useLab((s) => s.ghostOthers);
  const setExploded = useLab((s) => s.setExploded);
  const setShowLabels = useLab((s) => s.setShowLabels);
  const setGhost = useLab((s) => s.setGhostOthers);
  const resetCamera = useLab((s) => s.resetCamera);
  const focusSelection = useLab((s) => s.focusSelection);
  const hasSelection = useLab((s) => s.selectedComponentId !== null);
  return (
    <div className="absolute right-3 top-3 z-10 flex flex-col gap-2" role="toolbar" aria-label="Kontrol tampilan 3D">
      <IconButton label="Atur ulang kamera" onClick={resetCamera} testId="reset-camera"><Camera size={19} /></IconButton>
      <IconButton label="Perbesar ke komponen terpilih" onClick={focusSelection} disabled={!hasSelection} testId="focus-selection"><ScanSearch size={19} /></IconButton>
      <IconButton label={exploded ? 'Tampilan rakitan' : 'Tampilan urai (exploded)'} active={exploded} onClick={() => setExploded(!exploded)} testId="toggle-exploded"><Boxes size={19} /></IconButton>
      <IconButton label={showLabels ? 'Sembunyikan label' : 'Tampilkan label'} active={showLabels} onClick={() => setShowLabels(!showLabels)} testId="toggle-labels"><Tag size={19} /></IconButton>
      <IconButton label={ghost ? 'Matikan mode fokus' : 'Mode fokus (samarkan komponen lain)'} active={ghost} onClick={() => setGhost(!ghost)} testId="toggle-focus"><Focus size={19} /></IconButton>
    </div>
  );
}

export interface ViewerHostProps {
  modelKey: string;
  steerable: boolean;
  components: ResolvedComponent[];
  damageScenario: DamageScenario | null;
}

export function ViewerHost({ modelKey, steerable, components, damageScenario }: ViewerHostProps) {
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [hintSeen, setHintSeen] = useState(() => {
    try { return sessionStorage.getItem('sl-hint') === '1'; } catch { return false; }
  });
  const damageView = useLab((s) => s.damageView);
  const names = new Map(components.map((c) => [c.id, c.displayName]));
  const includes = new Map(components.map((c) => [c.id, c.includes]));
  const onModel = useCallback((m: SuspensionModel | null) => setLoadedKey(m ? m.key : null), []);

  if (!isWebGLAvailable()) return <FallbackViewer components={components} />;

  const fallback = <FallbackViewer components={components} />;
  const dismissHint = () => {
    setHintSeen(true);
    try { sessionStorage.setItem('sl-hint', '1'); } catch { /* ignore */ }
  };

  return (
    <div className="absolute inset-0" onPointerDown={hintSeen ? undefined : dismissHint} data-testid="viewer" data-model-ready={loadedKey === modelKey ? 'true' : 'false'}>
      <ViewerErrorBoundary fallback={fallback}>
        <Suspense fallback={<LoadingOverlay />}>
          <SuspensionViewer
            modelKey={modelKey}
            steerable={steerable}
            names={names}
            includes={includes}
            damageScenario={damageScenario}
            onModel={onModel}
          />
        </Suspense>
      </ViewerErrorBoundary>
      {loadedKey !== modelKey && <LoadingOverlay />}
      <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-lg border border-line bg-bg/80 px-2.5 py-1.5 text-[12px] text-ink-2" title="Model disederhanakan untuk edukasi; bukan model CAD rekayasa dari kendaraan tertentu.">
        <Info size={14} className="text-accent" /> Model ilustratif — bukan CAD rekayasa
      </div>
      <Toolbar />
      {damageScenario && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex justify-between gap-2 text-[12.5px] font-semibold" data-testid="compare-legend">
          <span className="rounded-lg border border-ok/40 bg-bg/85 px-2.5 py-1.5 text-ok">◀ Kiri: normal (pembanding)</span>
          <span className={cx('rounded-lg border bg-bg/85 px-2.5 py-1.5', damageView === 'damaged' ? 'border-warn/60 text-warn' : 'border-ok/40 text-ok')}>
            Kanan: {damageView === 'damaged' ? 'disimulasikan rusak' : 'normal'} ▶
          </span>
        </div>
      )}
      {!hintSeen && loadedKey === modelKey && !damageScenario && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-3">
          <div className="rounded-xl border border-line-strong bg-bg/85 px-4 py-2 text-[13px] text-ink-2 text-center">
            <span className="hidden sm:inline">Seret untuk memutar · cubit atau scroll untuk zoom · dua jari / klik kanan untuk menggeser · ketuk komponen untuk info</span>
            <span className="sm:hidden">Seret untuk memutar · cubit untuk zoom · ketuk komponen</span>
          </div>
        </div>
      )}
    </div>
  );
}
