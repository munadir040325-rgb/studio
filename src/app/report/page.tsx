
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

const EditableField = ({ placeholder, className, defaultValue }: { placeholder: string, className?: string, defaultValue?: string }) => (
    <span
        contentEditable
        suppressContentEditableWarning
        className={cn("p-1 -m-1 rounded-md min-w-[10rem] inline-block bg-muted/50 hover:bg-muted focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring print:bg-transparent", className)}
        data-placeholder={placeholder}
    >
      {defaultValue}
    </span>
);


const ReportEditorTemplate = ({ event, reportContent, onContentChange }: { event: CalendarEvent, reportContent: string, onContentChange: (content: string) => void }) => {
    return (
        <Card id="print-area" className="bg-white text-black p-8 md:p-12 shadow-lg rounded-sm print:shadow-none print:p-4 print:border-none">
            <h3 className="text-center font-bold text-lg">NOTA DINAS</h3>
            <br />
            <hr className="border-black my-4" />
             <div className="flex justify-center">
                <table>
                    <tbody>
                        <tr>
                            <td className="w-28">YTH.</td>
                            <td className="w-2">:</td>
                            <td><EditableField placeholder="Isi tujuan surat" /></td>
                        </tr>
                        <tr>
                            <td>DARI</td>
                            <td>:</td>
                            <td><EditableField placeholder="Isi pengirim" /></td>
                        </tr>
                        <tr>
                            <td>TEMBUSAN</td>
                            <td>:</td>
                            <td><EditableField placeholder="Isi tembusan" /></td>
                        </tr>
                        <tr>
                            <td className='align-top'>HAL</td>
                            <td className='align-top'>:</td>
                            <td><EditableField placeholder="Isi perihal" /></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <hr className="border-black my-4" />
            
            <table className="w-full mt-4 border-separate" style={{borderSpacing: '0 8px'}}>
                <tbody>
                    {/* I. Dasar Kegiatan */}
                    <tr>
                        <td className="w-[1.8rem] align-top font-semibold">I.</td>
                        <td colSpan={3} className='font-semibold'>Dasar Kegiatan</td>
                    </tr>
                    <tr>
                        <td></td>
                        <td colSpan={3} className='pb-2'>
                           <EditableField placeholder="Isi dasar kegiatan (contoh: Perintah Lisan Camat)" className="w-full" />
                        </td>
                    </tr>

                    {/* II. Kegiatan */}
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
                                        <td className="w-28 align-top">Acara</td>
                                        <td className="w-2 align-top">:</td>
                                        <td>{event.summary}</td>
                                    </tr>
                                    <tr>
                                        <td className='align-top'>Hari/Tanggal</td>
                                        <td className='align-top'>:</td>
                                        <td>{format(parseISO(event.start), 'EEEE, dd MMMM yyyy', { locale: localeId })}</td>
                                    </tr>
                                    <tr>
                                        <td className='align-top'>Waktu</td>
                                        <td className='align-top'>:</td>
                                        <td>Pukul {format(parseISO(event.start), 'HH:mm', { locale: localeId })} WIB s.d. Selesai</td>
                                    </tr>
                                    <tr>
                                        <td className='align-top'>Tempat</td>
                                        <td className='align-top'>:</td>
                                        <td>{event.location || <EditableField placeholder="Tempat Kegiatan" />}</td>
                                    </tr>
                                    <tr>
                                        <td className='align-top'>Pimpinan Rapat</td>
                                        <td className='align-top'>:</td>
                                        <td><EditableField placeholder="Isi Pimpinan Rapat" /></td>
                                    </tr>
                                    <tr>
                                        <td className='align-top'>Narasumber</td>
                                        <td className='align-top'>:</td>
                                        <td><EditableField placeholder="Isi Narasumber" /></td>
                                    </tr>
                                    <tr>
                                        <td className='align-top'>Peserta</td>
                                        <td className='align-top'>:</td>
                                        <td><EditableField placeholder="Sebutkan peserta/perwakilan yang hadir" /></td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>
                    
                    {/* III. Hasil dan Tindak Lanjut */}
                     <tr>
                        <td className="w-[1.8rem] align-top font-semibold pt-2">III.</td>
                        <td colSpan={3} className='font-semibold pt-2'>Hasil dan Tindak Lanjut</td>
                    </tr>
                     <tr>
                        <td></td>
                        <td colSpan={3} className="w-full pt-2">
                             <div className='print:hidden'>
                                <RichTextEditor
                                    onChange={onContentChange}
                                    placeholder="Ketik hasil laporan di sini..."
                                />
                             </div>
                             <div 
                                className="report-content-preview hidden print:block"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(reportContent) }}
                            />
                        </td>
                    </tr>
                </tbody>
            </table>
            
            <p className="mt-8">Demikian untuk menjadikan periksa dan terima kasih.</p>

            <div className="flex justify-end mt-8">
                <div className="text-center w-64">
                    <EditableField placeholder="Tempat, Tanggal Melaporkan" />
                    <p>Yang melaksanakan kegiatan,</p>
                    <br /><br /><br />
                    <p className="font-semibold underline">
                        <EditableField placeholder="Nama Pelapor" />
                    </p>
                </div>
            </div>
        </Card>
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
    window.print();
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
      >
        <div className='flex items-center gap-2'>
            <Button variant="outline" onClick={handleReset}>
                <Trash className="mr-2 h-4 w-4"/>
                Reset
            </Button>
            <Button onClick={handlePrint} disabled={!selectedEvent}>
                <Printer className="mr-2 h-4 w-4" />
                Cetak Laporan
            </Button>
        </div>
      </PageHeader>
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
        </Card>

        <div className="mt-4" id="report-preview-container">
            {selectedEvent ? (
                <ReportEditorTemplate event={selectedEvent} reportContent={reportContent} onContentChange={setReportContent} />
            ) : (
                <Card className="text-center text-muted-foreground py-16">
                    <p>Pilih tanggal dan kegiatan di atas untuk memulai membuat laporan.</p>
                </Card>
            )}
        </div>

        <style jsx global>{`
            @import "@blocknote/core/style.css";
            @media print {
                body, html {
                    visibility: hidden;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: white;
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
                }
                main.p-4, main.p-6 {
                    padding: 0 !important;
                    margin: 0 !important;
                }
                span[contentEditable="true"] {
                   background-color: transparent !important;
                   border: none !important;
                   box-shadow: none !important;
                }
                 span[contentEditable="true"]:empty::before {
                    content: attr(data-placeholder);
                    color: #999;
                    font-style: italic;
                    visibility: visible;
                }
                .report-content-preview {
                    color: black !important;
                    display: block !important;
                }
            }
             span[contentEditable="true"]:empty::before {
                content: attr(data-placeholder);
                color: #666;
                font-style: italic;
                display: block;
            }
             span[contentEditable="true"][data-placeholder]:not(:focus):empty {
                content: attr(data-placeholder);
                color: #666;
                font-style: italic;
             }
        `}</style>
        <style jsx global>{`
          @page {
              size: A4;
              margin: 2.1cm;
          }
          @media print {
              body {
                  font-family: Arial, sans-serif !important;
                  font-size: 12px !important;
                  line-height: 1.5 !important;
              }
              .report-content-preview p,
              .report-content-preview div,
              .report-content-preview li {
                  text-align: justify;
              }
          }
        `}</style>
    </div>
  );
}
