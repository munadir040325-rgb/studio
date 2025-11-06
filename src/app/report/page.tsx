'use client';

import { useState, useMemo, useRef } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Loader2, Printer, Trash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { parseISO, format, isSameDay } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import useSWR from 'swr';
import { extractDisposisi } from '../calendar/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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

const EditableField = ({ placeholder, className }: { placeholder: string, className?: string }) => (
    <span
        contentEditable
        suppressContentEditableWarning
        className={cn("p-1 -m-1 rounded-md min-w-[10rem] inline-block bg-muted/50 hover:bg-muted focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring print:bg-transparent", className)}
        data-placeholder={placeholder}
    />
);

const ReportPreview = ({ event }: { event: CalendarEvent | null }) => {
    const disposisi = event ? extractDisposisi(event.description) : null;
    const reportDate = format(new Date(), 'dd MMMM yyyy', { locale: localeId });

    if (!event) {
        return (
            <div className="text-center text-muted-foreground py-16">
                <p>Pilih tanggal dan kegiatan di atas untuk melihat pratinjau laporan.</p>
            </div>
        )
    }

    return (
        <div id="print-area" className="bg-white text-black p-12 shadow-lg rounded-sm print:shadow-none print:p-4 font-serif">
            <h3 className="text-center font-bold underline text-lg">NOTA DINAS</h3>
            <br />
            <table className="w-full text-sm">
                <tbody>
                    <tr><td className="w-28 align-top">YTH.</td><td className="w-2 align-top">:</td><td className="font-semibold">CAMAT GANDRUNGMANGU</td></tr>
                    <tr><td className="align-top">DARI</td><td className="align-top">:</td><td><EditableField placeholder="Nama Pelapor, Jabatan" /></td></tr>
                    <tr><td className="align-top">TEMBUSAN</td><td className="align-top">:</td><td>SEKRETARIS KECAMATAN GANDRUNGMANGU</td></tr>
                    <tr><td className="align-top">TANGGAL</td><td className="align-top">:</td><td>{reportDate}</td></tr>
                    <tr><td className="align-top">NOMOR</td><td className="align-top">:</td><td><EditableField placeholder="Nomor Surat" /></td></tr>
                    <tr><td className="align-top">SIFAT</td><td className="align-top">:</td><td>BIASA</td></tr>
                    <tr><td className="align-top">LAMPIRAN</td><td className="align-top">:</td><td>-</td></tr>
                    <tr><td className="align-top">HAL</td><td className="align-top">:</td><td className="font-semibold">LAPORAN HASIL PELAKSANAAN KEGIATAN</td></tr>
                </tbody>
            </table>

            <hr className="border-black my-4" />

            <p className="text-sm text-justify">
                Dasar Surat <EditableField placeholder="Asal Surat (e.g., Undangan dari...)" /> Nomor : <EditableField placeholder="Nomor Surat Undangan" /> tanggal <EditableField placeholder="Tanggal Surat Undangan" /> perihal Undangan, dengan ini kami laporkan hasil pelaksanaan kegiatan sebagai berikut:
            </p>

            <div className="mt-4 text-sm space-y-4">
                <div className="flex">
                    <span className="w-8 font-semibold">I.</span>
                    <div className="w-full">
                        <p className="font-semibold">Pelaksanaan</p>
                        <table className="w-full">
                           <tbody>
                                <tr><td className="w-28 align-top">Acara</td><td className="w-2 align-top">:</td><td>{event.summary}</td></tr>
                                <tr><td className="align-top">Hari/Tanggal</td><td className="align-top">:</td><td>{format(parseISO(event.start), 'EEEE, dd MMMM yyyy', { locale: localeId })}</td></tr>
                                <tr><td className="align-top">Waktu</td><td className="align-top">:</td><td>Pukul {format(parseISO(event.start), 'HH:mm', { locale: localeId })} WIB s.d. Selesai</td></tr>
                                <tr><td className="align-top">Tempat</td><td className="align-top">:</td><td>{event.location || <EditableField placeholder="Tempat Kegiatan" />}</td></tr>
                                <tr><td className="align-top">Peserta</td><td className="align-top">:</td><td><EditableField placeholder="Sebutkan peserta/perwakilan yang hadir" /></td></tr>
                           </tbody>
                        </table>
                    </div>
                </div>
                <div className="flex">
                    <span className="w-8 font-semibold">II.</span>
                    <div className="flex items-start gap-1 w-full">
                        <p className="font-semibold w-36">Pimpinan Rapat</p>
                        <span>:</span>
                        <EditableField placeholder="Isi Pimpinan Rapat" />
                    </div>
                </div>
                <div className="flex">
                    <span className="w-8 font-semibold">III.</span>
                     <div className="flex items-start gap-1 w-full">
                        <p className="font-semibold w-36">Narasumber</p>
                        <span>:</span>
                        <EditableField placeholder="Isi Narasumber" />
                    </div>
                </div>
                <div className="flex">
                    <span className="w-8 font-semibold">IV.</span>
                     <div className="w-full">
                        <p className="font-semibold">Ringkasan Materi</p>
                         <div
                            contentEditable
                            suppressContentEditableWarning
                            className="mt-2 p-1 -m-1 rounded-md min-h-[8rem] bg-muted/50 hover:bg-muted focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring print:bg-transparent"
                            data-placeholder="Isi ringkasan materi di sini. Anda bisa membuat daftar bernomor (1., 2., ...) atau paragraf biasa."
                        />
                    </div>
                </div>
            </div>
            
            <p className="text-sm mt-4">Demikian untuk menjadikan periksa dan terima kasih.</p>

            <div className="flex justify-end mt-16">
                <div className="text-center text-sm w-64">
                    <p>Yang melaksanakan kegiatan,</p>
                    <br /><br /><br />
                    <p className="font-semibold underline">
                        <EditableField placeholder="Nama Pelapor" />
                    </p>
                </div>
            </div>
        </div>
    );
};


