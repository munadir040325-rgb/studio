'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarIcon, Loader2, Copy, Trash, Bold, Italic, ListOrdered, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { parseISO, format, isSameDay } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import useSWR from 'swr';
import { extractDisposisi } from '../calendar/page';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


type CalendarEvent = {
  id: string;
  summary: string;
  start: string;
  location?: string | null;
  description?: string | null;
};

const fetcher = (url: string) => fetch(url).then(res => {
    if (!res.ok) {
        const error = new Error('Gagal mengambil data dari server.');
        return res.json().then(data => {
            error.message = data.error || error.message;
            throw error;
        });
    }
    return res.json();
});

const generateReportTemplate = (event: CalendarEvent): string => {
    if (!event) return '';

    const disposisi = extractDisposisi(event.description);
    
    const template = `
NOTA DINAS

YTH.      : CAMAT GANDRUNGMANGU
DARI      : [Nama Pelapor], ([Jabatan Pelapor])
TEMBUSAN  : SEKRETARIS KECAMATAN GANDRUNGMANGU
TANGGAL   : ${format(new Date(), 'dd MMMM yyyy', { locale: localeId })}
NOMOR     : [Nomor Surat]
SIFAT     : BIASA
LAMPIRAN  : -
HAL       : LAPORAN HASIL PELAKSANAAN KEGIATAN

Dasar Surat [Asal Surat] Nomor : [Nomor Surat Undangan] tanggal [Tanggal Surat Undangan] perihal Undangan, dengan ini kami laporkan hasil pelaksanaan kegiatan sebagai berikut:

I.   Pelaksanaan
     Acara         : ${event.summary || ''}
     Hari/Tanggal  : ${event.start ? format(parseISO(event.start), 'EEEE, dd MMMM yyyy', { locale: localeId }) : ''}
     Waktu         : Pukul ${event.start ? format(parseISO(event.start), 'HH:mm', { locale: localeId }) : ''} WIB s.d. Selesai
     Tempat        : ${event.location || ''}
     Peserta       : [Sebutkan peserta/perwakilan yang hadir]

II.  Pimpinan Rapat  : [Isi Pimpinan Rapat]

III. Narasumber       : [Isi Narasumber]

IV.  Ringkasan Materi
     1. Materi Utama
         a. Sub-materi pertama
         b. Sub-materi kedua
     2. Materi Berikutnya
     ${disposisi ? `\n     Tindak Lanjut: ${disposisi}` : ''}

Demikian untuk menjadikan periksa dan terima kasih.

                                                                Yang melaksanakan kegiatan


                                                                [Nama Pelapor]
`;
    return template.trim();
}


const EditorToolbar = ({ onInsert }: { onInsert: (text: string) => void }) => (
    <TooltipProvider delayDuration={100}>
        <div className="flex items-center gap-1 rounded-t-md border border-b-0 p-2 bg-muted">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => onInsert('*text*')}>
                        <Bold className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Bold</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => onInsert('_text_')}>
                        <Italic className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Italic</p>
                </TooltipContent>
            </Tooltip>
             <div className="mx-2 h-6 border-l border-border" />
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => onInsert('\n1. \n2. \n3. ')}>
                        <ListOrdered className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Numbered List</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => onInsert('\n- \n- \n- ')}>
                        <List className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Bulleted List</p>
                </TooltipContent>
            </Tooltip>
        </div>
    </TooltipProvider>
);


