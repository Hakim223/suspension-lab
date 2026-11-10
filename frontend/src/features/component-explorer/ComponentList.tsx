import { Eye, EyeOff } from 'lucide-react';
import { CATEGORY_LABELS, COMPONENT_CATEGORIES } from '@suspension-lab/shared';
import { useLab } from '../../state/labStore';
import type { ResolvedComponent } from '../../hooks/useSuspension';
import { cx } from '../../components/ui/primitives';

export function ComponentList({ components, onPick }: { components: ResolvedComponent[]; onPick?: () => void }) {
  const selected = useLab((s) => s.selectedComponentId);
  const hidden = useLab((s) => s.hidden);
  const select = useLab((s) => s.select);
  const toggleHidden = useLab((s) => s.toggleHidden);
  const showAll = useLab((s) => s.showAll);
  const anyHidden = Object.values(hidden).some(Boolean);
  const byCat = COMPONENT_CATEGORIES.map((cat) => ({ cat, items: components.filter((c) => c.category === cat) })).filter((g) => g.items.length);
  const childOf = new Map<string, string>();
  for (const c of components) for (const ch of c.includes ?? []) childOf.set(ch, c.id);

  return (
    <div data-testid="component-list">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Komponen ({components.length})</h2>
        <button type="button" className="text-[13px] font-medium text-accent disabled:text-muted disabled:opacity-60 min-h-9 px-2" onClick={showAll} disabled={!anyHidden}>
          Tampilkan semua
        </button>
      </div>
      <div className="mt-2 space-y-4">
        {byCat.map(({ cat, items }) => (
          <div key={cat}>
            <div className="mb-1.5 text-[12px] font-medium text-muted">{CATEGORY_LABELS[cat]}</div>
            <ul className="space-y-1">
              {items.map((c) => {
                const isSel = selected === c.id || (selected !== null && childOf.get(c.id) === selected);
                const isHidden = !!hidden[c.id];
                const composite = !!c.includes?.length;
                return (
                  <li key={c.id} className="flex items-stretch gap-1">
                    <button
                      type="button"
                      data-testid={`component-${c.id}`}
                      aria-pressed={selected === c.id}
                      onClick={() => {
                        select(selected === c.id ? null : c.id);
                        onPick?.();
                      }}
                      className={cx(
                        'flex-1 min-h-11 rounded-lg border px-3 py-1.5 text-left text-[14px] leading-snug transition-colors',
                        isSel ? 'border-accent/70 bg-accent/10 text-ink' : 'border-transparent hover:bg-panel-2 text-ink-2',
                        isHidden && 'opacity-50',
                      )}
                    >
                      <span className={cx(selected === c.id && 'text-accent font-semibold')}>{c.displayName}</span>
                      {composite && <span className="ml-2 chip !py-0 !px-2 !text-[11px]">rakitan</span>}
                    </button>
                    {!composite && (
                      <button
                        type="button"
                        className="w-11 shrink-0 rounded-lg text-muted hover:text-ink hover:bg-panel-2 flex items-center justify-center"
                        onClick={() => toggleHidden(c.id)}
                        aria-label={`${isHidden ? 'Tampilkan' : 'Sembunyikan'} ${c.displayName}`}
                        aria-pressed={isHidden}
                        data-testid={`toggle-visibility-${c.id}`}
                      >
                        {isHidden ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
