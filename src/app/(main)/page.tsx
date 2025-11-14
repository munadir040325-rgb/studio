


'use client';

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, ExternalLink, PlusCircle, RefreshCw, MapPin, Clock, ChevronLeft, ChevronRight, Pin, Copy, Info, Link as LinkIcon, FolderOpen, Paperclip, Folder, PenSquare, Trash2, Search, Building, FileUp } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isSameDay, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, eachDayOfInterval, getDay, isSameMonth, getDate, addDays, subDays, addWeeks, subMonths, addMonths } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { EventForm } from '@/components/calendar/event-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { getFileIcon } from '@/lib/utils';
import DOMPurify from 'isomorphic-dompurify';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { findBagianByEventIds } from '@/ai/flows/sheets-flow';
import { UploadAttachmentForm } from '@/components/calendar/upload-attachment-form';


type CalendarAttachment = {
  fileUrl: string | null | undefined;
  title: string | null | undefined;
  fileId: string | null | undefined;
  source: 'google' | 'description';
}

export type CalendarEvent = {
    id: string | null | undefined;
    summary: string | null | undefined;
    description: string | null | undefined;
    location: string | null | undefined;
    start: string | null | undefined;
    end: string | null | undefined;
    isAllDay: boolean;
    htmlLink: string | null | undefined;
    attachments?: CalendarAttachment[];
    bagianName?: string;
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

export const extractDisposisi = (description: string | null | undefined): string | null => {
    if (!description) return null;

    // Remove any known timestamp patterns first.
    let cleanedDescription = description
        .replace(/(<br\s*\/?>\s*)*Disimpan pada:[\s\S]*/i, '') 
        .replace(/(<br\s*\/?>\s*)*📅\s*\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}:\d{2} (AM|PM)[\s\S]*/i, '');

    // Now, extract "Disposisi" content.
    const match = cleanedDescription.match(/(?:📍\s*)?Disposisi:\s*([\s\S]*)/i);
    let disposisiText = match && match[1] ? match[1] : null;

    if (disposisiText !== null) {
        // Clean up HTML tags and leading/trailing whitespace from the extracted text.
        const plainText = disposisiText.replace(/<[^>]*>/g, '').trim();
        
        // If the result is an empty string or the literal string "null", return null.
        if (plainText === '' || plainText.toLowerCase() === 'null') {
            return null;
        }
        
        // Return the first line of the cleaned text.
        return plainText.split('\n')[0].trim();
    }

    return null;
};


const extractTimestamp = (description: string | null | undefined): string | null => {
    if (!description) return null;
    const match = description.match(/Disimpan pada:\s*(.*)/i);
    return match && match[1] ? match[1].trim() : null;
}

const CleanDescription = ({ description }: { description: string | null | undefined }) => {
    const [sanitizedHtml, setSanitizedHtml] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined' && description) {
             const tempDiv = document.createElement('div');
             tempDiv.innerHTML = DOMPurify.sanitize(description, { USE_PROFILES: { html: true } });

             let processedHtml = tempDiv.innerHTML;
             
             // Remove all known timestamp patterns globally from the HTML
             processedHtml = processedHtml.replace(/(<br\s*\/?>\s*)*Disimpan pada:[\s\S]*/gi, '');
             processedHtml = processedHtml.replace(/(<br\s*\/?>\s*)*📅\s*\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}:\d{2} (AM|PM)[\s\S]*/gi, '');

             const lines = processedHtml.split(/<br\s*\/?>/i);

             const filteredLines = lines.filter(line => {
                 const textContent = line.replace(/<[^>]*>/g, '').trim();
                 return !(
                     textContent.startsWith('📍 Disposisi:') ||
                     textContent.startsWith('Disposisi:') ||
                     textContent.startsWith('🆔 Giat_')
                 );
             });
            
             let cleanedHtml = filteredLines.join('<br>').trim();
             cleanedHtml = cleanedHtml.replace(/^(<br\s*\/?>\s*)+|(<br\s*\/?>\s*)+$/g, '');
             cleanedHtml = cleanedHtml.replace(/(<br\s*\/?>\s*){2,}/gi, '<br>');

             setSanitizedHtml(cleanedHtml);
        } else {
            setSanitizedHtml('');
        }
    }, [description]);
    
    if (!sanitizedHtml || sanitizedHtml === '<br>') {
        return null;
    }
    
    return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} className="whitespace-pre-wrap"/>;
};


