import { Link } from 'react-router-dom';
import { TopBar } from '../components/layout/TopBar';

export default function NotFoundPage() {
  return (
    <div className="min-h-dvh flex flex-col">
      <TopBar />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
        <h1 className="text-[28px] font-bold">Halaman tidak ditemukan</h1>
        <p className="text-ink-2">Alamat yang Anda buka tidak tersedia.</p>
        <Link to="/" className="btn btn-primary">Kembali ke beranda</Link>
      </main>
    </div>
  );
}
