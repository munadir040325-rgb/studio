'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Calendar as CalendarIcon, Loader2, Printer } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/editor';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/page-header';
import { Switch } from '@/components/ui/switch';
import type { DateRange } from 'react-day-picker';


type CalendarAttachment = {
    fileUrl: string | null | undefined;
    title: string | null | undefined;
    fileId: string | null | undefined;
    mimeType?: string | null | undefined;
};

type EventData = {
    id?: string;
    summary: string;
    start: string;
    end?: string;
    location?: string | null;
    waktu?: string;
    description?: string | null;
    attachments?: CalendarAttachment[];
};

type ReportFieldProps = {
    label: string;
    id: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
};

const ReportField = ({ label, id, value, onChange, placeholder }: ReportFieldProps) => (
    <div className="grid gap-2">
        <Label htmlFor={id}>{label}</Label>
        <Input id={id} value={value} onChange={onChange} placeholder={placeholder} />
    </div>
);

const ReportEditorField = ({ label, value, onEditorChange, placeholder, heightClass }: { label: string, value: string, onEditorChange: (html: string) => void, placeholder: string, heightClass?: string }) => (
    <div className="grid gap-2">
        <Label>{label}</Label>
        <RichTextEditor
            onChange={onEditorChange}
            placeholder={placeholder}
            initialHeight={heightClass}
        />
    </div>
);


