'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, ExternalLink, PlusCircle, RefreshCw, Search, MapPin, FileSignature, Clock } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, isSameDay, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, eachDayOfInterval, getDay, isSameMonth, getDate } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { EventForm } from './components/event-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type CalendarEvent = {
    id: string | null | undefined;
    summary: string | null | undefined;
    description: string | null | undefined;
    location: string | null | undefined;
    start: string | null | undefined;
    end: string | null | undefined;
    isAllDay: boolean;
    htmlLink: string | null | undefined;
}

const formatEventDisplay = (startStr: string | null | undefined, endStr: string | null | undefined, isAllDay: boolean) => {
    if (!startStr) return 'Waktu tidak valid';

    try {
        const startDate = parseISO(startStr);
        const endDate = endStr ? parseISO(endStr) : startDate;

        if (isAllDay) {
            const inclusiveEndDate = new Date(endDate.getTime());
            if (isSameDay(startDate, inclusiveEndDate) || startDate.getTime() === inclusiveEndDate.getTime() || (inclusiveEndDate.getTime() - startDate.getTime()) <= (24*60*60*1000)) {
                 return format(startDate, 'EEEE, dd MMMM yyyy', { locale: localeId });
            } else {
                 inclusiveEndDate.setDate(inclusiveEndDate.getDate() - 1);
                 if (inclusiveEndDate > startDate) {
                    return `${format(startDate, 'dd MMMM yyyy', { locale: localeId })} - ${format(inclusiveEndDate, 'dd MMMM yyyy', { locale: localeId })}`;
                 }
                 return format(startDate, 'EEEE, dd MMMM yyyy', { locale: localeId });
            }
        } else {
            if (isSameDay(startDate, endDate)) {
                return `${format(startDate, 'HH:mm', { locale: localeId })} - ${format(endDate, 'HH:mm', { locale:localeId })}`;
            } else {
                return `${format(startDate, 'dd MMM, HH:mm', { locale: localeId })} - ${format(endDate, 'dd MMM, HH:mm', { locale: localeId })}`;
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

const EventCard = ({ event }: { event: CalendarEvent }) => (
  <Card key={event.id} className="flex flex-col">
      <CardHeader className="pb-4">
          <CardTitle className="text-base line-clamp-2 leading-snug">{event.summary || '(Tanpa Judul)'}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow space-y-3 text-sm text-muted-foreground">
          <div className="space-y-2">
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
          </div>
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
      </CardFooter>
  </Card>
);

const groupEventsByDay = (events: CalendarEvent[]) => {
    const grouped = new Map<string, CalendarEvent[]>();
    events.forEach(event => {
        if (!event.start) return;
        const start = startOfDay(parseISO(event.start));
        const end = event.end ? startOfDay(parseISO(event.end)) : start;
        const eventDurationDays = eachDayOfInterval({ start, end });

        eventDurationDays.forEach(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            if (!grouped.has(dayKey)) {
                grouped.set(dayKey, []);
            }
            grouped.get(dayKey)!.push(event);
        });
    });
    return grouped;
};


const WeeklyView = ({ events, baseDate }: { events: CalendarEvent[], baseDate: Date }) => {
    const weekDays = eachDayOfInterval({
        start: startOfWeek(baseDate, { weekStartsOn: 1 }),
        end: endOfWeek(baseDate, { weekStartsOn: 1 }),
    });

    const eventsByDay = useMemo(() => groupEventsByDay(events), [events]);
    const weekDayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];


    return (
        <div className="border rounded-lg">
            <div className="grid grid-cols-7 border-b">
                {weekDayNames.map(dayName => (
                    <div key={dayName} className="p-2 text-center font-semibold text-sm text-muted-foreground">{dayName}</div>
                ))}
            </div>
            <div className="grid grid-cols-7">
                {weekDays.map(day => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const dayEvents = eventsByDay.get(dayKey) || [];
                    return (
                        <div key={dayKey} className="relative h-40 border-l border-b p-2 overflow-hidden first:border-l-0">
                            <span className={cn(
                                "font-semibold",
                                isSameDay(day, new Date()) ? "text-primary font-bold" : "text-muted-foreground"
                            )}>
                                {format(day, 'd')}
                            </span>
                            <div className="mt-1 space-y-1">
                                {dayEvents.slice(0, 3).map(event => (
                                    <div key={event.id} className="bg-primary/20 text-primary-foreground p-1 rounded-md text-xs truncate">
                                        {event.summary}
                                    </div>
                                ))}
                                {dayEvents.length > 3 && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                        + {dayEvents.length - 3} lainnya
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const MonthlyView = ({ events, baseDate }: { events: CalendarEvent[], baseDate: Date }) => {
    const startOfMonthDate = startOfMonth(baseDate);
    const endOfMonthDate = endOfMonth(baseDate);
    const calendarStart = startOfWeek(startOfMonthDate, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(endOfMonthDate, { weekStartsOn: 1 });

    const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const eventsByDay = useMemo(() => groupEventsByDay(events), [events]);
    const weekDayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

    return (
        <div className="border rounded-lg">
             <div className="grid grid-cols-7 border-b">
                {weekDayNames.map(dayName => (
                    <div key={dayName} className="p-2 text-center font-semibold text-sm text-muted-foreground">{dayName}</div>
                ))}
            </div>
            <div className="grid grid-cols-7">
                {monthDays.map(day => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const dayEvents = eventsByDay.get(dayKey) || [];
                    return (
                        <div key={dayKey} className={cn(
                            "relative h-32 border-l border-b p-2 overflow-hidden",
                            (getDay(day) === 0) && "border-l-0" // sunday
                        )}>
                            <span className={cn(
                                "font-semibold",
                                !isSameMonth(day, baseDate) && "text-muted-foreground/50",
                                isSameDay(day, new Date()) && "text-primary font-bold"
                            )}>
                                {getDate(day)}
                            </span>
                             <div className="mt-1 space-y-1">
                                {dayEvents.slice(0, 2).map(event => (
                                    <div key={event.id} className="bg-accent/20 text-accent-foreground p-1 rounded-md text-xs truncate">
                                        {event.summary}
                                    </div>
                                ))}
                                {dayEvents.length > 2 && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                        + {dayEvents.length - 2} lainnya
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


export default function CalendarPage() {
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<Date | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'harian' | 'mingguan' | 'bulanan'>('harian');

  useEffect(() => {
    setFilterDate(new Date());
  }, []);


  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/events`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengambil data dari server.');
      }
      
      setAllEvents(data.items || []);
    } catch (e: any) {
      console.error("Error fetching calendar events:", e);
      let friendlyMessage = e.message || 'Gagal memuat kegiatan dari kalender.';
      if (friendlyMessage.includes("client_email") || friendlyMessage.includes("private_key") || friendlyMessage.includes("DECODER")) {
        friendlyMessage = "Kredensial Google Service Account (di file .env) sepertinya belum diatur, tidak valid, atau salah format. Silakan periksa kembali.";
      } else if (friendlyMessage.includes("not found")) {
        friendlyMessage = "Kalender tidak ditemukan atau belum dibagikan ke email Service Account. Pastikan ID Kalender benar dan izin telah diberikan.";
      }
      setError(friendlyMessage);
      setAllEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

 const filteredEvents = useMemo(() => {
    if (!filterDate) return [];

    let interval;
    const now = filterDate;

    switch (viewMode) {
      case 'harian':
        interval = { start: startOfDay(now), end: endOfDay(now) };
        break;
      case 'mingguan':
        interval = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
        break;
      case 'bulanan':
        interval = { start: startOfMonth(now), end: endOfMonth(now) };
        break;
      default:
        interval = { start: startOfDay(now), end: endOfDay(now) };
    }

    const eventsInInterval = allEvents.filter(event => {
      if (!event.start) return false;
      try {
        const eventStart = parseISO(event.start);
        const eventEnd = event.end ? parseISO(event.end) : eventStart;
        const inclusiveEventEnd = event.isAllDay ? new Date(eventEnd.getTime() - 1) : eventEnd;

        return isWithinInterval(eventStart, interval) || 
               isWithinInterval(inclusiveEventEnd, interval) ||
               (eventStart < interval.start && inclusiveEventEnd > interval.end);
      } catch {
        return false;
      }
    });

    if (!searchTerm) {
        return eventsInInterval;
    }
    
    return eventsInInterval.filter(event => {
        const term = searchTerm.toLowerCase();
        const summaryMatch = event.summary?.toLowerCase().includes(term);
        const descriptionMatch = event.description?.toLowerCase().includes(term);
        const locationMatch = event.location?.toLowerCase().includes(term);
        const disposisi = extractDisposisi(event.description).toLowerCase();
        const disposisiMatch = disposisi.includes(term);

        return summaryMatch || descriptionMatch || locationMatch || disposisiMatch;
    });
  }, [allEvents, filterDate, searchTerm, viewMode]);


  const handleRefresh = () => {
    fetchEvents();
  };
  
  const handleSuccess = () => {
    setIsFormOpen(false);
    fetchEvents();
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
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
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
                {filterDate ? format(filterDate, 'PPP', { locale: localeId }) : <span>Pilih tanggal</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <Calendar
                locale={localeId}
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
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-[400px] mx-auto">
                    <TabsTrigger value="harian">Harian</TabsTrigger>
                    <TabsTrigger value="mingguan">Mingguan</TabsTrigger>
                    <TabsTrigger value="bulanan">Bulanan</TabsTrigger>
                </TabsList>
                
                <TabsContent value="harian">
                     <div className="flex flex-col gap-4">
                        {filteredEvents.map(event => event.id && <EventCard event={event} key={event.id} />)}
                    </div>
                </TabsContent>
                <TabsContent value="mingguan">
                    {filterDate && <WeeklyView events={filteredEvents} baseDate={filterDate} />}
                </TabsContent>
                 <TabsContent value="bulanan">
                    {filterDate && <MonthlyView events={filteredEvents} baseDate={filterDate} />}
                </TabsContent>
            </Tabs>
            
          {filteredEvents.length === 0 && (
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
