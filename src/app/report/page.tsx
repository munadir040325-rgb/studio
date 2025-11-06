'use client';

import { useState, useMemo } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import DOMPurify from 'isomorphic-dompurify';
import { RichTextEditor } from '@/components/editor';

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


const ReportPreview = ({ event, reportContent }: { event: CalendarEvent | null, reportContent: string }) => {
    const reportDate = format(new Date(), 'dd MMMM yyyy', { locale: localeId });

    if (!event) {
        return (
            <div className="text-center text-muted-foreground py-16">
                <p>Pilih tanggal dan kegiatan di atas untuk melihat pratinjau laporan.</p>
            </div>
        )
    }

    return (
        <div id="print-area" className="bg-white text-black p-12 shadow-lg rounded-sm print:shadow-none print:p-4">
            <h3 className="text-center font-bold text-lg">NOTA DINAS</h3>
            <br />
            <table className="w-full border-separate" style={{borderSpacing: '0 4px'}}>
                <tbody>
                    <tr><td className="w-8"></td><td className="w-28 align-top">YTH.</td><td className="w-2 align-top">:</td><td className="font-semibold">CAMAT GANDRUNGMANGU</td></tr>
                    <tr><td></td><td className="align-top">DARI</td><td className="w-2 align-top">:</td><td><EditableField placeholder="Nama Pelapor, Jabatan" /></td></tr>
                    <tr><td></td><td className="align-top">TEMBUSAN</td><td className="w-2 align-top">:</td><td><EditableField placeholder="Isi tembusan" /></td></tr>
                    <tr><td></td><td className="align-top">TANGGAL</td><td className="w-2 align-top">:</td><td>{reportDate}</td></tr>
                    <tr><td></td><td className="align-top">NOMOR</td><td className="w-2 align-top">:</td><td><EditableField placeholder="Nomor Surat" /></td></tr>
                    <tr><td></td><td className="align-top">SIFAT</td><td className="w-2 align-top">:</td><td>BIASA</td></tr>
                    <tr><td></td><td className="align-top">LAMPIRAN</td><td className="w-2 align-top">:</td><td>-</td></tr>
                    <tr><td></td><td className="align-top">HAL</td><td className="w-2 align-top">:</td><td className="font-semibold">LAPORAN HASIL PELAKSANAAN KEGIATAN</td></tr>
                </tbody>
            </table>

            <hr className="border-black my-4" />
            
            <table className="w-full mt-4 border-separate" style={{borderSpacing: '0 4px'}}>
                <tbody>
                    <tr>
                        <td className="w-8 align-top font-semibold">I.</td>
                        <td className="w-28 align-top font-semibold">Dasar</td>
                        <td className="w-2 align-top">:</td>
                        <td>Surat <EditableField placeholder="Asal Surat (e.g., Undangan dari...)" /> Nomor : <EditableField placeholder="Nomor Surat Undangan" /> tanggal <EditableField placeholder="Tanggal Surat Undangan" /> perihal Undangan, dengan ini kami laporkan hasil pelaksanaan kegiatan sebagai berikut:</td>
                    </tr>
                    <tr><td colSpan={4} className="h-2"></td></tr>

                    <tr>
                        <td className="align-top font-semibold">II.</td>
                        <td colSpan={3} className='font-semibold'>Pelaksanaan</td>
                    </tr>
                    <tr>
                        <td></td>
                        <td className='align-top'>Acara</td>
                        <td className='align-top'>:</td>
                        <td>{event.summary}</td>
                    </tr>
                    <tr>
                        <td></td>
                        <td className='align-top'>Hari/Tanggal</td>
                        <td className='align-top'>:</td>
                        <td>{format(parseISO(event.start), 'EEEE, dd MMMM yyyy', { locale: localeId })}</td>
                    </tr>
                    <tr>
                        <td></td>
                        <td className='align-top'>Waktu</td>
                        <td className='align-top'>:</td>
                        <td>Pukul {format(parseISO(event.start), 'HH:mm', { locale: localeId })} WIB s.d. Selesai</td>
                    </tr>
                    <tr>
                        <td></td>
                        <td className='align-top'>Tempat</td>
                        <td className='align-top'>:</td>
                        <td>{event.location || <EditableField placeholder="Tempat Kegiatan" />}</td>
                    </tr>
                     <tr>
                        <td></td>
                        <td className='align-top'>Peserta</td>
                        <td className='align-top'>:</td>
                        <td><EditableField placeholder="Sebutkan peserta/perwakilan yang hadir" /></td>
                    </tr>

                    <tr><td colSpan={4} className="h-2"></td></tr>

                    <tr>
                        <td className="align-top font-semibold">III.</td>
                        <td className='align-top font-semibold'>Pimpinan Rapat</td>
                        <td className='w-2 align-top'>:</td>
                        <td><EditableField placeholder="Isi Pimpinan Rapat" /></td>
                    </tr>

                    <tr><td colSpan={4} className="h-2"></td></tr>

                     <tr>
                        <td className="align-top font-semibold">IV.</td>
                        <td className='align-top font-semibold'>Narasumber</td>
                        <td className='w-2 align-top'>:</td>
                        <td><EditableField placeholder="Isi Narasumber" /></td>
                    </tr>
                    <tr><td colSpan={4} className="h-2"></td></tr>

                    <tr>
                        <td className="align-top font-semibold">V.</td>
                        <td colSpan={3} className='font-semibold'>HASIL KEGIATAN & TINDAK LANJUT</td>
                    </tr>
                     <tr>
                        <td></td>
                        <td colSpan={3} className="w-full">
                            <div 
                                className="report-content-preview"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(reportContent) }}
                            />
                        </td>
                    </tr>
                </tbody>
            </table>
            
            <p className="mt-8">Demikian untuk menjadikan periksa dan terima kasih.</p>

            <div className="flex justify-end mt-8">
                <div className="text-center w-64">
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
  const [reportContent, setReportContent] = useState('');

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

    const printArea = document.getElementById('print-area');
    if (!printArea) {
        toast({ variant: 'destructive', title: 'Gagal Mencetak', description: 'Area laporan tidak ditemukan.'});
        return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
        toast({ variant: 'destructive', title: 'Gagal Mencetak', description: 'Tidak dapat membuat dokumen cetak.'});
        document.body.removeChild(iframe);
        return;
    }
    
    doc.open();
    doc.write('<html><head>' + document.head.innerHTML + '</head><body>' + printArea.outerHTML + '</body></html>');
    doc.close();
    
    const tryPrint = () => {
      try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
      } catch (e: any) {
          toast({ variant: 'destructive', title: 'Gagal Mencetak', description: `Terjadi kesalahan: ${e.message}`});
      } finally {
            setTimeout(() => {
                if (document.body.contains(iframe)) {
                  document.body.removeChild(iframe);
                }
            }, 1000);
      }
    };
    
    // Wait for resources to load
    let loaded = false;
    const loadHandler = () => {
        if (!loaded) {
            loaded = true;
            tryPrint();
        }
    };
    iframe.onload = loadHandler;
    setTimeout(loadHandler, 500); // Fallback
  };
  
  const handleReset = () => {
    setSelectedDate(undefined);
    setSelectedEvent(null);
    setReportContent('');
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
           {selectedEvent && (
                <CardContent>
                    <Label className="font-semibold">Hasil Kegiatan & Tindak Lanjut</Label>
                    <RichTextEditor
                        onChange={setReportContent}
                        placeholder="Ketik hasil laporan di sini..."
                    />
                </CardContent>
            )}
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

        <div className="mt-4" id="report-preview-container">
            <ReportPreview event={selectedEvent} reportContent={reportContent} />
        </div>

        <style jsx global>{`
            @import "@blocknote/core/style.css";
            @page {
                size: A4;
                margin: 2.1cm;
            }
            @media print {
                body, html {
                    visibility: hidden;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                #print-area, #print-area * {
                    visibility: visible;
                }
                #print-area {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: auto;
                    margin: 0;
                    padding: 0;
                    box-shadow: none;
                    border: none;
                }
                main.p-4, main.p-6 {
                    padding: 0 !important;
                    margin: 0 !important;
                }
                span[contentEditable="true"] {
                   background-color: transparent !important;
                   border: none !important;
                   box-shadow: none !important;
                   -webkit-print-color-adjust: exact !important;
                }
                 span[contentEditable="true"]:empty::before {
                    content: attr(data-placeholder);
                    color: #999;
                    font-style: italic;
                    visibility: visible;
                }
                 #print-area * {
                    font-family: Arial, sans-serif !important;
                    font-size: 12px !important;
                    line-height: 1.2 !important;
                }
                #print-area .report-content-preview p,
                #print-area .report-content-preview div,
                #print-area .report-content-preview li {
                    text-align: justify;
                }
                 #print-area .report-content-preview ul, 
                #print-area .report-content-preview ol {
                  display: block;
                  list-style-position: inside;
                  padding-left: 20px;
                }
                #print-area .report-content-preview li {
                  display: list-item;
                }
            }
             span[contentEditable="true"]:empty::before {
                content: attr(data-placeholder);
                color: #666;
                font-style: italic;
                display: block;
            }
        `}</style>
    </div>
  );
}
