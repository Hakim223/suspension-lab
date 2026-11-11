import { useLocation, useNavigate } from 'react-router-dom';
import { User, Wrench } from 'lucide-react';
import { modeOfPath, switchTarget, useMode, type AppMode } from '../../state/modeStore';
import { cx } from '../ui/primitives';

/** Segmented switch between Consumer and Mechanic Mode; preserves location within each mode. */
export function ModeSwitch({ compact = false }: { compact?: boolean }) {
  const loc = useLocation();
  const nav = useNavigate();
  const lastPath = useMode((s) => s.lastPath);
  const current = modeOfPath(loc.pathname);
  const go = (m: AppMode) => {
    if (m === current) return;
    nav(switchTarget(m, loc.pathname, lastPath));
  };
  const opts: Array<{ m: AppMode; label: string; short: string; icon: typeof User }> = [
    { m: 'consumer', label: 'Mode Konsumen', short: 'Konsumen', icon: User },
    { m: 'mechanic', label: 'Mode Mekanik', short: 'Mekanik', icon: Wrench },
  ];
  return (
    <div role="radiogroup" aria-label="Pilih mode" className="inline-flex shrink-0 rounded-xl border border-line bg-bg/60 p-1" data-testid="mode-switch">
      {opts.map(({ m, label, short, icon: Icon }) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={current === m}
          aria-label={label}
          onClick={() => go(m)}
          data-testid={`mode-${m}`}
          className={cx(
            'inline-flex items-center gap-1.5 rounded-lg min-h-9 px-2.5 text-[13px] font-semibold transition-colors',
            current === m ? (m === 'mechanic' ? 'bg-mech text-[#1c1300]' : 'bg-accent text-accent-ink') : 'text-ink-2 hover:text-ink',
          )}
        >
          <Icon size={15} />
          {!compact && <span>{short}</span>}
        </button>
      ))}
    </div>
  );
}
