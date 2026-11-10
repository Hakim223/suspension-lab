import { Link } from 'react-router-dom';

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#142035" stroke="#2b3d5c" />
      <path d="M9 7h14M9 25h14" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16 9.5l-5 2.2 10 2.6-10 2.6 10 2.6-5 2.2" fill="none" stroke="#e6edf7" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 min-h-11" aria-label="Suspension Lab — beranda">
      <BrandMark />
      {!compact && (
        <span className="text-[17px] font-bold tracking-tight">
          Suspension <span className="text-accent">Lab</span>
        </span>
      )}
    </Link>
  );
}