export default function ReportPage() {
  const { toast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [reportContent, setReportContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);


  const { data: eventsData, error: eventsError, isLoading: isLoadingEvents } = useSWR('/api/events', fetcher);
  
  const events: CalendarEvent[] = eventsData?.items.sort((a: CalendarEvent, b: CalendarEvent) => parseISO(b.start).getTime() - parseISO(a.start).getTime()) || [];
  
  const filteredEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter(event => isSameDay(parseISO(event.start), selectedDate));
  }, [events, selectedDate]);

  useEffect(() => {
    if (selectedEvent) {
        setReportContent(generateReportTemplate(selectedEvent));
    } else {
        setReportContent('');
    }
  }, [selectedEvent]);
  
  const handleCopy = () => {
    if (!reportContent) {
        toast({ variant: 'destructive', title: 'Gagal Menyalin', description: 'Editor masih kosong.'});
        return;
    }
    navigator.clipboard.writeText(reportContent);
    toast({ title: 'Berhasil!', description: 'Isi laporan telah disalin ke clipboard.' });
  }
  
  const handleReset = () => {
    setSelectedDate(undefined);
    setSelectedEvent(null);
    setReportContent('');
    toast({ description: 'Editor telah dikosongkan.' });
  }

  const handleInsertText = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const newText = text.substring(0, start) + textToInsert + text.substring(end);
    setReportContent(newText);

    // Wait for state to update, then set cursor position
    setTimeout(() => {
        const cursorPosition = start + textToInsert.length;
        textarea.focus();
        // If inserting a placeholder like *text*, select the word 'text'
        if (textToInsert.includes('text')) {
             textarea.setSelectionRange(start + 1, cursorPosition - 1);
        } else {
             textarea.setSelectionRange(cursorPosition, cursorPosition);
        }
    }, 0);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Buat Laporan/Notulen"
        description="Pilih kegiatan untuk membuat draf laporan berdasarkan template yang tersedia."
      />
        <Card>
          <CardHeader>
            <CardTitle>Editor Laporan</CardTitle>
            <CardDescription>Pilih tanggal dan kegiatan untuk mengisi template. Gunakan toolbar untuk memformat teks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             {eventsError && <p className="text-red-500 text-sm">Gagal memuat kegiatan: {eventsError.message}</p>}
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="tanggal-kegiatan" className="font-semibold">Pilih Tanggal Kegiatan</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="tanggal-kegiatan"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP", { locale: localeId }) : <span>Pilih tanggal</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                            setSelectedDate(date);
                            setSelectedEvent(null);
                        }}
                        initialFocus
                        locale={localeId}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                 <div className="space-y-2">
                  <Label htmlFor="kegiatan" className="font-semibold">Pilih Kegiatan</Label>
                  {isLoadingEvents && selectedDate ? (
                    <div className="flex items-center text-sm text-muted-foreground h-10">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memuat kegiatan...
                    </div>
                  ) : filteredEvents.length > 0 ? (
                    <Select onValueChange={(eventId) => setSelectedEvent(events.find(e => e.id === eventId) || null)} value={selectedEvent?.id ?? ''}>
                      <SelectTrigger id="kegiatan" className="w-full">
                        <SelectValue placeholder="Pilih kegiatan..." />
                      </SelectTrigger>
                      <SelectContent style={{ width: 'var(--radix-select-trigger-width)' }}>
                        {filteredEvents.map(event => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.summary} ({format(parseISO(event.start), 'HH:mm')})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className={cn("flex items-center text-sm h-10 px-3 rounded-md border border-input", selectedDate ? "text-muted-foreground" : "text-muted-foreground/50 bg-muted")}>
                       {selectedDate ? "Tidak ada kegiatan untuk tanggal ini." : "Pilih tanggal terlebih dahulu."}
                    </div>
                  )}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="report-editor" className="font-semibold">Isi Laporan</Label>
                <div className="grid w-full gap-0">
                    <EditorToolbar onInsert={handleInsertText} />
                    <Textarea
                        id="report-editor"
                        ref={textareaRef}
                        placeholder="Pilih kegiatan untuk memulai, atau tulis manual di sini..."
                        className="h-[500px] font-mono text-xs leading-relaxed rounded-t-none focus-visible:ring-offset-0 focus-visible:ring-1"
                        value={reportContent}
                        onChange={(e) => setReportContent(e.target.value)}
                    />
                </div>
            </div>

          </CardContent>
            <CardFooter className="flex justify-end gap-2 mt-4 border-t pt-6">
                <Button variant="outline" onClick={handleReset}>
                    <Trash className="mr-2 h-4 w-4"/>
                    Reset
                </Button>
                <Button onClick={handleCopy}>
                    <Copy className="mr-2 h-4 w-4" />
                    Salin Notulen
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
