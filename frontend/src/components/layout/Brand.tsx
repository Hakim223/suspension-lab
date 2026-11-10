import { Link } from 'react-router-dom';
import { WORKSHOP } from '../../config/workshop';

export function BrandMark({ height = 28 }: { height?: number }) {
  return <img src={WORKSHOP.logoOnDark} alt="" aria-hidden="true" height={height} style={{ height, width: 'auto' }} />;
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 min-h-11" aria-label={`Suspension Lab oleh ${WORKSHOP.name} — beranda`}>
      <BrandMark height={compact ? 26 : 30} />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[16px] font-bold tracking-tight">
            Suspension <span className="text-accent">Lab</span>
          </span>
          <span className="mt-1 text-[11px] font-medium tracking-wide text-muted">{WORKSHOP.name}</span>
        </span>
      )}
    </Link>
  );
}
