import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Boxes, CircleHelp, Cog, FlaskConical, Rotate3d, Stethoscope, User, Wrench } from 'lucide-react';
import { WORKSHOP } from '../config/workshop';
import { useMode } from '../state/modeStore';

const CONSUMER = [
  { icon: Rotate3d, text: 'Model 3D lima jenis suspensi yang bisa diputar' },
  { icon: BookOpen, text: 'Penjelasan sederhana fungsi setiap komponen' },
  { icon: FlaskConical, text: 'Simulasi kerusakan umum: normal vs rusak' },
  { icon: CircleHelp, text: 'Gejala yang mungkin dirasakan & kuis singkat' },
];
const MECHANIC = [
  { icon: Boxes, text: 'Hierarki arsitektur → rakitan → komponen → subkomponen' },
  { icon: FlaskConical, text: 'Mekanisme kegagalan spesifik dengan simulasi mekanis' },
  { icon: Cog, text: 'Modul kemudi: rack & pinion, HPS, EPS' },
  { icon: Stethoscope, text: 'Anatomi komponen (rakitan / urai / potongan) & latihan diagnosis' },
];

export default function LandingPage() {
  const lastMode = useMode((s) => s.lastMode);
  const lastPath = useMode((s) => s.lastPath);
  return (
    <div className="min-h-dvh flex flex-col" data-testid="landing">
      <header className="flex h-16 items-center gap-3 border-b border-line px-5">
        <img src={WORKSHOP.logoOnDark} alt="" className="h-8 w-auto" />
        <div className="leading-none">
          <div className="text-[16px] font-bold">Suspension <span className="text-accent">Lab</span></div>
          <div className="mt-1 text-[11px] text-muted">{WORKSHOP.name}</div>
        </div>
      </header>
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(#1f2d45_1px,transparent_1px),linear-gradient(90deg,#1f2d45_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_at_50%_0%,black,transparent_75%)]" />
          <div className="relative mx-auto max-w-6xl px-5 pt-14 pb-8 text-center">
            <h1 className="text-[34px] sm:text-[46px] font-bold leading-[1.1] tracking-tight">
              Laboratorium suspensi & kemudi <span className="text-accent">interaktif</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-[16.5px] leading-relaxed text-ink-2">
              Pilih cara belajar Anda: penjelasan sederhana untuk pemilik kendaraan, atau ruang belajar teknis lengkap untuk mekanik dan siswa otomotif.
            </p>
            {lastMode && (
              <Link to={lastPath[lastMode]} className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent" data-testid="resume">
                Lanjutkan di Mode {lastMode === 'mechanic' ? 'Mekanik' : 'Konsumen'} <ArrowRight size={15} />
              </Link>
            )}
          </div>
          <div className="relative mx-auto grid max-w-6xl gap-5 px-5 pb-14 md:grid-cols-2">
            <Link to="/consumer" className="panel group flex flex-col p-6 transition-colors hover:border-accent/70" data-testid="enter-consumer">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent/40 bg-accent/10 text-accent"><User size={24} /></div>
                <div>
                  <h2 className="text-[22px] font-bold">Mode Konsumen</h2>
                  <p className="text-[14px] text-muted">Pemilik kendaraan & umum</p>
                </div>
              </div>
              <ul className="mt-5 flex-1 space-y-2.5">
                {CONSUMER.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-2.5 text-[15px] text-ink-2"><Icon size={18} className="mt-0.5 shrink-0 text-accent" />{text}</li>
                ))}
              </ul>
              <span className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-semibold text-accent">Masuk Mode Konsumen <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
            <Link to="/mechanic" className="panel group flex flex-col p-6 transition-colors hover:border-mech/70" data-testid="enter-mechanic">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-mech/40 bg-mech/10 text-mech"><Wrench size={24} /></div>
                <div>
                  <h2 className="text-[22px] font-bold">Mode Mekanik</h2>
                  <p className="text-[14px] text-muted">Mekanik, siswa otomotif, service advisor</p>
                </div>
              </div>
              <ul className="mt-5 flex-1 space-y-2.5">
                {MECHANIC.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-2.5 text-[15px] text-ink-2"><Icon size={18} className="mt-0.5 shrink-0 text-mech" />{text}</li>
                ))}
              </ul>
              <span className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-semibold text-mech">Masuk Mode Mekanik <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          </div>
        </section>
        <p className="mx-auto max-w-3xl px-5 pb-10 text-center text-[13px] leading-relaxed text-muted">
          Model 3D bersifat ilustratif dan disederhanakan; simulasi kerusakan adalah alat bantu belajar, bukan alat diagnosis. Diagnosis yang tepat memerlukan pemeriksaan langsung.
        </p>
      </main>
      <footer className="border-t border-line px-5 py-5 text-center text-[13px] text-muted">Suspension Lab · {WORKSHOP.name}</footer>
    </div>
  );
}
