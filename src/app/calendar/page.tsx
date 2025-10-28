'use client';

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, ExternalLink, PlusCircle, RefreshCw, MapPin, Clock, ChevronLeft, ChevronRight, Pin, Copy, Info, Link as LinkIcon, FolderOpen, Paperclip } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, isSameDay, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, eachDayOfInterval, getDay, isSameMonth, getDate, addDays, subDays, addWeeks, subMonths, addMonths } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { EventForm } from './components/event-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { getFileIcon } from '@/lib/utils';
import DOMPurify from 'isomorphic-dompurify';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


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

const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="mr-2 h-4 w-4">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.487 5.235 3.487 8.413.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.89-5.451 0-9.887 4.434-9.889 9.884-.002 2.024.63 3.891 1.742 5.634l-.999 3.648 3.742-1.001z"/>
    </svg>
);


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

type AttachmentLink = { name: string; url: string; };

const extractAllAttachmentLinks = (description: string | null | undefined): AttachmentLink[] => {
    if (!description) {
        return [];
    }
    const links: AttachmentLink[] = [];
    const regex = /<a href="([^"]+?)"[^>]*>([\s\S]*?)<\/a>/g;
    let match;

    while ((match = regex.exec(description)) !== null) {
        const url = match[1];
        const name = match[2];
        if (url && name) {
            // Remove any inner HTML tags from the name for a clean display
            const cleanName = name.replace(/<[^>]*>/g, '').trim();
            links.push({ name: cleanName, url });
        }
    }
    
    // Remove duplicates
    const uniqueLinks = links.filter((link, index, self) =>
        index === self.findIndex((l) => (
            l.url === link.url && l.name === link.name
        ))
    );

    return uniqueLinks;
}

const extractDisposisi = (description: string | null | undefined): string => {
    if (!description) {
        return '-';
    }
    const match = description.match(/Disposisi:\s*([\s\S]*?)(?=<br\s*\/?>|$)/i);
    return match && match[1] ? match[1].trim() : '-';
};

const CleanDescription = ({ description }: { description: string | null | undefined }) => {
    const [sanitizedHtml, setSanitizedHtml] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Sanitize the whole description first
            const sanitized = DOMPurify.sanitize(description || '', { USE_PROFILES: { html: true } });
            
            // Create a temporary element to parse the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = sanitized;
            
            // Remove known attachment/meta lines by selecting nodes
            const nodesToRemove: ChildNode[] = [];
            tempDiv.childNodes.forEach(node => {
                const text = node.textContent || '';
                if (
                    text.match(/📍\s*Disposisi:/i) ||
                    text.match(/Lampiran Undangan:/i) ||
                    text.match(/Link Hasil Kegiatan:/i) ||
                    text.match(/^Giat_\w+_\d+/i) ||
                    text.match(/Disimpan pada:/i) ||
                    (node.nodeName === 'A') // also check if the node itself is a link
                ) {
                    nodesToRemove.push(node);
                    // Check for surrounding <br> tags to remove as well
                    if (node.nextSibling && node.nextSibling.nodeName === 'BR') {
                        nodesToRemove.push(node.nextSibling);
                    }
                    if (node.previousSibling && node.previousSibling.nodeName === 'BR') {
                         nodesToRemove.push(node.previousSibling);
                    }
                }
            });

            // Filter out br tags that are only surrounded by other br tags or nothing
            const brTags = Array.from(tempDiv.getElementsByTagName('br'));
             brTags.forEach(br => {
                let prev = br.previousSibling;
                while(prev && (prev.nodeType === Node.TEXT_NODE && !prev.textContent?.trim())) {
                    prev = prev.previousSibling;
                }

                let next = br.nextSibling;
                while(next && (next.nodeType === Node.TEXT_NODE && !next.textContent?.trim())) {
                    next = next.nextSibling;
                }

                if ((!prev || prev.nodeName === 'BR') && (!next || next.nodeName === 'BR')) {
                     nodesToRemove.push(br)
                }
             })
            
            nodesToRemove.forEach(node => node.parentNode?.removeChild(node));

            // Clean up leftover empty lines (multiple <br> tags)
            let cleanedHtml = tempDiv.innerHTML.replace(/(<br\s*\/?>\s*){2,}/gi, '<br>');
            cleanedHtml = cleanedHtml.trim().replace(/^<br\s*\/?>|<br\s*\/?>$/g, '');


            setSanitizedHtml(cleanedHtml);
        }
    }, [description]);
    
    // Use dangerouslySetInnerHTML because we have sanitized the content
    // and want to preserve line breaks (<br>)
    return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} className="whitespace-pre-wrap"/>;
};


