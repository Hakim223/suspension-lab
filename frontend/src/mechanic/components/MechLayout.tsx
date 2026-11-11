import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Boxes, Cog, LayoutDashboard, ScanLine, Stethoscope } from 'lucide-react';
import { WORKSHOP } from '../../config/workshop';
import { ModeSwitch } from '../../components/layout/ModeSwitch';
import { cx } from '../../components/ui/primitives';

const NAV = [
  { to: '/mechanic', label: 'Dasbor', icon: LayoutDashboard, end: true },
  { to: '/mechanic/arsitektur', label: 'Arsitektur', icon: Boxes },
  { to: '/mechanic/kemudi', label: 'Sistem Kemudi', icon: Cog },
  { to: '/mechanic/anatomi', label: 'Anatomi', icon: ScanLine },
  { to: '/mechanic/diagnosis', label: 'Diagnosis', icon: Stethoscope },
];

export function MechTopBar() {
  return (
    <header className="shrink-0 border-b border-line bg-[#0b111d]" data-testid="mech-topbar">
      <div className="flex h-14 items-center gap-3 px-3 sm:px-5">
        <Link to="/" className="flex items-center gap-2 min-h-11" aria-label="Suspension Lab — beranda">
          <img src={WORKSHOP.logoOnDark} alt="" className="h-7 w-auto" />
          <span className="hidden sm:flex flex-col leading-none">
            <span className="text-[15px] font-bold">Suspension Lab</span>
            <span className="mt-0.5 font-mono text-[10px] tracking-[0.18em] text-mech">MECHANIC · TECHNICAL</span>
          </span>
        </Link>
        <nav className="ml-4 hidden lg:flex items-center gap-1" aria-label="Navigasi Mode Mekanik">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('inline-flex items-center gap-1.5 rounded-lg px-3 min-h-10 text-[14px] font-medium', isActive ? 'bg-mech/10 text-mech' : 'text-ink-2 hover:text-ink hover:bg-panel-2')}>
              <Icon size={16} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto"><ModeSwitch /></div>
      </div>
      <nav className="flex gap-1 overflow-x-auto scroll-thin border-t border-line px-2 py-1.5 lg:hidden" aria-label="Navigasi Mode Mekanik (ringkas)">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 min-h-9 text-[13px] font-medium', isActive ? 'bg-mech/10 text-mech' : 'text-ink-2')}>
            <Icon size={15} />{label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

export function MechPage({ children, scroll = true, testId }: { children: ReactNode; scroll?: boolean; testId?: string }) {
  return (
    <div className={cx('flex flex-col', scroll ? 'min-h-dvh' : 'h-dvh')} data-mode="mechanic" data-testid={testId}>
      <MechTopBar />
      {children}
    </div>
  );
}

/** Panel header with a technical label. */
export function MechHeading({ code, children, right }: { code?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">
        {code && <span className="font-mono text-mech">{code}</span>}
        {children}
      </h2>
      {right}
    </div>
  );
}