const EventCard = ({ event, onEdit, onUploadSuccess }: { event: CalendarEvent, onEdit: (event: CalendarEvent) => void, onUploadSuccess: () => void }) => {
  const disposisi = useMemo(() => extractDisposisi(event.description), [event.description]);
  const attachments = event.attachments || [];
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  return (
    <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <Card key={event.id} className="flex flex-col">
            <CardHeader className="py-2 px-3">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-base leading-snug">{event.summary || '(Tanpa Judul)'}</CardTitle>
                    {event.bagianName && <Badge variant="secondary" className="ml-2 shrink-0">{event.bagianName}</Badge>}
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-1 text-sm text-muted-foreground px-3 pb-2">
                <div className="space-y-0.5">
                    <p className="flex items-start">
                        <Clock className="h-3 w-3 mr-1.5 mt-0.5 flex-shrink-0 text-blue-500" />
                        <span className='font-medium text-foreground text-xs'>{formatEventDisplay(event.start, event.end, event.isAllDay)}</span>
                    </p>
                    {event.location && (
                    <p className="flex items-start">
                        <MapPin className="h-3 w-3 mr-1.5 mt-0.5 flex-shrink-0 text-red-500" />
                        <span className="text-xs">{event.location}</span>
                    </p>
                    )}
                    {disposisi && (
                        <p className="flex items-start">
                            <Pin className="h-3 w-3 mr-1.5 mt-0.5 flex-shrink-0 text-green-500" />
                            <span className='text-xs'>Disposisi: {disposisi}</span>
                        </p>
                    )}
                </div>
                
                {attachments.length > 0 && (
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1" className="border-none">
                    <AccordionTrigger className='text-xs font-bold text-muted-foreground hover:no-underline py-1'>
                        <div className='flex items-center'>
                        <Paperclip className='mr-2 h-3.5 w-3.5'/> Lampiran ({attachments.length})
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className='pt-1 pl-1'>
                        <div className="max-h-24 overflow-y-auto">
                        {attachments.map((att, index) => (
                            att.fileUrl && att.title && (
                            <a 
                                key={att.fileId || index}
                                href={att.fileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center gap-2 p-1 rounded-md hover:bg-muted transition-colors group"
                            >
                                {getFileIcon(att.title, 'h-4 w-4')}
                                <span className="text-blue-600 group-hover:underline truncate text-xs" title={att.title}>
                                    {att.title}
                                </span>
                            </a>
                            )
                        ))}
                        </div>
                    </AccordionContent>
                    </AccordionItem>
                </Accordion>
                )}

            </CardContent>
            <CardFooter className="flex flex-wrap justify-between items-center gap-2 px-3 py-1.5 mt-auto border-t">
                <div className='flex'>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(event)}>
                        <PenSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="sr-only">Edit Kegiatan</span>
                    </Button>
                     <DialogTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-7 w-7">
                            <FileUp className="h-4 w-4 text-muted-foreground" />
                            <span className="sr-only">Upload Lampiran</span>
                        </Button>
                    </DialogTrigger>
                </div>
                {event.htmlLink && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                    <a href={event.htmlLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className='mr-1.5 h-3.5 w-3.5' />
                        Detail
                    </a>
                </Button>
                )}
            </CardFooter>
        </Card>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto no-scrollbar">
            <DialogHeader>
                <DialogTitle>Upload Lampiran</DialogTitle>
                <DialogDescription>
                    Unggah dokumen untuk kegiatan: <span className="font-semibold">{event.summary}</span>
                </DialogDescription>
            </DialogHeader>
            <UploadAttachmentForm
                event={event}
                onSuccess={() => {
                    setIsUploadModalOpen(false);
                    onUploadSuccess();
                }}
            />
        </DialogContent>
    </Dialog>
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
                                {dayEvents.slice(0, maxEventsToShow).map(event => {
                                    const disposisi = extractDisposisi(event.description);
                                    const isCamat = disposisi && /camat/i.test(disposisi);
                                    return (
                                        <button 
                                            key={event.id} 
                                            onClick={() => onEventClick(event)} 
                                            className={cn(
                                                "w-full text-left text-white p-1 rounded-md text-xs leading-tight",
                                                isCamat ? "bg-orange-500 hover:bg-orange-600" : "bg-primary/80 hover:bg-primary/90"
                                            )}
                                        >
                                            {event.summary}
                                        </button>
                                    );
                                })}
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
                                {dayEvents.slice(0, maxEventsToShow).map(event => {
                                    const disposisi = extractDisposisi(event.description);
                                    const isCamat = disposisi && /camat/i.test(disposisi);
                                    return (
                                        <button 
                                            key={event.id} 
                                            onClick={() => onEventClick(event)} 
                                            className={cn(
                                                "w-full text-left text-white p-1 rounded-md text-xs leading-tight",
                                                isCamat ? "bg-orange-500 hover:bg-orange-600" : "bg-accent hover:bg-accent/90"
                                            )}
                                        >
                                            {truncateTitle(event.summary, 3)}
                                        </button>
                                    );
                                })}
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
    const disposisi = useMemo(() => extractDisposisi(event.description), [event.description]);
    const attachments = event.attachments || [];
    const cleanDescriptionContent = <CleanDescription description={event.description} />;

    return (
        <>
            <DialogHeader>
                <DialogTitle className="text-xl">{event.summary}</DialogTitle>
                <DialogDescription>{formatEventDisplay(event.start, event.end, event.isAllDay)}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
                {event.bagianName && (
                    <div className="flex items-start">
                        <Building className="mr-3 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                         <span className="text-foreground font-semibold">{event.bagianName}</span>
                    </div>
                )}
                {event.location && (
                    <div className="flex items-start">
                        <MapPin className="mr-3 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                        <span className="text-foreground">{event.location}</span>
                    </div>
                )}

                {disposisi && (
                    <div className="flex items-start">
                        <Pin className="mr-3 h-5 w-5 flex-shrink-0 text-green-500" />
                        <span className="text-foreground">Disposisi: {disposisi}</span>
                    </div>
                )}
                 {cleanDescriptionContent && (
                    <div className="flex items-start">
                        <Info className="mr-3 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                        <div className="text-foreground">{cleanDescriptionContent}</div>
                    </div>
                )}


                {attachments.length > 0 && (
                     <Accordion type="single" collapsible className="w-full pt-2">
                        <AccordionItem value="item-1">
                            <AccordionTrigger className="text-sm font-bold text-muted-foreground hover:no-underline py-3">
                                <div className="flex items-center">
                                    <Paperclip className="mr-2 h-4 w-4" /> Lampiran ({attachments.length})
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pl-1 max-h-48 overflow-y-auto">
                                <div className="space-y-1">
                                    {attachments.map((att, index) =>
                                        att.fileUrl && att.title && (
                                            <a
                                                key={att.fileId || index}
                                                href={att.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted transition-colors group"
                                            >
                                                {getFileIcon(att.title)}
                                                <span className="text-blue-600 group-hover:underline truncate text-xs" title={att.title}>
                                                    {att.title}
                                                </span>
                                            </a>
                                        )
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )}
                
                
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
  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<'harian' | 'mingguan' | 'bulanan'>('harian');
  const [searchQuery, setSearchQuery] = useState('');
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dayToShow, setDayToShow] = useState<Date | null>(null);
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;


  useEffect(() => {
    // Initialize filterDate on the client side to avoid hydration errors
    setFilterDate(new Date());
  }, []);

  const fetchEvents = useCallback(async () => {
    // Don't fetch if filterDate is not set yet (on initial server render)
    if (!filterDate) return;

    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    const isSearchingInDaily = viewMode === 'harian' && searchQuery;

    // Only add date parameters if NOT searching in daily view.
    if (!isSearchingInDaily) {
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
        }
        params.append('start', format(startDate, 'yyyy-MM-dd'));
        params.append('end', format(endDate, 'yyyy-MM-dd'));
    }
    // If searching in daily view, params remains empty, so the backend fetches the default wide range.

    const url = `/api/events?${params.toString()}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengambil data dari server.');
      }
      
      const rawEvents = (data.items || []).map((event: any) => {
        const googleAttachments: CalendarAttachment[] = (event.attachments || []).map((att: any) => ({
          fileUrl: att.fileUrl,
          title: att.title,
          fileId: att.fileId,
          source: 'google'
        }));
        
        const descriptionAttachments: CalendarAttachment[] = [];
        if (event.description) {
            const doc = new DOMParser().parseFromString(event.description, 'text/html');
            const links = doc.querySelectorAll('a');
            links.forEach(link => {
                if (link.href && (link.innerText.includes('Lampiran Undangan') || link.href.includes('drive.google.com'))) {
                    // Check to avoid adding duplicates from google attachments
                    const isDuplicate = googleAttachments.some(ga => ga.fileUrl === link.href);
                    if (!isDuplicate) {
                         descriptionAttachments.push({
                            fileUrl: link.href,
                            title: link.textContent || 'File',
                            fileId: link.href,
                            source: 'description'
                        });
                    }
                }
            });
        }
        
        return { ...event, attachments: [...googleAttachments, ...descriptionAttachments] };
      });


      const sortedEvents: CalendarEvent[] = rawEvents.sort((a: CalendarEvent, b: CalendarEvent) => {
        if (!a.start || !b.start) return 0;
        return parseISO(a.start).getTime() - parseISO(a.start).getTime();
      });

      // Enrich events with 'bagian' information
      const eventIds = sortedEvents.map(e => e.id).filter(Boolean) as string[];
      if (eventIds.length > 0) {
          const bagianMap = await findBagianByEventIds({ eventIds });
          const enrichedEvents = sortedEvents.map(event => ({
              ...event,
              bagianName: event.id ? bagianMap[event.id] : undefined,
          }));
          setEvents(enrichedEvents);
      } else {
          setEvents(sortedEvents);
      }


    } catch (e: any) {
      console.error("Error fetching calendar events:", e);
      let friendlyMessage = e.message || 'Gagal memuat kegiatan dari kalender.';
      if (friendlyMessage.includes("client_email") || friendlyMessage.includes("private_key") || friendlyMessage.includes("DECODER")) {
        friendlyMessage = "Kredensial Google Service Account (di file .env) sepertinya belum diatur, tidak valid, atau salah format. Silakan periksa kembali.";
      } else if (friendlyMessage.includes("not found")) {
        friendlyMessage = "Kalender tidak ditemukan atau belum dibagikan ke email Service Account. Pastikan ID Kalender benar dan izin telah diberikan.";
      } else if (friendlyMessage.includes("Quota exceeded")) {
        friendlyMessage = "Melebihi kuota permintaan API Google. Coba lagi dalam beberapa saat.";
      }
      setError(friendlyMessage);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [filterDate, viewMode, searchQuery]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Reset page to 1 when search query or view mode changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, viewMode]);


  const filteredEvents = useMemo(() => {
    // When searching in daily view, the full list is already fetched.
    // We just need to filter it on the client side.
    if (viewMode === 'harian' && searchQuery) {
        const query = searchQuery.toLowerCase();
        const results = events.filter(event => {
            const disposisi = extractDisposisi(event.description);
            return (
                event.summary?.toLowerCase().includes(query) ||
                event.location?.toLowerCase().includes(query) ||
                disposisi?.toLowerCase().includes(query) ||
                event.bagianName?.toLowerCase().includes(query)
            );
        });
        // Sort search results by date
        return results.sort((a,b) => {
            if (!a.start || !b.start) return 0;
            return parseISO(a.start).getTime() - parseISO(b.start).getTime();
        });
    }
    
    // For other views, or when not searching, the backend already pre-filtered by date.
    if (!searchQuery) {
        return events;
    }

    const query = searchQuery.toLowerCase();
    return events.filter(event => {
      const disposisi = extractDisposisi(event.description);
      return (
        event.summary?.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query) ||
        disposisi?.toLowerCase().includes(query) ||
        event.bagianName?.toLowerCase().includes(query)
      );
    });
  }, [events, searchQuery, viewMode]);

  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredEvents.slice(startIndex, endIndex);
  }, [filteredEvents, currentPage, ITEMS_PER_PAGE]);
  
  const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE);

  const handleSendToWhatsApp = () => {
      if (!filterDate || filteredEvents.length === 0) {
          toast({
              variant: 'destructive',
              title: "Tidak Ada Jadwal",
              description: `Tidak ada kegiatan yang dijadwalkan untuk ${viewMode === 'harian' ? 'hari ini.' : 'periode ini.'}`
          });
          return;
      }
      
      const capitalizeEachWord = (str: string) => {
        return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      };
      
      let header;
      if (viewMode === 'harian' && !searchQuery) {
        const dateStr = format(filterDate, 'EEEE, dd MMMM yyyy', { locale: localeId });
        header = `RENGIAT\n${capitalizeEachWord(dateStr)}`;
      } else if (viewMode === 'mingguan') {
        const start = startOfWeek(filterDate, { weekStartsOn: 1 });
        const end = endOfWeek(filterDate, { weekStartsOn: 1 });
        const startFormat = capitalizeEachWord(format(start, 'dd MMM', { locale: localeId }));
        const endFormat = capitalizeEachWord(format(end, 'dd MMM yyyy', { locale: localeId }));
        header = `RENGIAT MINGGU INI\n${startFormat} - ${endFormat}`;
      } else {
        header = `HASIL PENCARIAN KEGIATAN`;
      }


      let message = `${header}\n\n`;
      let eventsToFormat = filteredEvents;

      if (viewMode === 'mingguan') {
        const start = startOfWeek(filterDate, { weekStartsOn: 1 });
        const end = endOfWeek(filterDate, { weekStartsOn: 1 });
        eventsToFormat = filteredEvents.filter(e => e.start && isWithinInterval(parseISO(e.start), {start, end}));
      }


      eventsToFormat.forEach((event, index) => {
          const cleanTitle = (event.summary || '(Tanpa Judul)').replace(/\s+/g, ' ').trim();
          const time = event.start ? `Pukul ${format(parseISO(event.start), 'HH.mm', { locale: localeId })}` : '';
          const location = event.location;
          const disposisi = extractDisposisi(event.description);
          
          let eventDetails = [];
          if (time) eventDetails.push(`Waktu: ${time}`);
          if (location) eventDetails.push(`Lokasi: ${location}`);
          if (disposisi) eventDetails.push(`Disposisi: ${disposisi}`);
          
          message += `${index + 1}. *${cleanTitle}*`;
          if (eventDetails.length > 0) {
              message += ` || ${eventDetails.join(' || ')}`;
          }
          message += '\n';
      });

      message += "\nMohon ralat jika ada kekurangan atau tambahan dari bagian lain.";
      setWhatsAppMessage(message);
      setIsWhatsAppModalOpen(true);
  };


  const handleRefresh = () => {
    fetchEvents();
  };
  
  const handleSuccess = () => {
    setFormMode(null);
    setEventToEdit(null);
    fetchEvents();
  };

  const handleOpenForm = (mode: 'add' | 'edit', event?: CalendarEvent) => {
      setFormMode(mode);
      setEventToEdit(event || null);
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

  const eventsByDay = useMemo(() => groupEventsByDay(filteredEvents), [filteredEvents]);
  const dailyEvents = dayToShow ? eventsByDay.get(format(dayToShow, 'yyyy-MM-dd')) || [] : [];
  
  // Decide which list to render
  const eventsToRender = (viewMode === 'harian' && searchQuery) ? paginatedEvents : filteredEvents;


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
            <div className="flex w-full flex-col items-center justify-center gap-2 md:w-auto md:flex-row">
                <div className="flex w-full items-center gap-2 md:w-auto">
                    <div className="relative flex-grow">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Cari kegiatan, lokasi..."
                            className="pl-8 w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
                        <TabsList>
                            <TabsTrigger value="harian">Harian</TabsTrigger>
                            <TabsTrigger value="mingguan">Mingguan</TabsTrigger>
                            <TabsTrigger value="bulanan">Bulanan</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
                <div className='flex w-full items-center gap-2 md:w-auto'>
                    <Button variant="outline" onClick={handleRefresh} disabled={isLoading} size="icon" className="w-10 flex-shrink-0">
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        <span className="sr-only">Muat Ulang</span>
                    </Button>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size='icon' className="w-10 flex-shrink-0">
                            <CalendarIcon className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                            locale={localeId}
                            mode="single"
                            selected={filterDate}
                            onSelect={(date) => {
                                setFilterDate(date);
                                setCurrentPage(1);
                            }}
                            initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                    <Button onClick={() => handleOpenForm('add')} className="flex-grow">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Tambah
                    </Button>
                    <Dialog open={isWhatsAppModalOpen} onOpenChange={setIsWhatsAppModalOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-green-500 hover:bg-green-600 text-white flex-grow" onClick={handleSendToWhatsApp}>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {eventsToRender.map(event => event.id && <EventCard event={event} key={event.id} onEdit={() => handleOpenForm('edit', event)} onUploadSuccess={handleRefresh} />)}
                        </div>
                        {viewMode === 'harian' && searchQuery && totalPages > 1 && (
                            <div className="flex items-center justify-center gap-4 pt-4">
                                <Button
                                    onClick={() => setCurrentPage(p => p - 1)}
                                    disabled={currentPage === 1}
                                    variant="outline"
                                >
                                    <ChevronLeft className="h-4 w-4 mr-2" />
                                    Sebelumnya
                                </Button>
                                <span className="text-sm font-medium">
                                    Halaman {currentPage} dari {totalPages}
                                </span>
                                <Button
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    disabled={currentPage === totalPages}
                                    variant="outline"
                                >
                                    Berikutnya
                                    <ChevronRight className="h-4 w-4 ml-2" />
                                </Button>
                            </div>
                        )}
                    </div>
                </TabsContent>
                <TabsContent value="mingguan" className="mt-0">
                   {filterDate && <WeeklyView events={filteredEvents} baseDate={filterDate} onEventClick={setSelectedEvent} onDayClick={setDayToShow} />}
                </TabsContent>
                 <TabsContent value="bulanan" className="mt-0">
                    {filterDate && <MonthlyView events={filteredEvents} baseDate={filterDate} onEventClick={setSelectedEvent} onDayClick={setDayToShow} />}
                </TabsContent>
            </Tabs>
            
          {filteredEvents.length === 0 && (
              <div className="text-center py-12 text-muted-foreground bg-muted/50 rounded-lg">
                <p>Tidak ada kegiatan yang ditemukan untuk filter yang dipilih.</p>
                {searchQuery && <p className="text-sm">Coba ubah kata kunci pencarian Anda.</p>}
              </div>
            )}
        </>
      )}

       {/* Add/Edit Event Modal */}
        <Dialog open={!!formMode} onOpenChange={(isOpen) => { if (!isOpen) { setFormMode(null); setEventToEdit(null); } }}>
             <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
                <DialogHeader>
                    <DialogTitle>{formMode === 'edit' ? 'Edit Kegiatan' : 'Tambah Kegiatan Baru'}</DialogTitle>
                </DialogHeader>
                <EventForm onSuccess={handleSuccess} eventToEdit={eventToEdit} />
            </DialogContent>
        </Dialog>

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
