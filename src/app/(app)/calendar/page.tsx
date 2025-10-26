'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, ExternalLink, FilePlus, PlusCircle, RefreshCw, Search, MapPin, FileSignature, Clock } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { EventForm } from './components/event-form';
import type { CalendarEvent } from '@/ai/flows/calendar-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Helper to format date into YYYY-MM-DD for API calls
const toYYYYMMDD = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

const getDatePartFromISO = (isoString: string | null | undefined): string | null => {
    if (!isoString) return null;
    return isoString.substring(0, 10);
};

// Helper to format date/time string from Google into a readable Indonesian format
const formatEventDisplay = (startStr: string | null | undefined, endStr: string | null | undefined, isAllDay: boolean) => {
    if (!startStr) return 'Waktu tidak valid';

    try {
        const startDate = parseISO(startStr);
        const endDate = endStr ? parseISO(endStr) : startDate;

        if (isAllDay) {
            const inclusiveEndDate = new Date(endDate.getTime());
            if (isSameDay(startDate, inclusiveEndDate) || startDate.getTime() === inclusiveEndDate.getTime() || (inclusiveEndDate.getTime() - startDate.getTime()) <= (24*60*60*1000)) {
                 return format(startDate, 'EEEE, dd MMMM yyyy', { locale: id });
            } else {
                 inclusiveEndDate.setDate(inclusiveEndDate.getDate() - 1);
                 // Check if the adjusted end date is still after the start date
                 if (inclusiveEndDate > startDate) {
                    return `${format(startDate, 'dd MMMM yyyy', { locale: id })} - ${format(inclusiveEndDate, 'dd MMMM yyyy', { locale: id })}`;
                 }
                 return format(startDate, 'EEEE, dd MMMM yyyy', { locale: id });
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

const extractDisposisi = (description: string | null | undefined): string => {
    if (!description) {
        return '-';
    }
    const lowerDesc = description.toLowerCase();
    const disposisiIndex = lowerDesc.indexOf('disposisi:');

    if (disposisiIndex !== -1) {
        const contentAfterDisposisi = description.substring(disposisiIndex + 'disposisi:'.length);
        const endOfLineIndex = contentAfterDisposisi.indexOf('\n');
        
        if (endOfLineIndex !== -1) {
            return contentAfterDisposisi.substring(0, endOfLineIndex).trim();
        } else {
            return contentAfterDisposisi.trim();
        }
    }

    return '-';
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
      if (!date) {
        setEvents([]);
        setIsLoading(false);
        return;
      }
      
      const selectedDate = toYYYYMMDD(date);
      let url = `/api/events?start=${selectedDate}`;
      
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
        return events;
    }
    
    return events.filter(event => {
        const term = searchTerm.toLowerCase();
        const summaryMatch = event.summary?.toLowerCase().includes(term);
        const descriptionMatch = event.description?.toLowerCase().includes(term);
        const locationMatch = event.location?.toLowerCase().includes(term);

        // Also check if the extracted disposisi matches
        const disposisi = extractDisposisi(event.description).toLowerCase();
        const disposisiMatch = disposisi.includes(term);

        return summaryMatch || descriptionMatch || locationMatch || disposisiMatch;
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
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base line-clamp-2 leading-snug">{event.summary || '(Tanpa Judul)'}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-3 text-sm text-muted-foreground">
                        <p className="flex items-start">
                             <Clock className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-blue-500" />
                             <span className='font-medium text-foreground'>{formatEventDisplay(event.start, event.end, event.isAllDay)}</span>
                        </p>
                        {event.location && (
                           <p className="flex items-start">
                             <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-red-500" />
                             <span>{event.location}</span>
                           </p>
                        )}
                        <p className="flex items-start">
                           <FileSignature className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-green-500" />
                           <span className='line-clamp-2'>Disposisi: {extractDisposisi(event.description)}</span>
                        </p>
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
