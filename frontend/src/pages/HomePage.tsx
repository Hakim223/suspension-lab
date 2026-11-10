import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CircleHelp, FlaskConical, MousePointerClick, Rotate3d, ShieldAlert } from 'lucide-react';
import { useContent } from '../data/contentStore';
import { TopBar } from '../components/layout/TopBar';
import { Notice } from '../components/ui/primitives';
import { WORKSHOP } from '../config/workshop';

const STEPS = [
  { icon: Rotate3d, title: 'Putar & perbesar', text: 'Seret model 3D untuk melihat dari segala sisi. Cubit atau scroll untuk zoom.' },
  { icon: MousePointerClick, title: 'Ketuk komponen', text: 'Pelajari fungsi, cara kerja, gejala kerusakan, dan cara mekanik memeriksanya.' },
  { icon: FlaskConical, title: 'Lihat simulasi', text: 'Bandingkan kondisi normal dan rusak, misalnya shock lemah atau ball joint longgar.' },
];

export default function HomePage() {
  const suspensions = useContent((s) => s.suspensions);
  return (
    <div className="min-h-dvh flex flex-col">
      <TopBar />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-line">
          <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(#1f2d45_1px,transparent_1px),linear-gradient(90deg,#1f2d45_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_70%_30%,black,transparent_70%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-14 md:py-20 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <div className="flex items-center gap-3">
                <img src="/brand/logo-light.png" alt={`Logo ${WORKSHOP.name}`} className="h-12 w-auto" />
                <div className="leading-tight">
                  <div className="text-[15px] font-semibold">{WORKSHOP.name}</div>
                  <div className="text-[13px] text-muted">Spesialis suspensi & kaki-kaki mobil</div>
                </div>
              </div>
              <h1 className="mt-5 text-[38px] leading-[1.08] font-bold tracking-tight sm:text-[52px]">
                Kenali kaki-kaki mobil Anda <span className="text-accent">dalam 3D.</span>
              </h1>
              <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-2">
                Suspension Lab dari {WORKSHOP.name} membantu Anda memahami cara kerja suspensi, fungsi setiap komponen, dan tanda-tanda kerusakan — sehingga Anda lebih yakin saat berdiskusi dengan mekanik kami.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/jelajah/macpherson" className="btn btn-primary min-h-12 px-6 text-[16px]" data-testid="cta-explore">
                  Mulai jelajah 3D <ArrowRight size={18} />
                </Link>
                <Link to="/belajar" className="btn min-h-12 px-5 text-[16px]">
                  <BookOpen size={18} /> Dasar-dasar suspensi
                </Link>
              </div>
            </div>
            <ol className="grid gap-3">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="panel flex gap-4 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-panel-2 text-accent">
                    <Icon size={22} />
                  </div>
                  <div>
                    <div className="text-[15.5px] font-semibold"><span className="text-muted font-mono mr-2">0{i + 1}</span>{title}</div>
                    <p className="mt-1 text-[14.5px] leading-relaxed text-ink-2">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-12" aria-labelledby="pilih-sistem">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="pilih-sistem" className="text-[26px] font-bold tracking-tight">Pilih jenis suspensi</h2>
              <p className="mt-1 text-[15.5px] text-ink-2">Setiap jenis memiliki susunan komponen yang berbeda.</p>
            </div>
          </div>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {[...suspensions].sort((a, b) => a.sortOrder - b.sortOrder).map((s) => (
              <li key={s.id}>
                <Link
                  to={`/jelajah/${s.id}`}
                  className="panel group flex h-full flex-col overflow-hidden transition-colors hover:border-accent/60"
                  data-testid={`card-${s.id}`}
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-bg">
                    <img
                      src={`/thumbs/${s.id}.webp`}
                      alt={`Ilustrasi 3D suspensi ${s.name}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
                    />
                    <span className="absolute left-2.5 top-2.5 chip !bg-bg/85 !text-[11.5px]">Roda {s.axlePosition}</span>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="text-[17px] font-semibold">{s.name}</h3>
                    <p className="mt-1.5 flex-1 text-[14px] leading-relaxed text-ink-2">{s.tagline}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent">
                      Jelajahi <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto grid max-w-7xl gap-4 px-5 pb-14 md:grid-cols-2">
          <Link to="/belajar" className="panel flex items-center gap-4 p-5 hover:border-accent/60">
            <BookOpen size={28} className="text-accent shrink-0" />
            <div>
              <div className="text-[17px] font-semibold">Belajar dasar-dasar</div>
              <p className="text-[14.5px] text-ink-2">Apa itu suspensi, istilah penting, dan kapan perlu diperiksa.</p>
            </div>
          </Link>
          <Link to="/kuis" className="panel flex items-center gap-4 p-5 hover:border-accent/60">
            <CircleHelp size={28} className="text-accent shrink-0" />
            <div>
              <div className="text-[17px] font-semibold">Uji pemahaman Anda</div>
              <p className="text-[14.5px] text-ink-2">Kuis singkat 10 pertanyaan — opsional dan tanpa pendaftaran.</p>
            </div>
          </Link>
          <div className="md:col-span-2">
            <Notice tone="warn" icon={<ShieldAlert size={18} className="text-warn" />}>
              Materi di aplikasi ini bersifat edukasi. Model 3D adalah ilustrasi yang disederhanakan, dan simulasi kerusakan dilebih-lebihkan agar mudah dipahami. Gejala bukan bukti pasti kerusakan komponen tertentu — diagnosis yang tepat memerlukan pemeriksaan langsung oleh mekanik.
            </Notice>
          </div>
        </section>
      </main>
      <footer className="border-t border-line px-5 py-6 text-center text-[13px] text-muted">
        Suspension Lab · Platform edukasi suspensi kendaraan oleh {WORKSHOP.name}
      </footer>
    </div>
  );
}
