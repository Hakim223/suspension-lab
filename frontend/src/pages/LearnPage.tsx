import { Link } from 'react-router-dom';
import { ArrowRight, CircleHelp, ShieldAlert } from 'lucide-react';
import { glossary } from '@suspension-lab/shared';
import { TopBar } from '../components/layout/TopBar';
import { BulletList, Notice } from '../components/ui/primitives';

const JOBS = [
  { title: 'Menopang', text: 'Menahan berat mobil, penumpang, dan barang sehingga tinggi kendaraan tetap terjaga.' },
  { title: 'Meredam', text: 'Menyerap benturan dari jalan dan menghentikan ayunan agar kabin nyaman.' },
  { title: 'Menjaga roda', text: 'Menjaga ban tetap menapak dan pada sudut yang benar agar mobil mudah dikendalikan dan dapat mengerem dengan baik.' },
];

const WARNING_SIGNS = [
  'Bunyi ketukan, dentuman, atau decitan dari kolong mobil di jalan rusak',
  'Mobil terus mengayun setelah melewati polisi tidur',
  'Setir terasa longgar, bergetar, atau tidak kembali lurus',
  'Mobil menarik ke satu sisi',
  'Ban aus tidak rata (di satu sisi atau bergelombang)',
  'Bodi terlihat lebih rendah atau miring ke satu sisi',
  'Ada rembesan oli pada shock absorber',
];

export default function LearnPage() {
  return (
    <div className="min-h-dvh flex flex-col">
      <TopBar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">
        <h1 className="text-[34px] font-bold tracking-tight">Dasar-dasar suspensi</h1>
        <p className="mt-3 text-[17px] leading-relaxed text-ink-2">
          Suspensi adalah sistem yang menghubungkan roda dengan bodi mobil. Sistem ini terdiri dari pegas, peredam, lengan-lengan, dan sambungan yang bekerja bersama agar mobil nyaman, stabil, dan aman.
        </p>

        <h2 className="mt-10 text-[22px] font-semibold">Tiga tugas utama suspensi</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {JOBS.map((j, i) => (
            <div key={j.title} className="panel p-4">
              <div className="font-mono text-[13px] text-accent">0{i + 1}</div>
              <div className="mt-1 text-[17px] font-semibold">{j.title}</div>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-2">{j.text}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-10 text-[22px] font-semibold">Independen atau tidak?</h2>
        <div className="mt-3 space-y-3 text-[15.5px] leading-relaxed text-ink-2">
          <p><b className="text-ink">Independen</b> — setiap roda bergerak sendiri. Contoh: MacPherson strut, double wishbone, multi-link.</p>
          <p><b className="text-ink">Semi-independen</b> — roda kiri dan kanan terhubung, tetapi masih bisa bergerak sedikit berbeda. Contoh: torsion beam.</p>
          <p><b className="text-ink">Dependen (poros kaku)</b> — kedua roda berada pada satu poros, sehingga gerakan satu roda memengaruhi roda lainnya. Contoh: rigid axle.</p>
        </div>

        <h2 className="mt-10 text-[22px] font-semibold">Contoh sehari-hari</h2>
        <p className="mt-3 text-[15.5px] leading-relaxed text-ink-2">
          Saat mobil melewati polisi tidur, roda terangkat. Per memendek untuk menyerap benturan, lalu memanjang kembali. Tanpa shock absorber, per akan terus memantul seperti bola karet. Shock absorber "mengerem" pantulan itu sehingga mobil kembali tenang dalam sekejap.
        </p>

        <h2 className="mt-10 text-[22px] font-semibold">Tanda-tanda suspensi perlu diperiksa</h2>
        <div className="mt-3 text-[15.5px] leading-relaxed text-ink-2"><BulletList items={WARNING_SIGNS} /></div>
        <div className="mt-4">
          <Notice tone="warn" icon={<ShieldAlert size={18} className="text-warn" />}>
            Tanda-tanda di atas dapat berasal dari berbagai komponen. Jangan menebak sendiri — biarkan mekanik memeriksa langsung dengan mobil diangkat dan, bila perlu, uji jalan. Bila setir terasa sangat longgar atau ada bunyi keras disertai perubahan arah, kurangi kecepatan dan segera periksakan.
          </Notice>
        </div>

        <h2 className="mt-10 text-[22px] font-semibold">Istilah penting</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {glossary.map((g) => (
            <div key={g.term} className="panel p-4">
              <dt className="text-[15.5px] font-semibold text-ink">{g.term}</dt>
              <dd className="mt-1 text-[14.5px] leading-relaxed text-ink-2">{g.definition}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/jelajah/macpherson" className="btn btn-primary min-h-12 px-5">Lihat dalam 3D <ArrowRight size={18} /></Link>
          <Link to="/kuis" className="btn min-h-12 px-5"><CircleHelp size={18} /> Ikuti kuis</Link>
        </div>
      </main>
    </div>
  );
}
