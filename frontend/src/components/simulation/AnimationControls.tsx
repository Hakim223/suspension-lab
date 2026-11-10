import { Link2, Pause, Play, RotateCcw, Unlink2 } from 'lucide-react';
import type { AnimationMode } from '@suspension-lab/shared';
import { useLab } from '../../state/labStore';
import { useSimClock } from '../../hooks/useSimClock';
import { simClock } from '../../three/sim/clock';
import { TRAVEL_LIMIT } from '../../three/sim/timeline';
import { IconButton, Segmented, cx } from '../ui/primitives';

const SPEEDS = [0.25, 0.5, 1, 2];

function Readout({ steerable }: { steerable: boolean }) {
  const c = useSimClock();
  const mm = (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v * 1000)} mm`;
  const state = (v: number) => (v > 0.004 ? 'tertekan' : v < -0.004 ? 'memanjang' : 'normal');
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted" data-testid="readout">
      <span>Kiri: <b className="font-mono text-ink">{mm(c.readout.travelL)}</b> <span>({state(c.readout.travelL)})</span></span>
      <span>Kanan: <b className="font-mono text-ink">{mm(c.readout.travelR)}</b> <span>({state(c.readout.travelR)})</span></span>
      {steerable && <span>Setir: <b className="font-mono text-ink">{Math.round(c.readout.rack * 100)}%</b></span>}
    </div>
  );
}

function Scrubber() {
  const c = useSimClock();
  const setPlaying = useLab((s) => s.setPlaying);
  return (
    <label className="flex items-center gap-3 w-full">
      <span className="sr-only">Posisi waktu animasi</span>
      <input
        type="range"
        className="range flex-1"
        min={0}
        max={c.duration}
        step={0.01}
        value={c.t}
        onChange={(e) => {
          setPlaying(false);
          simClock.seekTo = Number(e.target.value);
          simClock.t = Number(e.target.value);
          simClock.emit();
        }}
        aria-label="Linimasa animasi"
        data-testid="timeline-scrubber"
      />
      <span className="w-16 shrink-0 text-right font-mono text-[13px] text-ink-2">{c.t.toFixed(1)} s</span>
    </label>
  );
}

function ManualSliders({ steerable }: { steerable: boolean }) {
  const manual = useLab((s) => s.manual);
  const setManual = useLab((s) => s.setManual);
  const lim = Math.round(TRAVEL_LIMIT * 1000);
  const slider = (label: string, value: number, onChange: (v: number) => void, min: number, max: number, unit: string, testId: string) => (
    <label className="flex-1 min-w-[150px]">
      <span className="flex justify-between text-[13px] text-muted">
        <span>{label}</span>
        <span className="font-mono text-ink">{value > 0 ? '+' : ''}{value} {unit}</span>
      </span>
      <input type="range" className="range" min={min} max={max} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} data-testid={testId} />
    </label>
  );
  return (
    <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
      {slider('Roda kiri (naik + / turun −)', Math.round(manual.left * 1000), (v) => setManual({ left: v / 1000 }), -lim, lim, 'mm', 'manual-left')}
      <IconButton label={manual.linked ? 'Lepas tautan kiri-kanan' : 'Tautkan kiri-kanan'} active={manual.linked} onClick={() => setManual({ linked: !manual.linked })}>
        {manual.linked ? <Link2 size={18} /> : <Unlink2 size={18} />}
      </IconButton>
      {slider('Roda kanan (naik + / turun −)', Math.round(manual.right * 1000), (v) => setManual({ right: v / 1000 }), -lim, lim, 'mm', 'manual-right')}
      {steerable && slider('Putaran setir (kiri + / kanan −)', Math.round(manual.steer * 100), (v) => setManual({ steer: v / 100 }), -100, 100, '%', 'manual-steer')}
    </div>
  );
}

export function AnimationControls({ steerable, compact = false }: { steerable: boolean; compact?: boolean }) {
  const mode = useLab((s) => s.mode);
  const playing = useLab((s) => s.playing);
  const speed = useLab((s) => s.speed);
  const setMode = useLab((s) => s.setMode);
  const setPlaying = useLab((s) => s.setPlaying);
  const setSpeed = useLab((s) => s.setSpeed);
  const setManual = useLab((s) => s.setManual);

  const modes: Array<{ value: AnimationMode; label: string; disabled?: boolean }> = [
    { value: 'bump', label: 'Polisi tidur' },
    { value: 'rough', label: 'Jalan bergelombang' },
    { value: 'steer', label: 'Belok', disabled: !steerable },
    { value: 'manual', label: 'Manual' },
  ];

  const reset = () => {
    setPlaying(false);
    simClock.reset();
    if (mode === 'manual') setManual({ left: 0, right: 0, steer: 0 });
  };

  const playBtn = (
    <button
      type="button"
      className={cx('btn', playing ? '' : 'btn-primary', compact ? 'min-w-[96px]' : 'min-w-[110px]')}
      onClick={() => setPlaying(!playing)}
      disabled={mode === 'manual'}
      data-testid="play-toggle"
      aria-label={playing ? 'Jeda animasi' : 'Putar animasi'}
    >
      {playing ? <Pause size={18} /> : <Play size={18} />}
      {playing ? 'Jeda' : 'Putar'}
    </button>
  );
  const speedGroup = (
    <div className="flex items-center gap-2" role="group" aria-label="Kecepatan animasi">
      {!compact && <span className="text-[13px] text-muted">Kecepatan</span>}
      <div className="inline-flex rounded-xl border border-line bg-bg/60 p-1">
        {SPEEDS.map((sp) => (
          <button
            key={sp}
            type="button"
            aria-pressed={speed === sp}
            aria-label={`Kecepatan ${sp}x`}
            onClick={() => setSpeed(sp)}
            className={cx('rounded-lg min-h-9 font-mono', compact ? 'px-2 text-[12px]' : 'px-2.5 text-[13px]', speed === sp ? 'bg-panel-2 text-accent border border-line-strong' : 'text-ink-2')}
            data-testid={`speed-${sp}`}
          >
            {sp}×
          </button>
        ))}
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="flex flex-col gap-2 px-3 py-2.5" data-testid="animation-controls">
        <div className="-mx-3 overflow-x-auto px-3 scroll-thin">
          <div className="w-max"><Segmented ariaLabel="Mode animasi" value={mode} onChange={(m) => { setMode(m); if (m !== 'manual') setPlaying(true); }} options={modes} size="sm" /></div>
        </div>
        {mode === 'manual' ? (
          <ManualSliders steerable={steerable} />
        ) : (
          <div className="flex items-center gap-2">
            {playBtn}
            <IconButton label="Ulang dari awal" onClick={reset} testId="reset-animation"><RotateCcw size={18} /></IconButton>
            <div className="ml-auto">{speedGroup}</div>
          </div>
        )}
        {mode !== 'manual' && <Scrubber />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-5 py-3.5" data-testid="animation-controls">
      <div className="flex flex-wrap items-center gap-2.5">
        <Segmented ariaLabel="Mode animasi" value={mode} onChange={(m) => { setMode(m); if (m !== 'manual') setPlaying(true); }} options={modes} />
        <div className="flex items-center gap-2">
          {playBtn}
          <IconButton label="Ulang dari awal" onClick={reset} testId="reset-animation"><RotateCcw size={18} /></IconButton>
        </div>
        {speedGroup}
      </div>
      {mode === 'manual' ? <ManualSliders steerable={steerable} /> : <Scrubber />}
      <Readout steerable={steerable} />
    </div>
  );
}
