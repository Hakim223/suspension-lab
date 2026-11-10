import { Activity, BookOpen, Cog, MapPin, MousePointerClick, ShieldAlert, Stethoscope, TriangleAlert, Wrench } from 'lucide-react';
import { CATEGORY_LABELS, type DamageScenario } from '@suspension-lab/shared';
import type { ResolvedComponent } from '../../hooks/useSuspension';
import { useLab } from '../../state/labStore';
import { BulletList, Notice, Section } from '../ui/primitives';

export function ComponentInfoPanel({
  component, scenarios, onSimulate,
}: { component: ResolvedComponent | null; scenarios: DamageScenario[]; onSimulate: (id: string) => void }) {
  const select = useLab((s) => s.select);
  if (!component) {
    return (
      <div className="flex flex-col items-center text-center py-8 px-3" data-testid="info-empty">
        <div className="h-14 w-14 rounded-2xl border border-line-strong bg-panel-2 flex items-center justify-center text-accent">
          <MousePointerClick size={26} />
        </div>
        <p className="mt-4 text-[16px] font-semibold">Pilih sebuah komponen</p>
        <p className="mt-1.5 text-[14.5px] text-muted leading-relaxed max-w-xs">
          Ketuk bagian pada model 3D atau pilih dari daftar komponen untuk melihat fungsi, cara kerja, gejala kerusakan, dan cara pemeriksaannya.
        </p>
      </div>
    );
  }
  const related = scenarios.filter((s) => s.componentId === component.id || component.includes?.includes(s.componentId));
  return (
    <article data-testid="component-info" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="chip">{CATEGORY_LABELS[component.category]}</span>
          <h2 className="mt-2 text-[22px] font-bold leading-tight" data-testid="component-info-title">{component.displayName}</h2>
          <p className="text-[13px] text-muted">{component.nameEn}</p>
        </div>
      </div>
      <p className="mt-3 text-[15.5px] leading-relaxed text-ink">{component.summary}</p>
      <div className="mt-3 rounded-xl border border-accent/25 bg-accent/5 px-3.5 py-2.5 text-[14px] text-ink-2">
        <span className="font-semibold text-accent">Peran pada sistem ini: </span>
        {component.link.roleDescription}
        {component.link.quantityNote && <span className="text-muted"> ({component.link.quantityNote})</span>}
      </div>
      {component.includes?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {component.includes.map((id) => (
            <button key={id} className="chip hover:border-accent hover:text-accent min-h-9" onClick={() => select(id)}>
              {id.replace(/-/g, ' ')}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-5">
        <Section title="Fungsi" icon={<Cog size={15} />}>{component.function}</Section>
        <Section title="Cara Kerja" icon={<Activity size={15} />}>{component.workingPrinciple}</Section>
        <Section title="Lokasi" icon={<MapPin size={15} />}>{component.location}</Section>
        <Section title="Kerusakan yang Umum" icon={<Wrench size={15} />} tone="warn"><BulletList items={component.failureModes} /></Section>
        <Section title="Gejala yang Mungkin Dirasakan" icon={<TriangleAlert size={15} />} tone="warn"><BulletList items={component.symptoms} /></Section>
        <Section title="Akibat Bila Dibiarkan" icon={<ShieldAlert size={15} />} tone="danger"><BulletList items={component.consequences} /></Section>
        <Section title="Cara Mekanik Memeriksa" icon={<Stethoscope size={15} />}><BulletList items={component.inspection} marker="num" /></Section>
        {component.terms.length > 0 && (
          <Section title="Istilah" icon={<BookOpen size={15} />}>
            <dl className="space-y-2">
              {component.terms.map((t) => (
                <div key={t.term}>
                  <dt className="font-semibold text-ink">{t.term}</dt>
                  <dd>{t.definition}</dd>
                </div>
              ))}
            </dl>
          </Section>
        )}
      </div>

      {related.length > 0 && (
        <div className="mt-6 space-y-2">
          {related.map((s) => (
            <button key={s.id} className="btn w-full justify-between" onClick={() => onSimulate(s.id)} data-testid={`simulate-${s.id}`}>
              <span>Simulasikan: {s.shortTitle}</span>
              <span aria-hidden>→</span>
            </button>
          ))}
        </div>
      )}
      <div className="mt-6">
        <Notice icon={<TriangleAlert size={16} className="text-warn" />} tone="warn">
          Gejala di atas dapat disebabkan oleh lebih dari satu komponen. Informasi ini untuk edukasi, bukan diagnosis. Pastikan kondisi kendaraan melalui pemeriksaan langsung oleh mekanik.
        </Notice>
      </div>
    </article>
  );
}
