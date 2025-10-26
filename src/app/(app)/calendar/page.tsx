
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, ExternalLink, FilePlus, PlusCircle, RefreshCw, Search } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { EventForm } from './components/event-form';
import type { CalendarEvent } from '@/ai/flows/calendar-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Helper to format date into YYYY-MM-DD
const toYYYYMMDD = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

const getDatePartFromISO = (isoString: string | null | undefined): string | null => {
    if (!isoString) return null;
    // Handles both '2024-10-27T10:00:00+07:00' and '2024-10-27'
    return isoString.substring(0, 10);
};

// Helper to format date/time string from Google into a readable Indonesian format
const formatEventDateTime = (dateTimeString: string) => {
    const date = parseISO(dateTimeString);
    // If the string only contains a date (all-day event), just format the date part
    if (dateTimeString.length === 10) {
        return format(date, 'EEEE, dd MMMM yyyy', { locale: id });
    }
    // Otherwise, it's a timed event
    return format(date, 'EEEE, dd MMMM yyyy, HH:mm', { locale: id });
};


export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<Date | undefined>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchEvents = useCallback(async (date: Date | undefined) => {
    if (!date) return;
    setIsLoading(true);
    setError(null);
    try {
      const dateStr = toYYYYMMDD(date);
      const response = await fetch(`/api/events?start=${dateStr}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengambil data dari server.');
      }
      
      setEvents(data.items || []);
    } catch (e: any) {
      console.error("Error fetching calendar events:", e);
      setError(e.message || 'Gagal memuat kegiatan dari kalender.');
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(filterDate);
  }, [filterDate, fetchEvents]);

  const filteredBySearchEvents = useMemo(() => {
    if (!searchTerm) {
        return events;
    }
    return events.filter(event => {
        const summaryMatch = event.summary?.toLowerCase().includes(searchTerm.toLowerCase());
        const descriptionMatch = event.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const locationMatch = event.location?.toLowerCase().includes(searchTerm.toLowerCase());
        return summaryMatch || descriptionMatch || locationMatch;
    });
  }, [events, searchTerm]);

  const handleRefresh = () => {
    fetchEvents(filterDate);
  };
  
  const handleSuccess = () => {
    setIsFormOpen(false);
    fetchEvents(filterDate);
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <PageHeader
        title="Jadwal Kegiatan"
        description="Lihat dan kelola jadwal kegiatan yang akan datang."
      >
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
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
                <EventForm onSuccess={handleSuccess} />
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
                {filterDate ? format(filterDate, 'PPP', { locale: id }) : <span>Pilih tanggal</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <Calendar
                locale={id}
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
            {filteredBySearchEvents.map(event => event.id && (
                <Card key={event.id} className="flex flex-col">
                    <CardHeader className="flex-grow pb-4">
                        <CardTitle className="text-base truncate">{event.summary}</CardTitle>
                        {event.start && (
                           <p className="text-sm text-muted-foreground">{formatEventDateTime(event.start.dateTime || event.start.date || '')}</p>
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
                          <Link href={`/sppd/new?title=${encodeURIComponent(event.summary || '')}&startDate=${getDatePartFromISO(event.start?.dateTime || event.start?.date) || ''}`}>
                              <FilePlus className='mr-2 h-4 w-4' />
                              Buat SPPD
                          </Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
          </div>
          {filteredBySearchEvents.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>Tidak ada kegiatan yang ditemukan untuk filter yang dipilih.</p>
                <p className="text-sm">Coba pilih tanggal lain atau reset filter.</p>
              </div>
            )}
        </>
      )}
    </div>
  );
}
