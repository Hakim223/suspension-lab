import { AlertOctagon, Gauge, Microscope, Search, ShieldAlert, Split, Stethoscope, Wrench } from 'lucide-react';
import type { FailureMode, FaultDomain } from '../data/types';
import { SEVERITY_LABEL } from '../data';
import { BulletList, Notice, Section, cx } from '../../components/ui/primitives';

const SEV_CLS: Record<FailureMode['severity'], string> = {
  rendah: 'border-line-strong text-ink-2',
  sedang: 'border-warn/50 text-warn',
  tinggi: 'border-danger/60 text-danger',
  kritis: 'border-danger bg-danger/15 text-danger',
};

export function SeverityBadge({ s }: { s: FailureMode['severity'] }) {
  return <span className={cx('chip !text-[11px]', SEV_CLS[s])}>{SEVERITY_LABEL[s]}</span>;
}

export const DOMAIN_LABEL: Record<FaultDomain, string> = { mekanis: 'Mekanis', hidraulik: 'Hidraulik', elektrik: 'Elektrik', elektronik: 'Elektronik' };
export function DomainBadge({ d }: { d: FaultDomain }) {
  const cls = d === 'mekanis' ? 'border-ink-2/40 text-ink-2' : d === 'hidraulik' ? 'border-accent-2/50 text-accent-2' : 'border-mech/60 text-mech';
  return <span className={cx('chip !text-[11px] font-mono', cls)}>{DOMAIN_LABEL[d]}</span>;
}

/**
 * The six required explanations of a failure mode, plus indicators and the visual note.
 * Shared by the architecture workbench, steering module and anatomy viewer.
 */
export function FailureDetail({ failure, subcomponentName, domain }: { failure: FailureMode; subcomponentName?: string; domain?: FaultDomain }) {
  return (
    <article data-testid="failure-detail">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge s={failure.severity} />
        {domain && <DomainBadge d={domain} />}
        {subcomponentName && <span className="chip !text-[11px]">Subkomponen: {subcomponentName}</span>}
      </div>
      <h3 className="mt-2 text-[19px] font-bold leading-snug" data-testid="failure-title">{failure.name}</h3>
      <div className="mt-3">
        <Section title="1 · Apa yang gagal secara fisik" icon={<Microscope size={15} />}>{failure.whatFails}</Section>
        <Section title="2 · Mengapa terjadi" icon={<Search size={15} />}>{failure.cause}</Section>
        <Section title="3 · Perubahan gerak / perilaku mekanis" icon={<Wrench size={15} />}>{failure.mechanicalEffect}</Section>
        <Section title="4 · Yang dirasakan pengemudi" icon={<AlertOctagon size={15} />} tone="warn"><BulletList items={failure.symptoms} /></Section>
        <Section title="5 · Yang harus diperiksa mekanik" icon={<Stethoscope size={15} />}><BulletList items={failure.inspection} marker="num" /></Section>
        <Section title="6 · Membedakan dari kegagalan serupa" icon={<Split size={15} />} tone="danger"><BulletList items={failure.differentiation} /></Section>
        {failure.indicators && failure.indicators.length > 0 && (
          <Section title="Indikator simulasi" icon={<Gauge size={15} />}>
            <ul className="flex flex-wrap gap-1.5">
              {failure.indicators.map((i) => <li key={i} className="rounded-md border border-line-strong bg-bg px-2 py-1 font-mono text-[12.5px] text-ink">{i}</li>)}
            </ul>
          </Section>
        )}
      </div>
      {failure.visualNote && (
        <div className="mt-4">
          <Notice icon={<ShieldAlert size={16} className="text-accent" />}>{failure.visualNote}</Notice>
        </div>
      )}
    </article>
  );
}