export default function ReportPage() {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [events, setEvents] = useState<EventData[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [isManualMode, setIsManualMode] = useState(false);
    const { toast } = useToast();

    // Manual input state
    const [manualSummary, setManualSummary] = useState('');
    const [manualWaktu, setManualWaktu] = useState('');
    const [manualTempat, setManualTempat] = useState('');
    const [manualDateRange, setManualDateRange] = useState<DateRange | undefined>();

    // Report form state
    const [dasar, setDasar] = useState('');
    const [pelaksana, setPelaksana] = useState('');
    const [narasumber, setNarasumber] = useState('');
    const [peserta, setPeserta] = useState('');
    const [reportContent, setReportContent] = useState('');
    
    // Attachment state
    const [photoAttachments, setPhotoAttachments] = useState<CalendarAttachment[]>([]);

    useEffect(() => {
        setSelectedDate(new Date());
    }, []);

    const fetchEvents = useCallback(async (date: Date) => {
        if (!date) return;
        setIsLoading(true);
        setEvents([]);
        setSelectedEventId('');
        try {
            const dateStr = format(date, 'yyyy-MM-dd');
            const res = await fetch(`/api/events?start=${dateStr}&end=${dateStr}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal mengambil data kegiatan.");
            setEvents(data.items || []);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (selectedDate && !isManualMode) {
            fetchEvents(selectedDate);
        }
    }, [selectedDate, fetchEvents, isManualMode]);

    const selectedEvent = useMemo(() => {
        if (isManualMode) return null;
        return events.find(e => e.id === selectedEventId);
    }, [events, selectedEventId, isManualMode]);

    useEffect(() => {
        const eventToUse = selectedEvent;
        if (eventToUse) {
             const imageAttachments = eventToUse.attachments?.filter(att => 
                att.mimeType?.startsWith('image/')
             ) || [];
             setPhotoAttachments(imageAttachments);
        } else {
             setPhotoAttachments([]);
        }
    }, [selectedEvent]);

    const handleIframePrint = () => {
        const eventData = isManualMode
            ? { 
                summary: manualSummary, 
                start: manualDateRange?.from?.toISOString() ?? new Date().toISOString(),
                end: manualDateRange?.to?.toISOString(),
                waktu: manualWaktu, 
                location: manualTempat 
              }
            : selectedEvent;
            
        if (!eventData || !eventData.summary) {
            toast({ variant: 'destructive', title: 'Belum Lengkap', description: 'Silakan pilih kegiatan atau isi data manual terlebih dahulu.' });
            return;
        }

        setIsPrinting(true);
        const reportData = {
            event: eventData,
            dasar, 
            pelaksana, 
            narasumber, 
            peserta, 
            reportContent, 
            photoAttachments,
        };

        localStorage.setItem('reportDataForPrint', JSON.stringify(reportData));
        
        let iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
        if (iframe) {
            document.body.removeChild(iframe);
        }

        iframe = document.createElement('iframe');
        iframe.id = 'print-iframe';
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        
        iframe.onload = () => {
            try {
                iframe.contentWindow?.focus(); // Focus on the iframe
                iframe.contentWindow?.print(); // Trigger print
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Gagal Mencetak', description: `Terjadi kesalahan saat membuka dialog cetak: ${e.message}` });
            } finally {
                setIsPrinting(false);
                // Optionally remove the iframe after a delay
                setTimeout(() => {
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                    }
                }, 1000);
            }
        };

        iframe.src = '/report/preview';
        document.body.appendChild(iframe);
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Buat Laporan Kegiatan"
                description="Pilih kegiatan yang sudah ada atau input manual untuk membuat draf laporan."
            >
                 <Button onClick={handleIframePrint} disabled={isPrinting || (!selectedEventId && !isManualMode)}>
                    {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                    Cetak Laporan
                </Button>
            </PageHeader>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Pilih Kegiatan</CardTitle>
                        <div className="flex items-center space-x-2">
                            <Switch id="manual-mode" checked={isManualMode} onCheckedChange={setIsManualMode} />
                            <Label htmlFor="manual-mode">Input Manual</Label>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    {isManualMode ? (
                        <>
                            <ReportField label="Judul Kegiatan" id="manual-summary" value={manualSummary} onChange={(e) => setManualSummary(e.target.value)} placeholder="Misal: Rapat Koordinasi..." />
                            <div className="grid gap-2">
                                <Label>Tanggal Kegiatan</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button id="date" variant={"outline"} className="w-full justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {manualDateRange?.from ? (
                                                manualDateRange.to ? (
                                                    `${format(manualDateRange.from, "LLL dd, y")} - ${format(manualDateRange.to, "LLL dd, y")}`
                                                ) : (
                                                    format(manualDateRange.from, "LLL dd, y")
                                                )
                                            ) : (
                                                <span>Pilih rentang tanggal</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={manualDateRange?.from}
                                            selected={manualDateRange}
                                            onSelect={setManualDateRange}
                                            numberOfMonths={2}
                                            locale={localeId}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <ReportField label="Waktu Pelaksanaan" id="manual-waktu" value={manualWaktu} onChange={(e) => setManualWaktu(e.target.value)} placeholder="Misal: Pukul 09.00 WIB s.d. Selesai" />
                            <ReportField label="Tempat Pelaksanaan" id="manual-tempat" value={manualTempat} onChange={(e) => setManualTempat(e.target.value)} placeholder="Misal: Aula Kecamatan" />
                        </>
                    ) : (
                        <>
                            <div className="grid gap-2">
                                <Label>1. Pilih Tanggal Kegiatan</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={'outline'} className="w-full justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {selectedDate ? format(selectedDate, 'PPP', { locale: localeId }) : <span>Pilih tanggal</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus locale={localeId} />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="grid gap-2">
                                <Label>2. Pilih Kegiatan</Label>
                                <Select value={selectedEventId} onValueChange={setSelectedEventId} disabled={isLoading || events.length === 0}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={isLoading ? 'Memuat...' : (events.length > 0 ? 'Pilih dari daftar...' : 'Tidak ada kegiatan di tanggal ini')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {events.map(event => (
                                            event.id && <SelectItem key={event.id} value={event.id}>{event.summary}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {(selectedEvent || isManualMode) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Isi Detail Laporan</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                               <ReportEditorField label="Dasar Kegiatan" value={dasar} onEditorChange={setDasar} placeholder="1. Peraturan Daerah..." heightClass="h-20" />
                                <ReportEditorField label="Pelaksana" value={pelaksana} onEditorChange={setPelaksana} placeholder="Contoh: Camat Gandrungmangu" heightClass="h-20" />
                                <ReportEditorField label="Narasumber/Verifikator" value={narasumber} onEditorChange={setNarasumber} placeholder="Contoh: 1. Inspektorat Daerah..." heightClass="h-20" />
                                <ReportEditorField label="Pejabat/Peserta" value={peserta} onEditorChange={setPeserta} placeholder="Contoh: 1. Kasubbag Perencanaan..." heightClass="h-20" />
                            </div>
                            <div className="space-y-4">
                                <ReportEditorField label="Hasil dan Tindak Lanjut" value={reportContent} onEditorChange={setReportContent} placeholder="Tuliskan hasil pembahasan dan langkah selanjutnya..." heightClass="min-h-48" />
                            </div>
                        </div>

                         {photoAttachments.length > 0 && !isManualMode && (
                            <div>
                                <Label>Lampiran Foto</Label>
                                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {photoAttachments.map((att, index) => (
                                        att.fileId && (
                                            <div key={index} className="relative aspect-video border rounded-md overflow-hidden">
                                                <img src={`/api/drive/cache-image/${att.fileId}`} alt={att.title || 'lampiran'} className="object-cover w-full h-full" />
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>
                        )}

                    </CardContent>
                </Card>
            )}
        </div>
    );
}
