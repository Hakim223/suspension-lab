import { useNavigate } from 'react-router-dom';
import { useContent } from '../../data/contentStore';
import { cx } from '../../components/ui/primitives';

const POS: Record<string, string> = { depan: 'Depan', belakang: 'Belakang' };

export function SuspensionSelector({ activeId, onNavigate }: { activeId: string; onNavigate?: () => void }) {
  const suspensions = useContent((s) => s.suspensions);
  const nav = useNavigate();
  return (
    <nav aria-label="Pilih jenis suspensi">
      <ul className="space-y-1.5">
        {[...suspensions].sort((a, b) => a.sortOrder - b.sortOrder).map((s) => {
          const active = s.id === activeId;
          return (
            <li key={s.id}>
              <button
                type="button"
                data-testid={`select-suspension-${s.id}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  if (!active) nav(`/jelajah/${s.id}`);
                  onNavigate?.();
                }}
                className={cx(
                  'w-full text-left rounded-xl border px-3.5 py-2.5 transition-colors min-h-12',
                  active ? 'border-accent bg-accent/10' : 'border-line hover:border-line-strong hover:bg-panel-2',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cx('text-[15px] font-semibold', active ? 'text-accent' : 'text-ink')}>{s.name}</span>
                  <span className="text-[11px] font-medium text-muted">{POS[s.axlePosition]}</span>
                </div>
                <div className="text-[12.5px] text-muted capitalize">{s.independence}</div>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
