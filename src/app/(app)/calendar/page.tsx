'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, ExternalLink, FilePlus, PlusCircle, RefreshCw, Search } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { EventForm } from './components/event-form';
import { listCalendarEvents, type CalendarEvent } from '@/ai/flows/calendar-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<Date | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedEvents = await listCalendarEvents();
      setEvents(fetchedEvents || []);
    } catch (e: any) {
      console.error("Error fetching calendar events:", e);
      let errorMessage = 'Gagal memuat kegiatan dari kalender.';
       if (e.message) {
          errorMessage = e.message;
      }
      if (e.message && (e.message.includes('permission') || e.message.includes('not configured'))) {
          errorMessage = 'Akses ditolak. Pastikan Service Account memiliki izin untuk mengakses kalender, kalender telah dibagikan ke email Service Account, dan kredensial sudah benar.';
      }
      setError(errorMessage);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = events.filter(event => {
    if (!event.start?.dateTime) return false;
    
    const eventDate = new Date(event.start.dateTime);

    const matchesDate = !filterDate || (
      eventDate.getUTCFullYear() === filterDate.getUTCFullYear() &&
      eventDate.getUTCMonth() === filterDate.getUTCMonth() &&
      eventDate.getUTCDate() === filterDate.getUTCDate()
    );

    const summaryMatch = event.summary?.toLowerCase().includes(searchTerm.toLowerCase());
    const descriptionMatch = event.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const locationMatch = event.location?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesDate && (summaryMatch || descriptionMatch || locationMatch);
  });

  return (
    <div className="flex flex-col gap-6 w-full">
      <PageHeader
        title="Jadwal Kegiatan"
        description="Lihat dan kelola jadwal kegiatan yang akan datang."
      >
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={fetchEvents} disabled={isLoading}>
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                <span className="sr-only">Muat Ulang</span>
            </Button>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
                <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Tambah Kegiatan
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                <DialogTitle>Tambah Kegiatan Baru</DialogTitle>
                </DialogHeader>
                <EventForm 
                onSuccess={() => {
                    setIsFormOpen(false);
                    fetchEvents();
                }} 
                />
            </DialogContent>
            </Dialog>
        </div>
      </PageHeader>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Cari nama, deskripsi, atau lokasi..." 
                className="pl-10 w-full" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className='flex flex-col sm:flex-row gap-2 w-full md:w-auto'>
            <Popover>
            <PopoverTrigger asChild>
                <Button
                variant={'outline'}
                className={cn(
                    'w-full justify-start text-left font-normal md:w-[240px]',
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
      </div>
      
      {isLoading && <div className="text-center py-12 text-muted-foreground">Memuat kegiatan...</div>}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Terjadi Kesalahan</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}
      
      {!isLoading && !error && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredEvents.map(event => event.id && (
                <Card key={event.id} className="flex flex-col">
                    <CardHeader className="flex-grow pb-4">
                        <CardTitle className="text-base truncate">{event.summary}</CardTitle>
                        {event.start?.dateTime && (
                           <p className="text-sm text-muted-foreground">{format(new Date(event.start.dateTime), 'EEEE, dd MMMM yyyy, HH:mm')}</p>
                        )}
                    </CardHeader>
                    <CardContent className="flex-grow py-0">
                        <p className="text-sm text-muted-foreground line-clamp-3">{event.description || 'Tidak ada deskripsi.'}</p>
                    </CardContent>
                    <CardFooter className="flex flex-wrap justify-end gap-2 pt-4">
                        {event.htmlLink && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={event.htmlLink} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className='mr-2 h-4 w-4' />
                                Detail
                            </a>
                          </Button>
                        )}
                        <Button asChild size="sm">
                          <Link href={`/sppd/new?title=${encodeURIComponent(event.summary || '')}&startDate=${event.start?.dateTime ? format(new Date(event.start.dateTime), 'yyyy-MM-dd') : ''}`}>
                              <FilePlus className='mr-2 h-4 w-4' />
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
                <p className="text-sm">Pastikan filter tanggal sudah benar atau coba muat ulang.</p>
              </div>
            )}
        </>
      )}
    </div>
  );
}
