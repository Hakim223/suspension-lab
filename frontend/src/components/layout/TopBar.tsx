import { NavLink, useNavigate } from 'react-router-dom';
import { useContent } from '../../data/contentStore';
import { Brand } from './Brand';
import { cx } from '../ui/primitives';

const links = [
  { to: '/jelajah', label: 'Jelajah 3D' },
  { to: '/belajar', label: 'Belajar' },
  { to: '/kuis', label: 'Kuis' },
];

export function TopBar({ suspensionId }: { suspensionId?: string }) {
  const suspensions = useContent((s) => s.suspensions);
  const nav = useNavigate();
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-panel/80 px-3 sm:px-5 backdrop-blur">
      <div className="hidden sm:block"><Brand /></div>
      <div className="sm:hidden"><Brand compact /></div>
      {suspensionId && (
        <label className="ml-1 sm:ml-4 flex-1 sm:flex-none min-w-0">
          <span className="sr-only">Jenis suspensi</span>
          <select
            className="w-full sm:w-auto min-h-11 rounded-xl border border-line-strong bg-panel-2 px-3 text-[15px] font-semibold text-ink lg:hidden"
            value={suspensionId}
            onChange={(e) => nav(`/jelajah/${e.target.value}`)}
            data-testid="suspension-select-mobile"
          >
            {suspensions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      )}
      <nav className="ml-auto hidden md:flex items-center gap-1" aria-label="Navigasi utama">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) => cx('rounded-lg px-3 min-h-11 inline-flex items-center text-[15px] font-medium', isActive ? 'text-accent' : 'text-ink-2 hover:text-ink hover:bg-panel-2')}
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
