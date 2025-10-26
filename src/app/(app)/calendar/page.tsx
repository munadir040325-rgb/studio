'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, ExternalLink, FilePlus, PlusCircle, RefreshCw, Search, MapPin } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, isSameDay } from 'date-fns';
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
    return isoString.substring(0, 10);
};

// Helper to format date/time string from Google into a readable Indonesian format
const formatEventDisplay = (startStr: string | null | undefined, endStr: string | null | undefined, isAllDay: boolean | undefined) => {
    if (!startStr) return '';

    try {
        const startDate = parseISO(startStr);
        const endDate = endStr ? parseISO(endStr) : startDate;

        if (isAllDay) {
            // For all-day events, Google's end date is exclusive. We subtract a day to get the inclusive end date.
            const inclusiveEndDate = new Date(endDate.getTime() - (24 * 60 * 60 * 1000));
            if (isSameDay(startDate, inclusiveEndDate)) {
                return format(startDate, 'EEEE, dd MMMM yyyy (Seharian)', { locale: id });
            } else {
                return `${format(startDate, 'dd MMM yyyy', { locale: id })} - ${format(inclusiveEndDate, 'dd MMM yyyy', { locale: id })}`;
            }
        } else {
            if (isSameDay(startDate, endDate)) {
                return `${format(startDate, 'EEEE, dd MMMM yyyy, HH:mm', { locale: id })} - ${format(endDate, 'HH:mm', { locale: id })}`;
            } else {
                return `${format(startDate, 'dd MMM yyyy, HH:mm', { locale: id })} - ${format(endDate, 'dd MMM yyyy, HH:mm', { locale: id })}`;
            }
        }
    } catch (e) {
        console.error("Invalid date string provided to formatEventDisplay:", startStr, endStr);
        return 'Waktu tidak valid';
    }
};


export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<Date | undefined>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchEvents = useCallback(async (date: Date | undefined) => {
    setIsLoading(true);
    setError(null);
    try {
      const calendarId = 'kecamatan.gandrungmangu2020@gmail.com';
      // If no date is selected, fetch a wide range. Otherwise, fetch for the selected day.
      const startDate = date ? toYYYYMMDD(date) : toYYYYMMDD(new Date(new Date().setFullYear(new Date().getFullYear() - 1)));
      const endDate = date ? toYYYYMMDD(date) : toYYYYMMDD(new Date(new Date().setFullYear(new Date().getFullYear() + 1)));

      let url = `/api/events?calendarId=${calendarId}&start=${startDate}&end=${endDate}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengambil data dari server.');
      }
      
      setEvents(data.items || []);
    } catch (e: any) {
      console.error("Error fetching calendar events:", e);
      let friendlyMessage = e.message || 'Gagal memuat kegiatan dari kalender.';
      if (friendlyMessage.includes("client_email") || friendlyMessage.includes("private_key")) {
        friendlyMessage = "Kredensial Google Service Account (di file .env) sepertinya belum diatur atau tidak valid. Silakan periksa kembali.";
      } else if (friendlyMessage.includes("not found")) {
        friendlyMessage = "Kalender tidak ditemukan atau belum dibagikan ke email Service Account. Pastikan ID Kalender benar dan izin telah diberikan.";
      }
      setError(friendlyMessage);
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
        return events; // When no search term, return all events for the selected date
    }
    
    return events.filter(event => {
        const term = searchTerm.toLowerCase();
        return event.summary?.toLowerCase().includes(term) ||
            event.description?.toLowerCase().includes(term) ||
            event.location?.toLowerCase().includes(term);
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
                <Button variant="ghost" onClick={() => { setFilterDate(new Date()); setSearchTerm('')}}>Reset</Button>
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
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base line-clamp-2">{event.summary || '(Tanpa Judul)'}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-2 text-sm">
                        <p className="text-muted-foreground">
                            {formatEventDisplay(event.start, event.end, event.isAllDay)}
                        </p>
                        {event.location && (
                           <p className="flex items-start text-muted-foreground">
                             <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                             <span>{event.location}</span>
                           </p>
                        )}
                        {/* Placeholder untuk Disposisi, bisa diisi nanti */}
                        {/* <p className="text-muted-foreground">Disposisi: -</p> */}
                        {event.description && (
                            <p className="text-muted-foreground pt-2 line-clamp-3">
                                {event.description}
                            </p>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-wrap justify-end gap-2 pt-4 mt-auto">
                        {event.htmlLink && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={event.htmlLink} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className='mr-2 h-4 w-4' />
                                Detail
                            </a>
                          </Button>
                        )}
                        <Button asChild size="sm">
                          <Link href={`/sppd/new?title=${encodeURIComponent(event.summary || '')}&startDate=${getDatePartFromISO(event.start) || ''}`}>
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
