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
const formatEventDisplay = (startStr: string | null | undefined, endStr: string | null | undefined, location: string | null | undefined, isAllDay: boolean | undefined) => {
    if (!startStr) return '';

    const startDate = parseISO(startStr);
    const endDate = endStr ? parseISO(endStr) : startDate;

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return '';
    }

    let dateDisplay;

    if (isAllDay) {
        const adjustedEndDate = new Date(endDate.getTime() - 1); // Google's end date for all-day is exclusive
        if (isSameDay(startDate, adjustedEndDate)) {
            dateDisplay = format(startDate, 'EEEE, dd MMMM yyyy', { locale: id });
        } else {
            dateDisplay = `${format(startDate, 'dd MMM', { locale: id })} - ${format(adjustedEndDate, 'dd MMM yyyy', { locale: id })}`;
        }
    } else {
        if (isSameDay(startDate, endDate)) {
            dateDisplay = `${format(startDate, 'EEEE, dd MMMM yyyy, HH:mm', { locale: id })} - ${format(endDate, 'HH:mm', { locale: id })}`;
        } else {
            dateDisplay = `${format(startDate, 'dd MMM, HH:mm', { locale: id })} - ${format(endDate, 'dd MMM yyyy, HH:mm', { locale: id })}`;
        }
    }

    const locationDisplay = location ? ` - ${location}` : '';

    return `${dateDisplay}${locationDisplay}`;
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
      let url = `/api/events?calendarId=${calendarId}`;
      if (date) {
        url += `&start=${toYYYYMMDD(date)}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengambil data dari server.');
      }
      
      setEvents(data.items || []);
    } catch (e: any) {
      console.error("Error fetching calendar events:", e);
      let friendlyMessage = e.message || 'Gagal memuat kegiatan dari kalender.';
      if (friendlyMessage.includes("not found")) {
        friendlyMessage = "Kalender tidak ditemukan atau belum dibagikan ke Service Account. Pastikan ID Kalender benar dan sudah dibagikan.";
      } else if (friendlyMessage.includes("client_email")) {
        friendlyMessage = "Kredensial Service Account (di file .env) sepertinya belum diatur atau tidak valid. Silakan periksa kembali.";
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
    if (!searchTerm && !filterDate) {
        return events;
    }
    const filterDateStr = filterDate ? toYYYYMMDD(filterDate) : null;
    
    return events.filter(event => {
        const eventDateStr = getDatePartFromISO(event.start);
        
        const dateMatch = !filterDateStr || eventDateStr === filterDateStr;

        const term = searchTerm.toLowerCase();
        const searchMatch = !term ||
            event.summary?.toLowerCase().includes(term) ||
            event.description?.toLowerCase().includes(term) ||
            event.location?.toLowerCase().includes(term);

        return dateMatch && searchMatch;
    });
  }, [events, searchTerm, filterDate]);

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
                        <CardTitle className="text-base">{event.summary}</CardTitle>
                        <p className="text-sm text-muted-foreground">{formatEventDisplay(event.start, event.end, event.location, event.isAllDay)}</p>
                    </CardHeader>
                    {event.description && (
                      <CardContent className="flex-grow py-0">
                          <p className="text-sm text-muted-foreground line-clamp-3">{event.description}</p>
                      </CardContent>
                    )}
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
