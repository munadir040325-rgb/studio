
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Calendar as CalendarIcon, Loader2, Printer, Edit, Image as ImageIcon, FileText as FileTextIcon } from 'lucide-react';
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
import DOMPurify from 'isomorphic-dompurify';

type CalendarAttachment = {
    fileUrl: string | null | undefined;
    title: string | null | undefined;
    fileId: string | null | undefined;
    mimeType?: string | null | undefined;
};

type EventData = {
    id: string;
    summary: string;
    start: string;
    end: string;
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

const ReportEditorField = ({ label, value, onEditorChange, placeholder }: { label: string, value: string, onEditorChange: (html: string) => void, placeholder: string }) => (
    <div className="grid gap-2">
        <Label>{label}</Label>
        <RichTextEditor
            onChange={onEditorChange}
            placeholder={placeholder}
        />
    </div>
);


export default function ReportPage() {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [events, setEvents] = useState<EventData[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const { toast } = useToast();

    // Report form state
    const [dasar, setDasar] = useState('');
    const [pimpinan, setPimpinan] = useState('');
    const [labelPimpinan, setLabelPimpinan] = useState('Pimpinan Rapat');
    const [narasumber, setNarasumber] = useState('');
    const [labelNarasumber, setLabelNarasumber] = useState('Narasumber/Verifikator');
    const [peserta, setPeserta] = useState('');
    const [labelPeserta, setLabelPeserta] = useState('Peserta/Pejabat yang Hadir');
    const [reportContent, setReportContent] = useState('');
    const [lokasiTanggal, setLokasiTanggal] = useState('');
    const [pelapor, setPelapor] = useState('');
    
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
        if (selectedDate) {
            fetchEvents(selectedDate);
        }
    }, [selectedDate, fetchEvents]);

    const selectedEvent = useMemo(() => {
        return events.find(e => e.id === selectedEventId);
    }, [events, selectedEventId]);

    useEffect(() => {
        if (selectedEvent) {
             const defaultLokasi = process.env.NEXT_PUBLIC_KOP_KECAMATAN || "Gandrungmangu";
             const defaultTanggal = format(parseISO(selectedEvent.start), 'dd MMMM yyyy', { locale: localeId });
             setLokasiTanggal(`${defaultLokasi}, ${defaultTanggal}`);

             const imageAttachments = selectedEvent.attachments?.filter(att => 
                att.mimeType?.startsWith('image/')
             ) || [];
             setPhotoAttachments(imageAttachments);
        }
    }, [selectedEvent]);

    const handlePrint = () => {
        if (!selectedEvent) {
            toast({ variant: 'destructive', title: 'Belum Lengkap', description: 'Silakan pilih kegiatan terlebih dahulu.' });
            return;
        }

        setIsPrinting(true);
        
        const reportData = {
            event: selectedEvent,
            dasar, pimpinan, labelPimpinan, narasumber, labelNarasumber, peserta, labelPeserta, reportContent, lokasiTanggal, pelapor, photoAttachments
        };

        localStorage.setItem('reportDataForPrint', JSON.stringify(reportData));
        
        const printWindow = window.open('/report/preview', '_blank');
        if (printWindow) {
            printWindow.onload = () => {
                 setTimeout(() => setIsPrinting(false), 500);
            };
        } else {
            toast({ variant: 'destructive', title: 'Gagal Membuka Pratinjau', description: 'Pastikan browser Anda tidak memblokir pop-up.'});
            setIsPrinting(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Buat Laporan Kegiatan"
                description="Pilih kegiatan yang sudah ada untuk membuat draf laporan atau nota dinas."
            >
                 <Button onClick={handlePrint} disabled={isPrinting || !selectedEvent}>
                    {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                    Cetak Laporan
                </Button>
            </PageHeader>

            <Card>
                <CardHeader>
                    <CardTitle>Pilih Kegiatan</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
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
                                    <SelectItem key={event.id} value={event.id}>
                                        {event.summary}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {selectedEvent && (
                <Card>
                    <CardHeader>
                        <CardTitle>Isi Detail Laporan</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                               <ReportEditorField label="I. Dasar Kegiatan" value={dasar} onEditorChange={setDasar} placeholder="1. Peraturan Daerah..." />
                               <div className="grid gap-2">
                                  <Label>II. Rincian Kegiatan</Label>
                                  <div className="p-4 border rounded-md bg-muted/50 space-y-2 text-sm">
                                      <p><strong className="w-24 inline-block">Acara</strong>: {selectedEvent.summary}</p>
                                      <p><strong className="w-24 inline-block">Waktu</strong>: {format(parseISO(selectedEvent.start), "EEEE, dd MMMM yyyy 'pukul' HH:mm", { locale: localeId })}</p>
                                      <p><strong className="w-24 inline-block">Tempat</strong>: {selectedEvent.location}</p>
                                  </div>
                               </div>
                                <ReportEditorField label="Pimpinan Rapat" value={pimpinan} onEditorChange={setPimpinan} placeholder="Contoh: Camat Gandrungmangu" />
                                <ReportEditorField label="Narasumber/Verifikator" value={narasumber} onEditorChange={setNarasumber} placeholder="Contoh: 1. Inspektorat Daerah..." />
                                <ReportEditorField label="Peserta" value={peserta} onEditorChange={setPeserta} placeholder="Contoh: 1. Kasubbag Perencanaan..." />
                            </div>
                            <div className="space-y-4">
                                <ReportEditorField label="III. Hasil dan Tindak Lanjut" value={reportContent} onEditorChange={setReportContent} placeholder="Tuliskan hasil pembahasan dan langkah selanjutnya..." />
                                <div className="grid grid-cols-2 gap-4">
                                   <ReportField label="Lokasi & Tanggal Laporan" id="lokasi-tanggal" value={lokasiTanggal} onChange={(e) => setLokasiTanggal(e.target.value)} placeholder="Gandrungmangu, ..." />
                                   <ReportField label="Pelapor" id="pelapor" value={pelapor} onChange={(e) => setPelapor(e.target.value)} placeholder="Nama Pelapor" />
                                </div>
                            </div>
                        </div>

                         {photoAttachments.length > 0 && (
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
