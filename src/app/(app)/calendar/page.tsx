'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, ExternalLink, FilePlus, Search } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const calendarEvents = [
    { id: 1, title: 'Rakornas KemenPUPR', date: '2024-09-10', description: 'Rapat Koordinasi Nasional di Jakarta' },
    { id: 2, title: 'Bimtek Siskeudes', date: '2024-09-15', description: 'Bimbingan Teknis Siskeudes di Bandung' },
    { id: 3, title: 'Bimtek Siskeudes Day 2', date: '2024-09-16', description: 'Lanjutan Bimbingan Teknis Siskeudes' },
    { id: 4, title: 'Meeting Pembahasan DAK', date: '2024-09-20', description: 'Rapat internal pembahasan DAK' },
];

export default function CalendarPage() {
  const [filterDate, setFilterDate] = useState<Date | undefined>();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEvents = calendarEvents.filter(event => {
    const eventDate = new Date(event.date);
    const matchesDate = !filterDate || eventDate.toDateString() === filterDate.toDateString();
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Jadwal Kegiatan"
        description="Lihat dan kelola jadwal kegiatan yang akan datang."
      />

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Cari nama kegiatan..." 
                    className="pl-10" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className='flex gap-2'>
                <Popover>
                <PopoverTrigger asChild>
                    <Button
                    variant={'outline'}
                    className={cn(
                        'w-full md:w-[280px] justify-start text-left font-normal',
                        !filterDate && 'text-muted-foreground'
                    )}
                    >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterDate ? format(filterDate, 'PPP') : <span>Pilih tanggal</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                    mode="single"
                    selected={filterDate}
                    onSelect={setFilterDate}
                    initialFocus
                    />
                </PopoverContent>
                </Popover>
                {filterDate || searchTerm ? (
                    <Button variant="ghost" onClick={() => { setFilterDate(undefined); setSearchTerm('')}}>Reset</Button>
                ) : null}
            </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredEvents.map(event => (
            <Card key={event.id}>
                <CardHeader>
                    <CardTitle className="truncate">{event.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{format(new Date(event.date), 'EEEE, dd MMMM yyyy')}</p>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="ghost" size="sm" asChild>
                       <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer">
                           <ExternalLink className='mr-2' />
                           Detail
                       </a>
                    </Button>
                    <Button asChild size="sm">
                       <Link href={`/sppd/new?title=${encodeURIComponent(event.title)}&startDate=${event.date}`}>
                           <FilePlus className='mr-2' />
                           Buat SPPD
                       </Link>
                    </Button>
                </CardFooter>
            </Card>
        ))}
      </div>
       {filteredEvents.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Tidak ada kegiatan yang ditemukan.</p>
          </div>
        )}
    </div>
  );
}
