import { Link } from 'react-router-dom';
import { ArrowRight, Boxes, Cog, ScanLine, Stethoscope } from 'lucide-react';
import { suspensions } from '@suspension-lab/shared';
import { MechHeading, MechPage } from '../components/MechLayout';
import { ARCHITECTURES, MECH_COMPONENTS, STEERING_SYSTEMS } from '../data';
import { DIAGNOSTIC_CASES, DIAGNOSTIC_PRINCIPLES } from '../data/diagnostics';
import { ANATOMY_CATALOG } from '../anatomy/catalog';

const failureCount = MECH_COMPONENTS.reduce((n, c) => n + c.failureModes.length, 0);
const steeringFailureCount = STEERING_SYSTEMS.reduce((n, s) => n + s.parts.reduce((m, p) => m + p.failureModes.length, 0), 0);

export default function MechanicHome() {
  const modules = [
    { to: '/mechanic/arsitektur/macpherson', icon: Boxes, code: 'M1', title: 'Arsitektur & Simulasi Kegagalan', text: `5 arsitektur, ${MECH_COMPONENTS.length} komponen, ${failureCount} mode kegagalan dengan simulasi pada model 3D.` },
    { to: '/mechanic/kemudi', icon: Cog, code: 'M2', title: 'Sistem Kemudi', text: `Rack & pinion, HPS dan EPS (column/pinion/rack-assist) — ${steeringFailureCount} kegagalan dengan model gaya kemudi.` },
    { to: '/mechanic/anatomi', icon: ScanLine, code: 'M3', title: 'Anatomi Komponen', text: `${ANATOMY_CATALOG.length} model anatomi: rakitan, urai, dan potongan internal.` },
    { to: '/mechanic/diagnosis', icon: Stethoscope, code: 'M4', title: 'Latihan Diagnosis', text: `${DIAGNOSTIC_CASES.length} kasus dari keluhan pelanggan ke prosedur inspeksi.` },
  ];
  return (
    <MechPage testId="mechanic-home">
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 py-8">
        <div className="font-mono text-[11px] tracking-[0.2em] text-mech">MODE MEKANIK</div>
        <h1 className="mt-1 text-[28px] sm:text-[34px] font-bold tracking-tight">Ruang belajar teknis suspensi & kemudi</h1>
        <p className="mt-2 max-w-3xl text-[15.5px] leading-relaxed text-ink-2">
          Arsitektur → rakitan → komponen → subkomponen → mekanisme kegagalan → efek mekanis → gejala → prosedur inspeksi. Untuk mekanik, siswa otomotif, service advisor dan penggemar teknik.
        </p>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map(({ to, icon: Icon, code, title, text }) => (
            <Link key={to} to={to} className="panel group flex flex-col p-5 hover:border-mech/60" data-testid={`module-${code}`}>
              <div className="flex items-center justify-between">
                <Icon size={24} className="text-mech" />
                <span className="font-mono text-[12px] text-muted">{code}</span>
              </div>
              <h2 className="mt-3 text-[17px] font-semibold">{title}</h2>
              <p className="mt-1.5 flex-1 text-[14px] leading-relaxed text-ink-2">{text}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-[14px] font-semibold text-mech">Buka <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          ))}
        </div>

        <section className="mt-10">
          <MechHeading code="ARC">Pilih arsitektur suspensi</MechHeading>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {ARCHITECTURES.map((a) => {
              const s = suspensions.find((x) => x.id === a.id)!;
              const n = a.assemblies.reduce((k, x) => k + x.components.length, 0);
              return (
                <li key={a.id}>
                  <Link to={`/mechanic/arsitektur/${a.id}`} className="panel block h-full overflow-hidden hover:border-mech/60" data-testid={`arch-${a.id}`}>
                    <img src={`/thumbs/${a.id}.webp`} alt="" className="aspect-[16/10] w-full object-cover" loading="lazy" />
                    <div className="p-3.5">
                      <div className="text-[15px] font-semibold">{s.name}</div>
                      <div className="mt-0.5 font-mono text-[11.5px] text-muted">{s.axlePosition.toUpperCase()} · {s.independence} · {n} komponen</div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-10">
          <MechHeading code="DX">Prinsip diagnosis</MechHeading>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DIAGNOSTIC_PRINCIPLES.map((p) => (
              <div key={p.title} className="panel p-4">
                <div className="text-[15px] font-semibold">{p.title}</div>
                <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{p.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </MechPage>
  );
}
