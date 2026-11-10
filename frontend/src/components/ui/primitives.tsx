import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(' ');
}

export function IconButton({
  label, onClick, active, children, disabled, className, testId,
}: { label: string; onClick: () => void; active?: boolean; children: ReactNode; disabled?: boolean; className?: string; testId?: string }) {
  return (
    <button
      type="button"
      className={cx('btn btn-icon', active && 'border-accent text-accent bg-accent/10', className)}
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active === undefined ? undefined : active}
      disabled={disabled}
      data-testid={testId}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  value, options, onChange, ariaLabel, size = 'md',
}: { value: T; options: Array<{ value: T; label: string; disabled?: boolean; icon?: ReactNode }>; onChange: (v: T) => void; ariaLabel: string; size?: 'sm' | 'md' }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex flex-wrap gap-1 rounded-xl bg-bg/60 border border-line p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={cx(
            'inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-35',
            size === 'sm' ? 'px-2.5 min-h-9 text-[13px]' : 'px-3 min-h-10 text-[14px]',
            value === o.value ? 'bg-accent text-accent-ink' : 'text-ink-2 hover:bg-panel-2',
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Section({ title, icon, children, tone }: { title: string; icon?: ReactNode; children: ReactNode; tone?: 'warn' | 'danger' }) {
  return (
    <section className="mt-5 first:mt-0">
      <h3 className={cx('flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.08em]', tone === 'danger' ? 'text-danger' : tone === 'warn' ? 'text-warn' : 'text-accent')}>
        {icon}
        {title}
      </h3>
      <div className="mt-2 text-[15px] leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}

export function BulletList({ items, marker = 'dot' }: { items: string[]; marker?: 'dot' | 'num' }) {
  return (
    <ul className="space-y-1.5">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2.5">
          {marker === 'num' ? (
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-panel-2 border border-line-strong text-[11px] font-semibold text-ink">{i + 1}</span>
          ) : (
            <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70" />
          )}
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function Notice({ children, tone = 'info', icon }: { children: ReactNode; tone?: 'info' | 'warn'; icon?: ReactNode }) {
  return (
    <div className={cx('flex gap-2.5 rounded-xl border px-3.5 py-3 text-[13.5px] leading-relaxed', tone === 'warn' ? 'border-warn/40 bg-warn/10 text-[#fde3b0]' : 'border-line-strong bg-panel-2 text-ink-2')}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div>{children}</div>
    </div>
  );
}

/** Bottom sheet for mobile/tablet. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <div className={cx('fixed inset-0 z-40 transition', open ? 'pointer-events-auto' : 'pointer-events-none')} aria-hidden={!open}>
      <div className={cx('absolute inset-0 bg-black/50 transition-opacity', open ? 'opacity-100' : 'opacity-0')} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'absolute inset-x-0 bottom-0 max-h-[78vh] flex flex-col rounded-t-3xl border-t border-line-strong bg-panel shadow-2xl transition-transform duration-300',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <div className="mx-auto absolute left-1/2 -translate-x-1/2 top-2 h-1.5 w-12 rounded-full bg-line-strong" />
          <h2 className="text-[17px] font-semibold mt-2">{title}</h2>
          <button className="btn btn-icon mt-2" onClick={onClose} aria-label="Tutup">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto scroll-thin px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{open && children}</div>
      </div>
    </div>
  );
}
