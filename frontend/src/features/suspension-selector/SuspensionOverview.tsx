import { CircleCheck, CircleX, Car, Cog } from 'lucide-react';
import type { SuspensionType } from '@suspension-lab/shared';
import { BulletList, Section } from '../../components/ui/primitives';

export function SuspensionOverview({ suspension }: { suspension: SuspensionType }) {
  return (
    <article data-testid="suspension-overview">
      <div className="flex flex-wrap gap-2">
        <span className="chip">Roda {suspension.axlePosition}</span>
        <span className="chip capitalize">{suspension.independence}</span>
        {suspension.steerable && <span className="chip">Roda dapat dibelokkan</span>}
      </div>
      <h2 className="mt-3 text-[22px] font-bold">{suspension.name}</h2>
      <p className="mt-2 text-[15.5px] leading-relaxed text-ink">{suspension.description}</p>
      <div className="mt-5">
        <Section title="Cara kerjanya" icon={<Cog size={15} />}><BulletList items={suspension.howItWorks} marker="num" /></Section>
        <Section title="Biasa dipakai pada" icon={<Car size={15} />}><BulletList items={suspension.typicalApplications} /></Section>
        <Section title="Kelebihan" icon={<CircleCheck size={15} />}><BulletList items={suspension.advantages} /></Section>
        <Section title="Kekurangan" icon={<CircleX size={15} />} tone="warn"><BulletList items={suspension.disadvantages} /></Section>
      </div>
    </article>
  );
}
