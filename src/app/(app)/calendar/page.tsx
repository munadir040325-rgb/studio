'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, ExternalLink, FilePlus, PlusCircle, Search } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { EventForm } from './components/event-form';
import { listCalendarEvents, type CalendarEvent } from '@/ai/flows/calendar-flow';

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<Date | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedEvents = await listCalendarEvents();
      setEvents(fetchedEvents || []);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch calendar events.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const filteredEvents = events.filter(event => {
    if (!event.start?.dateTime) return false;
    const eventDate = parseISO(event.start.dateTime);
    const matchesDate = !filterDate || eventDate.toDateString() === filterDate.toDateString();
    const matchesSearch = event.summary?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-6 mx-auto w-full max-w-6xl">
      <PageHeader
        title="Jadwal Kegiatan"
        description="Lihat dan kelola jadwal kegiatan yang akan datang."
      >
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Tambah Kegiatan
            </Button>
          </DialogTrigger>
          <DialogContent>
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
      </PageHeader>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-start">
            <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Cari nama kegiatan..." 
                    className="pl-10" 
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
                        'w-full justify-start text-left font-normal',
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

      {isLoading && <div className="text-center py-12 text-muted-foreground">Memuat kegiatan...</div>}
      {error && <div className="text-center py-12 text-red-500">{error}</div>}
      
      {!isLoading && !error && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEvents.map(event => event.id && (
                <Card key={event.id} className="flex flex-col">
                    <CardHeader className="flex-grow">
                        <CardTitle className="truncate">{event.summary}</CardTitle>
                        {event.start?.dateTime && (
                           <p className="text-sm text-muted-foreground">{format(parseISO(event.start.dateTime), 'EEEE, dd MMMM yyyy, HH:mm')}</p>
                        )}
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <p className="text-sm text-muted-foreground line-clamp-3">{event.description || 'Tidak ada deskripsi.'}</p>
                    </CardContent>
                    <CardFooter className="flex flex-wrap justify-end gap-2">
                        {event.htmlLink && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={event.htmlLink} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className='mr-2 h-4 w-4' />
                                Detail
                            </a>
                          </Button>
                        )}
                        <Button asChild size="sm">
                          <Link href={`/sppd/new?title=${encodeURIComponent(event.summary || '')}&startDate=${event.start?.dateTime ? format(parseISO(event.start.dateTime), 'yyyy-MM-dd') : ''}`}>
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
              </div>
            )}
        </>
      )}
    </div>
  );
}