export default function ReportPage() {
  const { toast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const { data: eventsData, error: eventsError, isLoading: isLoadingEvents } = useSWR('/api/events', fetcher);
  
  const events: CalendarEvent[] = eventsData?.items.sort((a: CalendarEvent, b: CalendarEvent) => parseISO(b.start).getTime() - parseISO(a.start).getTime()) || [];
  
  const filteredEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter(event => isSameDay(parseISO(event.start), selectedDate));
  }, [events, selectedDate]);
  
  const handlePrint = () => {
    if (!selectedEvent) {
        toast({ variant: 'destructive', title: 'Gagal Mencetak', description: 'Pilih kegiatan terlebih dahulu.'});
        return;
    }
    window.print();
  }
  
  const handleReset = () => {
    setSelectedDate(undefined);
    setSelectedEvent(null);
    toast({ description: 'Pilihan telah dikosongkan.' });
  }

  return (
    <div className="flex flex-col gap-6 print:gap-0">
      <PageHeader
        title="Buat Laporan/Notulen"
        description="Pilih kegiatan untuk membuat draf laporan yang siap cetak."
        className="print:hidden"
      />
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle>Pilih Kegiatan</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
            <CardFooter className="flex justify-end gap-2 mt-4 border-t pt-6">
                <Button variant="outline" onClick={handleReset}>
                    <Trash className="mr-2 h-4 w-4"/>
                    Reset
                </Button>
                <Button onClick={handlePrint} disabled={!selectedEvent}>
                    <Printer className="mr-2 h-4 w-4" />
                    Cetak Laporan
                </Button>
            </CardFooter>
        </Card>

        {/* --- Area Pratinjau Dokumen --- */}
        <div className="mt-4" id="report-preview-container">
            <ReportPreview event={selectedEvent} />
        </div>

        {/* CSS Khusus untuk Mencetak */}
        <style jsx global>{`
            @media print {
                body, html {
                    visibility: hidden;
                    margin: 0;
                    padding: 0;
                }
                #report-preview-container, #report-preview-container * {
                    visibility: visible;
                }
                #report-preview-container {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: auto;
                    margin: 0;
                    padding: 0;
                }
                main.p-4, main.p-6 {
                    padding: 0 !important;
                    margin: 0 !important;
                }
                .print\\:hidden {
                    display: none !important;
                }
                #print-area {
                    box-shadow: none;
                    margin: 0;
                    padding: 0;
                    border: none;
                }
                span[contentEditable="true"], div[contentEditable="true"] {
                   background-color: transparent !important;
                   border: none !important;
                   box-shadow: none !important;
                   -webkit-print-color-adjust: exact !important;
                }
                 span[contentEditable="true"]:empty::before,
                 div[contentEditable="true"]:empty::before {
                    content: attr(data-placeholder);
                    color: #999;
                    font-style: italic;
                    visibility: visible;
                }
            }
             span[contentEditable="true"]:empty::before,
             div[contentEditable="true"]:empty::before {
                content: attr(data-placeholder);
                color: #666;
                font-style: italic;
                display: block; /* Ensures placeholder is visible */
            }
        `}</style>
    </div>
  );
}
