'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { employees } from '@/lib/data';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

function NewSppdForm() {
  const searchParams = useSearchParams();
  const [activity, setActivity] = useState('');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  useEffect(() => {
    const title = searchParams.get('title');
    const startDate = searchParams.get('startDate');
    
    if (title) {
      setActivity(decodeURIComponent(title));
    }

    if (startDate) {
        const start = new Date(startDate);
        setDateRange({ from: start, to: start });
    }
  }, [searchParams]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Buat SPPD Baru"
        description="Isi detail di bawah ini untuk membuat surat tugas perjalanan baru."
      >
        <div className="flex gap-2">
            <Button variant="outline" asChild><Link href="/sppd">Batal</Link></Button>
            <Button>
            <Save className="mr-2 h-4 w-4" />
            Simpan SPPD
            </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Detail SPPD</CardTitle>
              <CardDescription>
                Berikan informasi utama untuk tugas perjalanan.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="activity">Kegiatan</Label>
                <Input 
                  id="activity" 
                  placeholder="e.g., Rapat Koordinasi Nasional"
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sppd-number">Nomor SPPD</Label>
                <Input id="sppd-number" placeholder="e.g., ST/001/III/2024" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="destination">Tujuan</Label>
                <Input id="destination" placeholder="e.g., Jakarta" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="executors">Pelaksana</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih pegawai" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label>Tanggal Perjalanan</Label>
                    <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        variant={'outline'}
                        className={cn(
                            'justify-start text-left font-normal',
                            !dateRange.from && 'text-muted-foreground'
                        )}
                        >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? (
                            dateRange.to ? (
                            <>
                                {format(dateRange.from, 'LLL dd, y')} -{' '}
                                {format(dateRange.to, 'LLL dd, y')}
                            </>
                            ) : (
                            format(dateRange.from, 'LLL dd, y')
                            )
                        ) : (
                            <span>Pilih rentang tanggal</span>
                        )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        initialFocus
                        />
                    </PopoverContent>
                    </Popover>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Deskripsi / Catatan</Label>
                <Textarea id="description" placeholder="Tambahkan catatan relevan di sini." />
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Integrasi Srikandi</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
               <div className="grid gap-2">
                <Label htmlFor="srikandi-number">Nomor Srikandi (Opsional)</Label>
                <Input id="srikandi-number" placeholder="Masukkan nomor Srikandi" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


function FormSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Buat SPPD Baru"
        description="Isi detail di bawah ini untuk membuat surat tugas perjalanan baru."
      >
        <div className="flex gap-2">
          <Button variant="outline" disabled>Batal</Button>
          <Button disabled>
            <Save className="mr-2 h-4 w-4" />
            Simpan SPPD
          </Button>
        </div>
      </PageHeader>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detail SPPD</CardTitle>
              <CardDescription>
                Berikan informasi utama untuk tugas perjalanan.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="space-y-2">
                <Label>Kegiatan</Label>
                <Skeleton className="h-10 w-full" />
              </div>
               <div className="space-y-2">
                <Label>Nomor SPPD</Label>
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function NewSppdPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <NewSppdForm />
    </Suspense>
  )
}
