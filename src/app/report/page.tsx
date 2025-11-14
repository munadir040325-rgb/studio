
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Loader2, Printer, Trash, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { parseISO, format, isSameDay, isSameMonth, set } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import useSWR from 'swr';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import DOMPurify from 'isomorphic-dompurify';
import { RichTextEditor } from '@/components/editor';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


type CalendarAttachment = {
    fileUrl: string | null | undefined;
    title: string | null | undefined;
    fileId: string | null | undefined;
    mimeType?: string | null | undefined;
}

type CalendarEvent = {
  id: string;
  summary: string;
  start: string;
  end?: string;
  location?: string | null;
  description?: string | null;
  attachments?: CalendarAttachment[];
};

type ManualEvent = {
  summary: string;
  location: string;
  start: string;
  end?: string;
  waktu: string;
  attachments?: CalendarAttachment[];
};

type ReportData = {
    event: CalendarEvent | ManualEvent;
    dasar: string;
    pimpinan: string;
    labelPimpinan: string;
    narasumber: string;
    labelNarasumber: string;
    peserta: string;
    labelPeserta: string;
    reportContent: string;
    lokasiTanggal: string;
    pelapor: string;
    photoAttachments: any[];
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

const EditableField = ({ id, placeholder, className, defaultValue }: { id: string, placeholder: string, className?: string, defaultValue?: string }) => (
    <span
        id={id}
        contentEditable
        suppressContentEditableWarning
        className={cn("p-1 -m-1 rounded-md min-w-[5rem] inline-block bg-muted/50 hover:bg-muted focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring print:bg-transparent", className)}
        data-placeholder={placeholder}
        dangerouslySetInnerHTML={{ __html: defaultValue || '' }}
    />
);

const formatReportDateRange = (startStr: string, endStr?: string): string => {
    try {
        const startDate = parseISO(startStr);
        const endDate = endStr ? parseISO(endStr) : startDate;

        if (isSameDay(startDate, endDate)) {
            return format(startDate, 'EEEE, dd MMMM yyyy', { locale: localeId });
        }

        const startDayName = format(startDate, 'EEEE', { locale: localeId });
        const endDayName = format(endDate, 'EEEE', { locale: localeId });
        const daysRange = `${startDayName}-${endDayName}`;

        if (isSameMonth(startDate, endDate)) {
            const startDay = format(startDate, 'dd');
            const endDayAndMonth = format(endDate, 'dd MMMM yyyy', { locale: localeId });
            return `${daysRange}, ${startDay} s.d. ${endDayAndMonth}`;
        } else {
            const startDayAndMonth = format(startDate, 'dd MMMM');
            const endDayAndMonth = format(endDate, 'dd MMMM yyyy', { locale: localeId });
            return `${daysRange}, ${startDayAndMonth} s.d. ${endDayAndMonth}`;
        }
    } catch (e) {
        console.error("Error formatting date range:", e);
        return "Tanggal tidak valid";
    }
};

const ReportEditorTemplate = ({ event, reportContent, onContentChange }: { event: CalendarEvent | ManualEvent, reportContent: string, onContentChange: (content: string) => void }) => {
    const isManualEvent = 'waktu' in event;
    const defaultLokasiTanggal = `Gandrungmangu, ${format(parseISO(event.start), 'dd MMMM yyyy', { locale: localeId })}`;
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Pratinjau Laporan</CardTitle>
                <CardDescription>Isi atau ubah detail laporan di bawah ini. Klik pada teks berlatar abu-abu untuk mengeditnya.</CardDescription>
            </CardHeader>
            <CardContent>
                <div id="editor-area" className="bg-white text-black p-8 border" style={{ lineHeight: 1.2 }}>
                    <h3 className="text-center font-bold text-lg my-6 uppercase">Laporan Kegiatan/Perjalanan Dinas</h3>
                    
                    <table className="w-full mt-4 border-separate" style={{borderSpacing: '0 8px'}}>
                        <tbody>
                            <tr>
                                <td className="w-[1.8rem] align-top font-semibold">I.</td>
                                <td colSpan={3} className='font-semibold'>Dasar Kegiatan</td>
                            </tr>
                            <tr>
                                <td></td>
                                <td colSpan={3} className='pb-2'>
                                <EditableField id="report-dasar" placeholder="Isi dasar kegiatan (contoh: Perintah Lisan Camat)" className="w-full" />
                                </td>
                            </tr>

                            <tr>
                                <td className="w-[1.8rem] align-top font-semibold">II.</td>
                                <td colSpan={3} className='font-semibold'>Kegiatan</td>
                            </tr>
                            <tr>
                                <td></td>
                                <td colSpan={3}>
                                    <table className="w-full">
                                        <tbody>
                                            <tr>
                                                <td className="w-32 align-top">Acara</td>
                                                <td className="w-4 align-top">:</td>
                                                <td>{event.summary}</td>
                                            </tr>
                                            <tr>
                                                <td className='w-32 align-top'>Hari/Tanggal</td>
                                                <td className='w-4 align-top'>:</td>
                                                <td>{formatReportDateRange(event.start, event.end)}</td>
                                            </tr>
                                            <tr>
                                                <td className='w-32 align-top'>Waktu</td>
                                                <td className='w-4 align-top'>:</td>
                                                <td>{isManualEvent ? event.waktu : `Pukul ${format(parseISO(event.start), 'HH:mm', { locale: localeId })} WIB s.d. Selesai`}</td>
                                            </tr>
                                            <tr>
                                                <td className='w-32 align-top'>Tempat</td>
                                                <td className='w-4 align-top'>:</td>
                                                <td>{event.location || <EditableField id="report-tempat" placeholder="Tempat Kegiatan" />}</td>
                                            </tr>
                                            <tr>
                                                <td className='w-32 align-top'><EditableField id="label-pimpinan" placeholder="Label" defaultValue="Pimpinan Rapat"/></td>
                                                <td className='w-4 align-top'>:</td>
                                                <td><EditableField id="report-pimpinan" placeholder="Isi Pimpinan Rapat" /></td>
                                            </tr>
                                            <tr>
                                                <td className="w-32 align-top"><EditableField id="label-narasumber" placeholder="Label" defaultValue="Narasumber"/></td>
                                                <td className='w-4 align-top'>:</td>
                                                <td><EditableField id="report-narasumber" placeholder="Isi Narasumber" /></td>
                                            </tr>
                                            <tr>
                                                <td className='w-32 align-top'><EditableField id="label-peserta" placeholder="Label" defaultValue="Peserta"/></td>
                                                <td className='w-4 align-top'>:</td>
                                                <td><EditableField id="report-peserta" placeholder="Sebutkan peserta/perwakilan yang hadir" /></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                            
                            <tr>
                                <td className="w-[1.8rem] align-top font-semibold pt-2">III.</td>
                                <td colSpan={3} className='font-semibold pt-2'>Hasil dan Tindak Lanjut</td>
                            </tr>
                            <tr>
                                <td></td>
                                <td colSpan={3} className="w-full">
                                    <RichTextEditor
                                        onChange={onContentChange}
                                        placeholder="Ketik hasil laporan di sini..."
                                    />
                                </td>
                            </tr>
                            <tr className='text-justify'>
                            <td></td>
                            <td colSpan={3} className="pt-4">Demikian untuk menjadikan periksa dan terima kasih.</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div className="flex justify-end mt-8">
                        <div className="text-center w-72">
                            <EditableField id="report-lokasi-tanggal" placeholder="Tempat, Tanggal Melaporkan" defaultValue={defaultLokasiTanggal}/>
                            <p>Yang melaksanakan kegiatan,</p>
                            <br /><br /><br />
                            <p className="font-semibold underline">
                                <EditableField id="report-pelapor" placeholder="Nama Pelapor" />
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};


export default function ReportPage() {
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('pilih');
  
  // State for "Pilih dari Kalender"
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // State for "Input Manual"
  const [manualEvent, setManualEvent] = useState<ManualEvent>({ summary: '', location: '', start: new Date().toISOString(), end: new Date().toISOString(), waktu: '' });
  
  const [reportContent, setReportContent] = useState('');

  const { data: eventsData, error: eventsError, isLoading: isLoadingEvents } = useSWR('/api/events', fetcher, { revalidateOnFocus: false });
    
  const events: CalendarEvent[] = useMemo(() => {
    if (!eventsData?.items) return [];
    return (eventsData.items as any[]).map(item => ({
        id: item.id,
        summary: item.summary,
        start: item.start,
        end: item.end,
        location: item.location,
        description: item.description,
        attachments: (item.attachments || []).map((att: any) => ({
            fileUrl: att.fileUrl,
            title: att.title,
            fileId: att.fileId,
            mimeType: att.mimeType,
        }))
    })).sort((a: CalendarEvent, b: CalendarEvent) => parseISO(b.start).getTime() - parseISO(a.start).getTime());
  }, [eventsData]);

  const filteredEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter(event => isSameDay(parseISO(event.start), selectedDate));
  }, [events, selectedDate]);
  
  const eventForReport = useMemo(() => activeTab === 'pilih' ? selectedEvent : manualEvent, [activeTab, selectedEvent, manualEvent]);
  
  const handlePrint = () => {
    if (!eventForReport?.summary) {
        toast({
            variant: "destructive",
            title: "Data Belum Lengkap",
            description: "Mohon isi nama kegiatan sebelum mencetak.",
        });
        return;
    }

    const getEditableContent = (id: string) => document.getElementById(id)?.innerHTML || '';

    const reportData: ReportData = {
        event: eventForReport,
        dasar: getEditableContent('report-dasar'),
        pimpinan: getEditableContent('report-pimpinan'),
        labelPimpinan: getEditableContent('label-pimpinan'),
        narasumber: getEditableContent('report-narasumber'),
        labelNarasumber: getEditableContent('label-narasumber'),
        peserta: getEditableContent('report-peserta'),
        labelPeserta: getEditableContent('label-peserta'),
        reportContent: reportContent,
        lokasiTanggal: getEditableContent('report-lokasi-tanggal'),
        pelapor: getEditableContent('report-pelapor'),
        photoAttachments: eventForReport.attachments?.filter(att => att.mimeType?.startsWith('image/')) || [],
    };
    
    // Simpan ke localStorage untuk diambil oleh tab baru
    localStorage.setItem('reportDataForPrint', JSON.stringify(reportData));
    
    // Buka tab baru
    window.open('/report/preview', '_blank');
  };
  
  const handleReset = () => {
    setSelectedDate(undefined);
    setSelectedEvent(null);
    setManualEvent({ summary: '', location: '', start: new Date().toISOString(), end: new Date().toISOString(), waktu: '' });
    setReportContent('');
    toast({ description: 'Semua isian telah dikosongkan.' });
  }

  useEffect(() => {
    setReportContent('');
  }, [selectedEvent, activeTab]);

  const isPrintDisabled = activeTab === 'pilih' ? !selectedEvent : !manualEvent.summary;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Buat Laporan/Notulen"
        description="Pilih kegiatan dari kalender atau input manual untuk membuat draf laporan."
      >
        <div className='flex items-center gap-2'>
            <Button variant="outline" onClick={handleReset}>
                <Trash className="mr-2 h-4 w-4"/>
                Reset
            </Button>
            <Button onClick={handlePrint} disabled={isPrintDisabled}>
                <Printer className="mr-2 h-4 w-4" />
                Cetak Laporan
            </Button>
        </div>
      </PageHeader>
        <Card>
          <CardContent className='p-6'>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className='grid w-full grid-cols-2'>
                    <TabsTrigger value="pilih">Pilih dari Kalender</TabsTrigger>
                    <TabsTrigger value="manual">Input Manual</TabsTrigger>
                </TabsList>
                <TabsContent value="pilih" className='mt-6'>
                    {eventsError && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{eventsError.message}</AlertDescription></Alert>}
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
                </TabsContent>
                <TabsContent value="manual" className='mt-6'>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor='manual-summary'>Nama Kegiatan</Label>
                            <Input id='manual-summary' value={manualEvent.summary} onChange={(e) => setManualEvent(s => ({...s, summary: e.target.value}))} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor='manual-location'>Tempat</Label>
                            <Input id='manual-location' value={manualEvent.location} onChange={(e) => setManualEvent(s => ({...s, location: e.target.value}))} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor='manual-waktu'>Waktu</Label>
                            <Input id='manual-waktu' placeholder='e.g., 09:00 WIB s.d. Selesai' value={manualEvent.waktu} onChange={(e) => setManualEvent(s => ({...s, waktu: e.target.value}))} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="manual-start-date">Tanggal Mulai</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn("w-full justify-start text-left font-normal", !manualEvent.start && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {manualEvent.start ? format(parseISO(manualEvent.start), "PPP", { locale: localeId }) : <span>Pilih tanggal</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={parseISO(manualEvent.start)} onSelect={(date) => setManualEvent(s => ({...s, start: date?.toISOString() || ''}))} initialFocus locale={localeId} />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="manual-end-date">Tanggal Selesai</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn("w-full justify-start text-left font-normal", !manualEvent.end && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {manualEvent.end ? format(parseISO(manualEvent.end), "PPP", { locale: localeId }) : <span>Pilih tanggal</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={parseISO(manualEvent.end || manualEvent.start)} onSelect={(date) => setManualEvent(s => ({...s, end: date?.toISOString() || ''}))} initialFocus locale={localeId} />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

          </CardContent>
        </Card>

        <div className="mt-4">
            {eventForReport?.summary ? (
                <ReportEditorTemplate 
                  event={eventForReport} 
                  reportContent={reportContent} 
                  onContentChange={setReportContent}
                />
            ) : (
                <Card className="text-center text-muted-foreground py-16">
                    <div className='flex flex-col items-center justify-center gap-2'>
                        <Info className='h-8 w-8 text-muted-foreground/50' />
                        <p>Pilih atau input kegiatan di atas untuk memulai membuat laporan.</p>
                    </div>
                </Card>
            )}
        </div>

        <style jsx global>{`
            span[contenteditable="true"]:empty::before {
                content: attr(data-placeholder);
                color: #666;
                font-style: italic;
                display: block;
            }
             span[contenteditable="true"][data-placeholder]:not(:focus):empty {
                content: attr(data-placeholder);
                color: #666;
                font-style: italic;
             }
        `}</style>
    </div>
  );
}