const EventCard = ({ event }: { event: CalendarEvent }) => {
  const attachments = useMemo(() => extractAllAttachmentLinks(event.description), [event.description]);

  return (
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
                    <Pin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-green-500" />
                    <span className='line-clamp-2'>Disposisi: {extractDisposisi(event.description)}</span>
                </p>
            </div>
            
            {attachments.length > 0 && (
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1" className='border-t pt-3 mt-3'>
                  <AccordionTrigger className='text-sm font-medium text-muted-foreground hover:no-underline py-2'>
                    <div className='flex items-center'>
                      <Paperclip className='mr-2 h-4 w-4'/> Lampiran ({attachments.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className='pt-2 pl-1'>
                    <div className="space-y-2">
                      {attachments.map((link, index) => (
                        <a 
                          key={index}
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted transition-colors group"
                        >
                            {getFileIcon(link.name)}
                            <span className="text-blue-600 group-hover:underline truncate text-xs" title={link.name}>
                                {link.name}
                            </span>
                        </a>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
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
        </CardFooter>
    </Card>
  );
};

const groupEventsByDay = (events: CalendarEvent[]) => {
    const grouped = new Map<string, CalendarEvent[]>();
    events.forEach(event => {
        if (!event.start) return;
        try {
            const start = startOfDay(parseISO(event.start));
            const end = event.end ? startOfDay(parseISO(event.end)) : start;
            // For all-day events, the end date is exclusive. For multi-day all-day events, we need to include all days in between.
            const inclusiveEnd = event.isAllDay && event.end ? new Date(parseISO(event.end).getTime() - 1) : end;
            const eventDurationDays = eachDayOfInterval({ start, end: inclusiveEnd });

            eventDurationDays.forEach(day => {
                const dayKey = format(day, 'yyyy-MM-dd');
                if (!grouped.has(dayKey)) {
                    grouped.set(dayKey, []);
                }
                grouped.get(dayKey)!.push(event);
            });
        } catch (e) {
            console.error("Could not parse event dates", event);
        }
    });
    return grouped;
};


const WeeklyView = ({ events, baseDate, onEventClick, onDayClick }: { events: CalendarEvent[], baseDate: Date, onEventClick: (event: CalendarEvent) => void, onDayClick: (day: Date) => void; }) => {
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
                    const maxEventsToShow = 4;
                    return (
                        <div key={dayKey} className="relative min-h-[12rem] border-r p-2 overflow-auto no-scrollbar first:border-l-0">
                            <span className={cn(
                                "font-semibold",
                                isSameDay(day, new Date()) ? "text-primary font-bold" : "text-muted-foreground"
                            )}>
                                {format(day, 'd')}
                            </span>
                            <div className="mt-1 space-y-1">
                                {dayEvents.slice(0, maxEventsToShow).map(event => (
                                    <button key={event.id} onClick={() => onEventClick(event)} className="w-full text-left bg-primary/80 hover:bg-primary/90 text-white p-1 rounded-md text-xs leading-tight">
                                        {event.summary}
                                    </button>
                                ))}
                                {dayEvents.length > maxEventsToShow && (
                                    <button onClick={() => onDayClick(day)} className="text-xs text-primary hover:underline mt-1 w-full text-left">
                                        + {dayEvents.length - maxEventsToShow} lainnya
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const truncateTitle = (title: string | null | undefined, wordLimit: number): string => {
    if (!title) return '';
    const words = title.split(' ');
    if (words.length > wordLimit) {
        return words.slice(0, wordLimit).join(' ') + '...';
    }
    return title;
};

const MonthlyView = ({ events, baseDate, onEventClick, onDayClick }: { events: CalendarEvent[], baseDate: Date, onEventClick: (event: CalendarEvent) => void, onDayClick: (day: Date) => void; }) => {
    const startOfMonthDate = startOfMonth(baseDate);
    const endOfMonthDate = endOfMonth(baseDate);
    const calendarStart = startOfWeek(startOfMonthDate, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(endOfMonthDate, { weekStartsOn: 1 });

    const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const eventsByDay = useMemo(() => groupEventsByDay(events), [events]);
    const weekDayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    const maxEventsToShow = 2;

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
                            "relative min-h-[8rem] border-r border-b p-2 overflow-auto no-scrollbar",
                            (getDay(day) % 7 === 0) ? "border-r-0" : "" // Last day of week (Sunday)
                        )}>
                            <span className={cn(
                                "font-semibold",
                                !isSameMonth(day, baseDate) && "text-muted-foreground/50",
                                isSameDay(day, new Date()) && "text-primary font-bold"
                            )}>
                                {getDate(day)}
                            </span>
                             <div className="mt-1 space-y-1">
                                {dayEvents.slice(0, maxEventsToShow).map(event => (
                                    <button key={event.id} onClick={() => onEventClick(event)} className="w-full text-left bg-accent hover:bg-accent/90 text-white p-1 rounded-md text-xs leading-tight">
                                        {truncateTitle(event.summary, 3)}
                                    </button>
                                ))}
                                {dayEvents.length > maxEventsToShow && (
                                     <button onClick={() => onDayClick(day)} className="text-xs text-primary hover:underline mt-1 w-full text-left">
                                        + {dayEvents.length - maxEventsToShow} lainnya
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const EventDetailContent = ({ event }: { event: CalendarEvent }) => {
    const attachments = useMemo(() => extractAllAttachmentLinks(event.description), [event.description]);

    return (
        <>
            <DialogHeader>
                <DialogTitle className="text-xl">{event.summary}</DialogTitle>
                <DialogDescription>{formatEventDisplay(event.start, event.end, event.isAllDay)}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
                {event.location && (
                    <div className="flex items-start">
                        <MapPin className="mr-3 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                        <span className="text-foreground">{event.location}</span>
                    </div>
                )}

                <div className="flex items-start">
                    <Pin className="mr-3 h-5 w-5 flex-shrink-0 text-green-500" />
                    <span className="text-foreground">Disposisi: {extractDisposisi(event.description)}</span>
                </div>

                {attachments.length > 0 && (
                    <div className="space-y-2 pt-4 border-t">
                        <h3 className="text-sm font-medium text-muted-foreground">Lampiran</h3>
                        {attachments.map((link, index) => (
                            <a key={index} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 rounded-md hover:bg-muted">
                                {getFileIcon(link.name)}
                                <span className="text-blue-600 truncate">{link.name}</span>
                            </a>
                        ))}
                    </div>
                )}

                <div className="flex items-start pt-4 border-t">
                    <Info className="mr-3 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                    <CleanDescription description={event.description} />
                </div>
            </div>
            <DialogFooter>
                {event.htmlLink && (
                    <Button variant="outline" asChild>
                        <a href={event.htmlLink} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Lihat di Google Calendar
                        </a>
                    </Button>
                )}
            </DialogFooter>
        </>
    );
};


export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'harian' | 'mingguan' | 'bulanan'>('harian');
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dayToShow, setDayToShow] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize filterDate on the client side to avoid hydration errors
    setFilterDate(new Date());
  }, []);

  const fetchEvents = useCallback(async () => {
    if (!filterDate) return;

    setIsLoading(true);
    setError(null);

    let startDate: Date;
    let endDate: Date;

    switch (viewMode) {
      case 'harian':
        startDate = startOfDay(filterDate);
        endDate = endOfDay(filterDate);
        break;
      case 'mingguan':
        startDate = startOfWeek(filterDate, { weekStartsOn: 1 });
        endDate = endOfWeek(filterDate, { weekStartsOn: 1 });
        break;
      case 'bulanan':
        startDate = startOfMonth(filterDate);
        endDate = endOfMonth(filterDate);
        break;
      default:
        return;
    }

    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    try {
      const response = await fetch(`/api/events?start=${startStr}&end=${endStr}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengambil data dari server.');
      }
      
      const sortedEvents = (data.items || []).sort((a: CalendarEvent, b: CalendarEvent) => {
        if (!a.start || !b.start) return 0;
        return parseISO(a.start).getTime() - parseISO(b.start).getTime();
      });

      setEvents(sortedEvents);
    } catch (e: any) {
      console.error("Error fetching calendar events:", e);
      let friendlyMessage = e.message || 'Gagal memuat kegiatan dari kalender.';
      if (friendlyMessage.includes("client_email") || friendlyMessage.includes("private_key") || friendlyMessage.includes("DECODER")) {
        friendlyMessage = "Kredensial Google Service Account (di file .env) sepertinya belum diatur, tidak valid, atau salah format. Silakan periksa kembali.";
      } else if (friendlyMessage.includes("not found")) {
        friendlyMessage = "Kalender tidak ditemukan atau belum dibagikan ke email Service Account. Pastikan ID Kalender benar dan izin telah diberikan.";
      }
      setError(friendlyMessage);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [filterDate, viewMode]);

  useEffect(() => {
    if (filterDate) { // Only fetch events if filterDate is set
        fetchEvents();
    }
  }, [fetchEvents, filterDate]);


  const handleSendToWhatsApp = () => {
      if (!filterDate || events.length === 0) {
          toast({
              variant: 'destructive',
              title: "Tidak Ada Jadwal",
              description: `Tidak ada kegiatan yang dijadwalkan untuk ${viewMode === 'harian' ? 'hari ini.' : 'periode ini.'}`
          });
          return;
      }

      let header;
      if (viewMode === 'harian') {
        header = format(filterDate, 'EEEE, dd MMMM yyyy', { locale: localeId }).toUpperCase();
      } else if (viewMode === 'mingguan') {
        const start = startOfWeek(filterDate, { weekStartsOn: 1 });
        const end = endOfWeek(filterDate, { weekStartsOn: 1 });
        const startFormat = format(start, 'dd MMM', { locale: localeId });
        const endFormat = format(end, 'dd MMM yyyy', { locale: localeId });
        header = `MINGGU INI (${startFormat} - ${endFormat})`.toUpperCase();
      } else { // bulanan
        header = format(filterDate, 'MMMM yyyy', { locale: localeId }).toUpperCase();
      }


      let message = `*JADWAL KEGIATAN - ${header}*\n\n`;

      events.forEach((event, index) => {
          const title = event.summary || '(Tanpa Judul)';
          const time = formatEventDisplay(event.start, event.end, event.isAllDay);
          const location = event.location;
          const disposisi = extractDisposisi(event.description);
          const eventDate = event.start ? format(parseISO(event.start), 'EEEE, dd MMM', { locale: localeId }) : 'Tanggal tidak valid';

          message += `*${index + 1}. ${title}*\n`;
          if (viewMode !== 'harian') {
            message += `- 🗓️ *Tanggal:* ${eventDate}\n`;
          }
          message += `- ⏰ *Waktu:* ${time}\n`;
          if (location) {
              message += `- 📍 *Lokasi:* ${location}\n`;
          }
          if (disposisi && disposisi !== '-') {
              message += `- ✍️ *Disposisi:* ${disposisi}\n`;
          }
          message += '\n';
      });

      message += "Mohon untuk segera ditindaklanjuti. Jika ada ralat atau tambahan, harap sampaikan.";
      setWhatsAppMessage(message);
      setIsWhatsAppModalOpen(true);
  };


  const handleRefresh = () => {
    fetchEvents();
  };
  
  const handleSuccess = () => {
    setIsFormOpen(false);
    fetchEvents();
  };
  
  const handleDateChange = (amount: number) => {
    if (!filterDate) return;
    let newDate;
    if (viewMode === 'harian') newDate = addDays(filterDate, amount);
    else if (viewMode === 'mingguan') newDate = addWeeks(filterDate, amount);
    else newDate = addMonths(filterDate, amount);
    setFilterDate(newDate);
  };

  const getDateNavigatorLabel = () => {
      if (!filterDate) return '';
      if (viewMode === 'harian') return format(filterDate, 'EEEE, dd MMMM yyyy', { locale: localeId });
      if (viewMode === 'mingguan') {
          const start = startOfWeek(filterDate, { weekStartsOn: 1 });
          const end = endOfWeek(filterDate, { weekStartsOn: 1 });
          if (start.getMonth() === end.getMonth()) {
            return `${format(start, 'dd')} - ${format(end, 'dd MMMM yyyy', { locale: localeId })}`;
          }
          return `${format(start, 'dd MMM')} - ${format(end, 'dd MMM yyyy', { locale: localeId })}`;
      }
      if (viewMode === 'bulanan') return format(filterDate, 'MMMM yyyy', { locale: localeId });
      return '';
  }

  const eventsByDay = useMemo(() => groupEventsByDay(events), [events]);
  const dailyEvents = dayToShow ? eventsByDay.get(format(dayToShow, 'yyyy-MM-dd')) || [] : [];
  
  return (
    <div className="flex flex-col gap-6 w-full">
        {/* Top Navigation & Controls */}
        <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-2 md:flex-row md:items-center md:justify-between">
            {/* Left Side: Date Navigator */}
             <div className='flex items-center gap-2'>
                <Button variant="ghost" size="icon" onClick={() => handleDateChange(-1)}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="text-lg font-semibold text-center w-auto">
                    {getDateNavigatorLabel()}
                </span>
                <Button variant="ghost" size="icon" onClick={() => handleDateChange(1)}>
                    <ChevronRight className="h-5 w-5" />
                </Button>
            </div>
            
            {/* Right Side: Actions */}
            <div className="flex flex-wrap items-center justify-center gap-2">
                <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
                    <TabsList>
                        <TabsTrigger value="harian">Harian</TabsTrigger>
                        <TabsTrigger value="mingguan">Mingguan</TabsTrigger>
                        <TabsTrigger value="bulanan">Bulanan</TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className='flex items-center gap-2'>
                    <Button variant="outline" onClick={handleRefresh} disabled={isLoading} size="icon">
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        <span className="sr-only">Muat Ulang</span>
                    </Button>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size='icon'>
                            <CalendarIcon className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                            locale={localeId}
                            mode="single"
                            selected={filterDate}
                            onSelect={(date) => setFilterDate(date)}
                            initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                 <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Tambah
                        </Button>
                    </DialogTrigger>
                     <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
                        <DialogHeader>
                        <DialogTitle>Tambah Kegiatan Baru</DialogTitle>
                        </DialogHeader>
                        <EventForm onSuccess={handleSuccess} />
                    </DialogContent>
                </Dialog>
                 <Dialog open={isWhatsAppModalOpen} onOpenChange={setIsWhatsAppModalOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-green-500 hover:bg-green-600 text-white" onClick={handleSendToWhatsApp}>
                            <WhatsAppIcon />
                            Kirim Jadwal
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Format Pesan WhatsApp</DialogTitle>
                        </DialogHeader>
                        <Textarea
                            readOnly
                            value={whatsAppMessage}
                            className="h-64 text-sm bg-muted/50"
                        />
                        <DialogFooter>
                            <Button onClick={() => {
                                navigator.clipboard.writeText(whatsAppMessage);
                                toast({ title: "Teks disalin!", description: "Anda sekarang dapat menempelkannya di WhatsApp." });
                            }}>
                                <Copy className="mr-2 h-4 w-4" />
                                Salin Teks
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
                 <TabsContent value="harian" className="mt-0">
                     <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {events.map(event => event.id && <EventCard event={event} key={event.id} />)}
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="mingguan" className="mt-0">
                   {filterDate && <WeeklyView events={events} baseDate={filterDate} onEventClick={setSelectedEvent} onDayClick={setDayToShow} />}
                </TabsContent>
                 <TabsContent value="bulanan" className="mt-0">
                    {filterDate && <MonthlyView events={events} baseDate={filterDate} onEventClick={setSelectedEvent} onDayClick={setDayToShow} />}
                </TabsContent>
            </Tabs>
            
          {events.length === 0 && viewMode === 'harian' && (
              <div className="text-center py-12 text-muted-foreground bg-muted/50 rounded-lg">
                <p>Tidak ada kegiatan yang ditemukan untuk filter yang dipilih.</p>
                <p className="text-sm">Coba pilih tanggal lain atau reset filter.</p>
              </div>
            )}
        </>
      )}

      {/* Event Detail Modal */}
        <Dialog open={!!selectedEvent} onOpenChange={(isOpen) => !isOpen && setSelectedEvent(null)}>
            <DialogContent className="sm:max-w-lg">
                {selectedEvent && <EventDetailContent event={selectedEvent} />}
            </DialogContent>
        </Dialog>


      {/* Day's Events Modal */}
      <Dialog open={!!dayToShow} onOpenChange={(isOpen) => !isOpen && setDayToShow(null)}>
        <DialogContent className="sm:max-w-lg">
            {dayToShow && (
                <>
                <DialogHeader>
                    <DialogTitle>Jadwal untuk {format(dayToShow, 'EEEE, dd MMMM yyyy', { locale: localeId })}</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto py-4 space-y-3">
                    {dailyEvents.length > 0 ? (
                        dailyEvents.map(event => (
                            <button key={event.id} onClick={() => { setDayToShow(null); setSelectedEvent(event); }} className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors">
                                <p className="font-semibold text-sm">{event.summary}</p>
                                <p className="text-xs text-muted-foreground">{formatEventDisplay(event.start, event.end, event.isAllDay)}</p>
                            </button>
                        ))
                    ) : (
                        <p className="text-muted-foreground text-center">Tidak ada acara untuk hari ini.</p>
                    )}
                </div>
                </>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
