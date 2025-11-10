
'use client';

import { useState, useMemo, useRef } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, Loader2, Printer, Trash, Copy, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { parseISO, format, isSameDay, isSameMonth } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import useSWR from 'swr';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import DOMPurify from 'isomorphic-dompurify';
import { RichTextEditor } from '@/components/editor';
import { Textarea } from '@/components/ui/textarea';


const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="mr-2 h-4 w-4">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.487 5.235 3.487 8.413.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.89-5.451 0-9.887 4.434-9.889 9.884-.002 2.024.63 3.891 1.742 5.634l-.999 3.648 3.742-1.001z"/>
    </svg>
);

type CalendarEvent = {
  id: string;
  summary: string;
  start: string;
  end?: string;
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

const EditableField = ({ id, placeholder, className, defaultValue }: { id: string, placeholder: string, className?: string, defaultValue?: string }) => (
    <span
        id={id}
        contentEditable
        suppressContentEditableWarning
        className={cn("p-1 -m-1 rounded-md min-w-[10rem] inline-block bg-muted/50 hover:bg-muted focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring print:bg-transparent", className)}
        data-placeholder={placeholder}
    >
      {defaultValue}
    </span>
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
            return `${daysRange}, ${daysRange}, ${startDayAndMonth} s.d. ${endDayAndMonth}`;
        }
    } catch (e) {
        console.error("Error formatting date range:", e);
        return "Tanggal tidak valid";
    }
};


const ReportEditorTemplate = ({ event, reportContent, onContentChange }: { event: CalendarEvent, reportContent: string, onContentChange: (content: string) => void }) => {
    const defaultLokasiTanggal = `Gandrungmangu, ${format(parseISO(event.start), 'dd MMMM yyyy', { locale: localeId })}`;
    
    return (
        <Card id="print-area" className="bg-white text-black p-8 md:p-12 shadow-lg rounded-sm print:shadow-none print:p-4 print:border-none">
            <h3 className="text-center font-bold text-lg border-b-2 border-black pb-2">NOTA DINAS</h3>
            <div className="flex justify-center mt-4">
                <table className="w-full" id="report-meta-table">
                    <tbody>
                        <tr id="row-kepada">
                            <td className="w-32 align-top">KEPADA YTH.</td>
                            <td className="w-2 align-top">:</td>
                            <td><EditableField id="report-kepada" placeholder="Isi tujuan surat" defaultValue="CAMAT GANDRUNGMANGU"/></td>
                        </tr>
                        <tr id="row-tembusan">
                            <td className="w-32 align-top">TEMBUSAN</td>
                            <td className="w-2 align-top">:</td>
                            <td className="align-top"><EditableField id="report-tembusan" placeholder="Isi tembusan" defaultValue="SEKRETARIS KECAMATAN GANDRUNGMANGU"/></td>
                        </tr>
                        <tr id="row-dari">
                            <td className="w-32 align-top">DARI</td>
                            <td className="w-2 align-top">:</td>
                            <td><EditableField id="report-dari" placeholder="Isi pengirim" /></td>
                        </tr>
                        <tr id="row-hal">
                            <td className='align-top w-32'>HAL</td>
                            <td className='align-top w-2'>:</td>
                            <td><EditableField id="report-hal" placeholder="Isi perihal" defaultValue="LAPORAN HASIL KEGIATAN" /></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <hr id="meta-divider" className="my-4 border-t-2 border-black" />

            <table className="w-full mt-4 border-separate" style={{borderSpacing: '0 8px'}}>
                <tbody>
                    <tr id="row-dasar-kegiatan">
                        <td className="w-[1.8rem] align-top font-semibold">I.</td>
                        <td colSpan={3} className='font-semibold'>Dasar Kegiatan</td>
                    </tr>
                    <tr id="row-dasar-kegiatan-content">
                        <td></td>
                        <td colSpan={3} className='pb-2'>
                           <EditableField id="report-dasar" placeholder="Isi dasar kegiatan (contoh: Perintah Lisan Camat)" className="w-full" />
                        </td>
                    </tr>

                    <tr>
                        <td className="w-[1  .8rem] align-top font-semibold">II.</td>
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
                                        <td>Pukul {format(parseISO(event.start), 'HH:mm', { locale: localeId })} WIB s.d. Selesai</td>
                                    </tr>
                                    <tr>
                                        <td className='w-32 align-top'>Tempat</td>
                                        <td className='w-4 align-top'>:</td>
                                        <td>{event.location || <EditableField id="report-tempat" placeholder="Tempat Kegiatan" />}</td>
                                    </tr>
                                    <tr id="row-pimpinan">
                                        <td className='w-32 align-top'><EditableField id="label-pimpinan" placeholder="Label" defaultValue="Pimpinan Rapat"/></td>
                                        <td className='w-4 align-top'>:</td>
                                        <td><EditableField id="report-pimpinan" placeholder="Isi Pimpinan Rapat" /></td>
                                    </tr>
                                    <tr id="row-narasumber">
                                        <td className="w-32 align-top"><EditableField id="label-narasumber" placeholder="Label" defaultValue="Narasumber"/></td>
                                        <td className='w-4 align-top'>:</td>
                                        <td><EditableField id="report-narasumber" placeholder="Isi Narasumber" /></td>
                                    </tr>
                                    <tr id="row-peserta">
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
        </Card>
    );
};


