

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Calendar as CalendarIcon, Loader2, Printer, X } from 'lucide-react';
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { findSppdByEventId } from '@/ai/flows/sheets-flow';


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

type PegawaiData = {
    id: string;
    nama: string;
    nip: string;
    pangkat: string;
    jabatan: string;
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

const ReportEditorField = ({ value, onEditorChange, placeholder, heightClass }: { value: string, onEditorChange: (html: string) => void, placeholder: string, heightClass?: string }) => (
    <RichTextEditor
        onChange={onEditorChange}
        placeholder={placeholder}
        initialHeight={heightClass}
    />
);


export default function ReportPage() {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [events, setEvents] = useState<EventData[]>([]);
    const [pegawaiList, setPegawaiList] = useState<PegawaiData[]>([]);
    const [selectedPegawai, setSelectedPegawai] = useState<PegawaiData[]>([]);
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
    
    const fetchPegawai = useCallback(async () => {
        try {
            const res = await fetch('/api/pegawai');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal mengambil data pegawai.");
            setPegawaiList(data.pegawai || []);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error Pegawai', description: error.message });
        }
    }, [toast]);

    useEffect(() => {
        if (selectedDate && !isManualMode) {
            fetchEvents(selectedDate);
        }
        fetchPegawai();
    }, [selectedDate, fetchEvents, fetchPegawai, isManualMode]);

    const selectedEvent = useMemo(() => {
        if (isManualMode) return null;
        return events.find(e => e.id === selectedEventId);
    }, [events, selectedEventId, isManualMode]);
    
    // Fetch SPPD data when event is selected
    useEffect(() => {
        const fetchSppd = async () => {
            if (selectedEventId && !isManualMode) {
                try {
                    const sppdData = await findSppdByEventId({ eventId: selectedEventId });
                    
                    if (sppdData?.nomorSurat || sppdData?.dasarHukum) {
                        let dasarItems = [];
                        if (sppdData.dasarHukum) {
                            dasarItems.push(`<li>${sppdData.dasarHukum}</li>`);
                        }
                        if (sppdData.nomorSurat) {
                            dasarItems.push(`<li>Surat Perintah Tugas Camat Gandrungmangu Nomor: ${sppdData.nomorSurat}</li>`);
                        }
                        
                        const formattedDasar = `<ol>${dasarItems.join('')}</ol>`;
                        setDasar(formattedDasar);
                        toast({ title: 'Data SPPD ditemukan!', description: 'Dasar kegiatan telah diisi otomatis.' });
                    } else {
                        setDasar('-');
                    }

                } catch (e: any) {
                    console.warn("Could not fetch SPPD data:", e.message);
                    setDasar('-');
                }
            } else {
                setDasar('');
            }
        };
        fetchSppd();
    }, [selectedEventId, isManualMode, toast]);


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

     const handlePrint = () => {
        setIsPrinting(true);
        try {
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
                setIsPrinting(false); // Make sure to stop printing state on error
                return;
            }

            const reportData = {
                event: eventData,
                dasar: dasar,
                pelaksana: selectedPegawai,
                narasumber, 
                peserta, 
                reportContent, 
                photoAttachments,
            };

            const dataString = JSON.stringify(reportData);
            const encodedData = encodeURIComponent(dataString);
            
            const printWindow = window.open(`/report/preview?data=${encodedData}`, '_blank');

            if (!printWindow) {
                toast({ variant: 'destructive', title: 'Gagal Membuka Tab', description: 'Browser Anda mungkin memblokir pop-up. Mohon izinkan pop-up untuk situs ini.' });
            }
        } catch (e) {
            console.error("Error encoding report data", e);
            toast({ variant: 'destructive', title: 'Gagal', description: 'Terjadi kesalahan saat mempersiapkan data untuk dicetak.' });
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Buat Laporan Kegiatan"
                description="Pilih kegiatan yang sudah ada atau input manual untuk membuat draf laporan."
            >
                 <Button onClick={handlePrint} disabled={isPrinting || (!selectedEventId && !isManualMode)}>
                    {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                    Cetak Laporan
                </Button>
            </PageHeader>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Pilih Kegiatan & Pelaksana</CardTitle>
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
                                            event.id && <SelectItem key={event.id} value={event.id} className="h-auto whitespace-normal">{event.summary}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}
                     <div className="grid gap-2 md:col-span-2">
                        <Label>Pilih Pelaksana</Label>
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full h-auto min-h-10 justify-start">
                                    <div className="flex gap-1 flex-wrap">
                                        {selectedPegawai.length > 0 ? (
                                             selectedPegawai.map(p => (
                                                <Badge key={p.id} variant="secondary" className="mr-1">
                                                    {p.nama}
                                                    <button
                                                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setSelectedPegawai(prev => prev.filter(sp => sp.id !== p.id));
                                                        }}
                                                    >
                                                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                                    </button>
                                                </Badge>
                                            ))
                                        ) : "Pilih pelaksana..." }
                                    </div>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Cari nama pegawai..." />
                                    <CommandList>
                                        <CommandEmpty>Pegawai tidak ditemukan.</CommandEmpty>
                                        <CommandGroup>
                                            {pegawaiList.map(p => (
                                                <CommandItem
                                                    key={p.id}
                                                    onSelect={() => {
                                                        setSelectedPegawai(prev => 
                                                            prev.some(sp => sp.id === p.id)
                                                                ? prev.filter(sp => sp.id !== p.id)
                                                                : [...prev, p]
                                                        );
                                                    }}
                                                    className="cursor-pointer"
                                                >
                                                    {p.nama}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardContent>
            </Card>

            {(selectedEvent || isManualMode) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Isi Detail Laporan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="hasil" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="hasil">Hasil</TabsTrigger>
                                <TabsTrigger value="peserta">Peserta</TabsTrigger>
                                <TabsTrigger value="narasumber">Narasumber</TabsTrigger>
                            </TabsList>
                            <TabsContent value="hasil" className="mt-4">
                                <ReportEditorField
                                    value={reportContent}
                                    onEditorChange={setReportContent}
                                    placeholder="Tuliskan hasil pembahasan dan langkah selanjutnya dari kegiatan ini..."
                                    heightClass="min-h-48"
                                />
                            </TabsContent>
                            <TabsContent value="peserta" className="mt-4">
                                 <ReportEditorField
                                    value={peserta}
                                    onEditorChange={setPeserta}
                                    placeholder="1. Kasubbag Perencanaan..."
                                    heightClass="h-32"
                                />
                            </TabsContent>
                            <TabsContent value="narasumber" className="mt-4">
                                <ReportEditorField
                                    value={narasumber}
                                    onEditorChange={setNarasumber}
                                    placeholder="1. Inspektorat Daerah..."
                                    heightClass="h-32"
                                />
                            </TabsContent>
                        </Tabs>

                         {photoAttachments.length > 0 && !isManualMode && (
                            <div className="mt-6">
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
