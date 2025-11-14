
'use client';

import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Loader2, Printer, Trash, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { parseISO, format, isSameDay } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import useSWR from 'swr';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RichTextEditor } from '@/components/editor';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';


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

export default function ReportPage() {
  const { toast } = useToast();
  
  const [isManualMode, setIsManualMode] = useState(false);
  
  // State for "Pilih dari Kalender"
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // State for "Input Manual"
  const [manualEvent, setManualEvent] = useState<ManualEvent>({ summary: '', location: '', start: new Date().toISOString(), end: new Date().toISOString(), waktu: '' });
  
  const [reportContent, setReportContent] = useState('');
  
  // State for additional editable fields
  const [dasar, setDasar] = useState('');
  const [pimpinan, setPimpinan] = useState('');
  const [narasumber, setNarasumber] = useState('');
  const [peserta, setPeserta] = useState('');
  const [pelapor, setPelapor] = useState('');


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
  
  const eventForReport = useMemo(() => !isManualMode ? selectedEvent : manualEvent, [isManualMode, selectedEvent, manualEvent]);
  
  const handlePrint = () => {
    if (!eventForReport?.summary) {
        toast({
            variant: "destructive",
            title: "Data Belum Lengkap",
            description: "Mohon isi nama kegiatan sebelum mencetak.",
        });
        return;
    }

    const defaultLokasiTanggal = `Gandrungmangu, ${format(parseISO(eventForReport.start), 'dd MMMM yyyy', { locale: localeId })}`;

    const reportData: ReportData = {
        event: eventForReport,
        dasar: dasar,
        pimpinan: pimpinan,
        labelPimpinan: 'Pimpinan Rapat',
        narasumber: narasumber,
        labelNarasumber: 'Narasumber/Verifikator',
        peserta: peserta,
        labelPeserta: 'Peserta/Pejabat yang Hadir',
        reportContent: reportContent,
        lokasiTanggal: defaultLokasiTanggal,
        pelapor: pelapor,
        photoAttachments: eventForReport.attachments?.filter(att => att.fileUrl && (att.fileUrl.includes('image') || att.mimeType?.startsWith('image/'))) || [],
    };
    
    localStorage.setItem('reportDataForPrint', JSON.stringify(reportData));
    window.open('/report/preview', '_blank');
  };
  
  const handleReset = () => {
    setSelectedDate(undefined);
    setSelectedEvent(null);
    setManualEvent({ summary: '', location: '', start: new Date().toISOString(), end: new Date().toISOString(), waktu: '' });
    setReportContent('');
    setDasar('');
    setPimpinan('');
    setNarasumber('');
    setPeserta('');
    setPelapor('');
    setIsManualMode(false);
    toast({ description: 'Semua isian telah dikosongkan.' });
  }

  useEffect(() => {
    setReportContent('');
    setDasar('');
    setPimpinan('');
    setNarasumber('');
    setPeserta('');
    setPelapor('');
  }, [selectedEvent, isManualMode]);

  const isPrintDisabled = !eventForReport?.summary;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Buat Laporan"
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
            <CardHeader>
                <CardTitle>Detail Kegiatan</CardTitle>
            </CardHeader>
            <CardContent className='p-4'>
                <div className="flex items-center space-x-2 mb-4">
                    <Switch id="manual-mode-switch" checked={isManualMode} onCheckedChange={setIsManualMode} />
                    <Label htmlFor="manual-mode-switch">Aktifkan Mode Input Manual</Label>
                </div>
                
                {isManualMode ? (
                    <div className='mt-4 space-y-4 animate-in fade-in-0'>
                        <h3 className='font-semibold'>Input Detail Kegiatan</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>
                ) : (
                    <div className='space-y-4 animate-in fade-in-0'>
                        {eventsError && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{eventsError.message}</AlertDescription></Alert>}
                        <h3 className='font-semibold'>Pilih Kegiatan dari Kalender</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                            <Label htmlFor="tanggal-kegiatan">Pilih Tanggal Kegiatan</Label>
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
                            <Label htmlFor="kegiatan">Pilih Kegiatan</Label>
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
                    </div>
                )}
            </CardContent>
        </Card>

        {eventForReport?.summary ? (
            <Card>
                <CardHeader>
                  <CardTitle>Rincian Laporan</CardTitle>
                </CardHeader>
                <CardContent className='p-4 grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor='report-pelapor'>Pelaksana / Pelapor</Label>
                        <Textarea id='report-pelapor' placeholder="Nama yang membuat laporan" value={pelapor} onChange={(e) => setPelapor(e.target.value)} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor='report-peserta'>Peserta/Pejabat yang Hadir</Label>
                        <Textarea id='report-peserta' placeholder="Sebutkan peserta atau pejabat yang hadir" value={peserta} onChange={(e) => setPeserta(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor='report-narasumber'>Narasumber / Verifikator</Label>
                        <Textarea id='report-narasumber' placeholder="Nama narasumber atau verifikator" value={narasumber} onChange={(e) => setNarasumber(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor='report-pimpinan'>Pimpinan Rapat</Label>
                        <Textarea id='report-pimpinan' placeholder="Nama pimpinan rapat" value={pimpinan} onChange={(e) => setPimpinan(e.target.value)} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor='report-dasar'>Dasar Pelaksanaan (Jika Ada)</Label>
                        <Textarea id='report-dasar' placeholder="e.g., Undangan No. XXX" value={dasar} onChange={(e) => setDasar(e.target.value)} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label>Rincian dan Hasil Pelaksanaan</Label>
                        <RichTextEditor
                            onChange={setReportContent}
                            placeholder="Ketik hasil laporan di sini..."
                        />
                    </div>
                </CardContent>
            </Card>
        ) : (
            <Card className="text-center text-muted-foreground py-16">
                <div className='flex flex-col items-center justify-center gap-2'>
                    <Info className='h-8 w-8 text-muted-foreground/50' />
                    <p>Pilih atau input kegiatan di atas untuk mengisi detail laporan.</p>
                </div>
            </Card>
        )}

    </div>
  );
}
