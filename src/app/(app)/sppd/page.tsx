import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle, Search } from 'lucide-react';
import Link from 'next/link';
import { SppdTable } from './components/sppd-table';
import { sppds } from '@/lib/data';

export default function SppdPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Kelola SPPD"
        description="Kelola semua surat perintah perjalanan dinas (SPPD) di satu tempat."
      >
        <Button asChild>
          <Link href="/sppd/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            SPPD Baru
          </Link>
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari berdasarkan kegiatan atau tujuan..." className="pl-10" />
          </div>
          <Select>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter berdasarkan status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="ON-GOING">On-Going</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELED">Canceled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <SppdTable data={sppds} />
      </div>
    </div>
  );
}