export default function ReportPage() {
  const { toast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [reportContent, setReportContent] = useState('');
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState('');

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

  const handleCopyToWhatsApp = () => {
    if (!selectedEvent) return;

    // Helper to get text from contentEditable fields
    const getEditableText = (id: string) => {
        const element = document.getElementById(id);
        return element?.innerText?.trim() || '';
    };

    // Helper to convert HTML from Rich Text Editor to plain text
    const htmlToPlainText = (html: string) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        // Replace list items with a more WA-friendly format
        tempDiv.querySelectorAll('li').forEach(li => {
            li.innerHTML = `• ${li.innerHTML.replace(/<br>/g, '\n  ')}\n`;
        });
        // Handle paragraphs for better spacing
        tempDiv.querySelectorAll('p').forEach(p => {
             p.innerHTML = `${p.innerHTML}<br>`;
        });
        return tempDiv.innerText.trim() || '';
    };

    const kepada = getEditableText('report-kepada');
    const tembusan = getEditableText('report-tembusan');
    const peserta = getEditableText('report-peserta');
    const pelapor = getEditableText('report-pelapor');
    const hasilPlainText = htmlToPlainText(reportContent);

    const message = `*Laporan Kegiatan*
Kepada Yth: ${kepada || '(Kepada Yth.)'}
Tembusan: ${tembusan || '(Tembusan)'}

Mohon ijin melaporkan hasil kegiatan dari *${selectedEvent.summary}* sebagai berikut:

*I. Pelaksanaan*
  • *Hari, tanggal*: ${formatReportDateRange(selectedEvent.start, selectedEvent.end)}
  • *Waktu*: Pukul ${format(parseISO(selectedEvent.start), 'HH:mm', { locale: localeId })} WIB s.d. Selesai
  • *Tempat*: ${selectedEvent.location || getEditableText('report-tempat')}

*II. Peserta dan Pihak Terkait*:
${peserta || '(Tidak ada peserta spesifik)'}

*III. Hasil Kegiatan*:
${hasilPlainText || '(Belum ada hasil kegiatan yang diisi)'}

Demikian laporan ini disampaikan, terima kasih.

Hormat kami,
*${pelapor || '(Nama Pelapor)'}*
`;

    setWhatsAppMessage(message);
    setIsWhatsAppModalOpen(true);
  };


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
            <Button onClick={handleCopyToWhatsApp} variant="outline" disabled={!selectedEvent}>
                <WhatsAppIcon />
                Salin untuk WA
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

        <div className="mt-4 overflow-x-auto" id="report-preview-container">
            {selectedEvent ? (
                <ReportEditorTemplate event={selectedEvent} reportContent={reportContent} onContentChange={setReportContent} />
            ) : (
                <Card className="text-center text-muted-foreground py-16 print:hidden">
                    <p>Pilih tanggal dan kegiatan di atas untuk memulai membuat laporan.</p>
                </Card>
            )}
        </div>

        {/* WhatsApp Modal */}
        <Dialog open={isWhatsAppModalOpen} onOpenChange={setIsWhatsAppModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Format Laporan untuk WhatsApp</DialogTitle>
                    <DialogDescription>
                        Salin teks di bawah ini dan tempelkan di WhatsApp.
                    </DialogDescription>
                </DialogHeader>
                <Textarea
                    readOnly
                    value={whatsAppMessage}
                    className="h-72 text-sm bg-muted/50 whitespace-pre-wrap"
                />
                <DialogFooter>
                    <Button onClick={() => {
                        navigator.clipboard.writeText(whatsAppMessage);
                        toast({ title: "Teks disalin!", description: "Anda sekarang dapat menempelkan laporan di WhatsApp." });
                    }}>
                        <Copy className="mr-2 h-4 w-4" />
                        Salin Teks
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


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
                    color: black !important;
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
                    content: '';
                }
                .report-content-preview {
                    display: block !important;
                }
                
                #row-kepada:has(#report-kepada:empty),
                #row-tembusan:has(#report-tembusan:empty),
                #row-dari:has(#report-dari:empty),
                #row-hal:has(#report-hal:empty),
                #row-dasar-kegiatan:has(+ #row-dasar-kegiatan-content #report-dasar:empty),
                #row-dasar-kegiatan-content:has(#report-dasar:empty),
                #row-pimpinan:has(#report-pimpinan:empty),
                #row-narasumber:has(#report-narasumber:empty),
                #row-peserta:has(#report-peserta:empty) {
                    display: none;
                }
                
                #meta-divider:has(~ #report-meta-table #report-hal:empty) {
                   display: none;
                }
                
                #report-meta-table:has(#report-hal:empty) {
                    display: none;
                }
            }
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
        <style jsx global>{`
          @page {
              size: A4;
              margin: 2.1cm;
          }
          @media print {
              body {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
              }
              #print-area, #print-area * {
                  font-family: Arial, sans-serif !important;
                  font-size: 12pt !important;
                  line-height: 1.2 !important;
                  visibility: visible;
                  color: black !important;
              }
              .report-content-preview p,
              .report-content-preview div,
              .report-content-preview li {
                  text-align: justify;
              }
              span[contenteditable]:empty::before {
                content: '';
              }
          }
        `}</style>
    </div>
  );
}
