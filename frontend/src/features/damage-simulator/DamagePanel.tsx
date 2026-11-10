import { FlaskConical, ShieldAlert, Stethoscope, TriangleAlert } from 'lucide-react';
import { damageScenarios as allScenarios, type DamageScenario } from '@suspension-lab/shared';
import { useLab } from '../../state/labStore';
import { BulletList, Notice, Section, Segmented, cx } from '../../components/ui/primitives';

export function DamagePanel({ scenarios, availableComponentIds }: { scenarios: DamageScenario[]; availableComponentIds: Set<string> }) {
  const activeId = useLab((s) => s.damageScenarioId);
  const view = useLab((s) => s.damageView);
  const intensity = useLab((s) => s.damageIntensity);
  const setScenario = useLab((s) => s.setDamageScenario);
  const setView = useLab((s) => s.setDamageView);
  const setIntensity = useLab((s) => s.setDamageIntensity);
  const setMode = useLab((s) => s.setMode);
  const setPlaying = useLab((s) => s.setPlaying);
  const select = useLab((s) => s.select);
  const active = scenarios.find((s) => s.id === activeId) ?? null;
  const unavailable = allScenarios.filter((s) => !availableComponentIds.has(s.componentId));

  const activate = (s: DamageScenario) => {
    if (activeId === s.id) {
      setScenario(null);
      return;
    }
    setScenario(s.id);
    select(s.componentId);
    setMode(s.simulation.recommendedMode);
    setPlaying(true);
    useLab.getState().focusSelection();
  };

  return (
    <div data-testid="damage-panel">
      <Notice icon={<FlaskConical size={16} className="text-accent" />}>
        Simulasi ini adalah <b>ilustrasi visual</b> yang dilebih-lebihkan agar mudah dilihat. Ini bukan hasil pengukuran dan bukan alat diagnosis.
      </Notice>
      <h2 className="section-title mt-5">Pilih skenario</h2>
      <ul className="mt-2 space-y-1.5">
        {scenarios.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              data-testid={`scenario-${s.id}`}
              aria-pressed={activeId === s.id}
              onClick={() => activate(s)}
              className={cx(
                'w-full min-h-12 rounded-xl border px-3.5 py-2 text-left transition-colors',
                activeId === s.id ? 'border-warn bg-warn/10' : 'border-line hover:border-line-strong hover:bg-panel-2',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-semibold">{s.title}</span>
                <span className={cx('chip !text-[11px]', s.severity === 'tinggi' ? '!border-danger/60 !text-danger' : '!border-warn/50 !text-warn')}>
                  {s.severity === 'tinggi' ? 'Keselamatan' : 'Kenyamanan'}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
      {unavailable.length > 0 && (
        <p className="mt-2 text-[13px] text-muted">
          Tidak tersedia pada sistem ini: {unavailable.map((s) => s.shortTitle).join(', ')} (komponennya tidak dipakai).
        </p>
      )}

      {active && (
        <div className="mt-6" data-testid="damage-detail">
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              ariaLabel="Kondisi yang ditampilkan"
              value={view}
              onChange={setView}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'damaged', label: 'Rusak' },
              ]}
            />
          </div>
          <label className="mt-4 block">
            <span className="flex justify-between text-[13px] text-muted">
              <span>Tingkat kerusakan (visual)</span>
              <span className="font-mono text-ink">{Math.round(intensity * 100)}%</span>
            </span>
            <input
              type="range"
              className="range"
              min={0}
              max={1}
              step={0.05}
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              aria-label="Tingkat kerusakan"
              disabled={view !== 'damaged'}
            />
          </label>
          <p className="mt-1 text-[13px] text-muted">Sisi kanan model menampilkan kondisi rusak, sisi kiri tetap normal sebagai pembanding.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
            <div className="rounded-xl border border-ok/30 bg-ok/5 p-3">
              <div className="text-[12px] font-semibold uppercase tracking-wider text-ok">Kondisi normal</div>
              <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{active.normalCondition}</p>
            </div>
            <div className="rounded-xl border border-warn/40 bg-warn/5 p-3">
              <div className="text-[12px] font-semibold uppercase tracking-wider text-warn">Kondisi rusak</div>
              <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{active.damagedCondition}</p>
            </div>
          </div>
          <div className="mt-5">
            <Section title="Apa yang terjadi">{active.failureDescription}</Section>
            <Section title="Gejala yang mungkin dirasakan" icon={<TriangleAlert size={15} />} tone="warn"><BulletList items={active.symptoms} /></Section>
            <Section title="Dampak keselamatan" icon={<ShieldAlert size={15} />} tone="danger"><BulletList items={active.safetyImplications} /></Section>
            <Section title="Pemeriksaan yang disarankan" icon={<Stethoscope size={15} />}><BulletList items={active.inspection} marker="num" /></Section>
          </div>
          <div className="mt-5">
            <Notice tone="warn" icon={<TriangleAlert size={16} className="text-warn" />}>
              Gejala serupa bisa berasal dari komponen lain. Gejala bukan bukti pasti kerusakan komponen tertentu — mintalah mekanik memeriksa langsung.
            </Notice>
          </div>
        </div>
      )}
    </div>
  );
}
