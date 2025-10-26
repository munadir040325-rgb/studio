
import { PageHeader } from '@/components/page-header';

export default function SpjPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Kelola SPJ"
        description="Kelola semua Surat Pertanggungjawaban (SPJ) di satu tempat."
      />
      <div className="text-center py-20 bg-muted rounded-lg">
        <h2 className="text-xl font-semibold">Halaman SPJ</h2>
        <p className="text-muted-foreground">Konten untuk pengelolaan SPJ akan ditampilkan di sini.</p>
      </div>
    </div>
  );
}
