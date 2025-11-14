
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
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
import { parseISO, format, isSameDay, isSameMonth } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import useSWR from 'swr';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import DOMPurify from 'isomorphic-dompurify';
import { RichTextEditor } from '@/components/editor';
import Image from 'next/image';


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

const getGoogleDriveThumbnailUrl = (fileIdOrUrl: string): string => {
    if (!fileIdOrUrl) return '';
    let fileId = fileIdOrUrl;
    // Extract fileId from URL if it's a URL
    const match = fileIdOrUrl.match(/(?:\/d\/|id=)([a-zA-Z0-9_-]{25,})/);
    if (match && match[1]) {
        fileId = match[1];
    }
    return `/api/drive/cache-image/${fileId}`;
};

const ReportHeader = ({ letterheadData, logoUrl }: { letterheadData: any, logoUrl: string }) => (
    <div className="mb-4">
        <div className="flex items-start gap-4 pb-2">
            <img src={logoUrl} alt="Logo Instansi" width={80} height={80} className="print:w-20 print:h-20" />
            <div className="text-center flex-grow" style={{ lineHeight: 1.1 }}>
                <p className="font-semibold" style={{ fontSize: '14pt' }}>{letterheadData.instansi.toUpperCase()}</p>
                <p className="font-bold" style={{ fontSize: '22pt' }}>{letterheadData.skpd.toUpperCase()}</p>
                <div style={{ fontSize: '10pt' }}>
                    <p>{letterheadData.alamat}</p>
                    <p>
                        <span>Telepon: {letterheadData.telepon}</span>
                        <span className="mx-2">,</span>
                        <span>Faksimile: {letterheadData.fax}</span>
                    </p>
                    <p>
                        <span>Laman: {letterheadData.website}</span>
                        <span className="mx-2">,</span>
                        <span>Pos-el: {letterheadData.email}</span>
                    </p>
                </div>
            </div>
        </div>
        <div className="border-t-[3px] border-black"></div>
        <div className="border-t-[1px] border-black mt-1"></div>
    </div>
);


const ReportEditorTemplate = ({ event, reportContent, onContentChange, letterheadData, logoUrl }: { event: CalendarEvent, reportContent: string, onContentChange: (content: string) => void, letterheadData: any, logoUrl: string }) => {
    const defaultLokasiTanggal = `Gandrungmangu, ${format(parseISO(event.start), 'dd MMMM yyyy', { locale: localeId })}`;
    const photoAttachments = useMemo(() => event.attachments?.filter(att => att.mimeType?.startsWith('image/')) || [], [event.attachments]);
    
    return (
        <div id="print-area" className="bg-white text-black p-8" style={{ lineHeight: 1.2 }}>
            {/* Halaman 1: Laporan */}
            <div className="report-page">
                <ReportHeader letterheadData={letterheadData} logoUrl={logoUrl} />
                <h3 className="text-center font-bold text-lg my-6">LAPORAN KEGIATAN/PERJALANAN DINAS</h3>
                
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
                
                <div className="flex justify-end mt-8" id="signature-block">
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

            {/* Halaman 2: Lampiran Foto (hanya saat cetak) */}
            {photoAttachments.length > 0 && (
                <div className="attachment-page hidden print:block p-8 md:p-12">
                     <h3 className="text-center font-bold text-lg mb-4">LAMPIRAN FOTO KEGIATAN</h3>
                     <h4 className="text-center font-semibold text-base mb-8">{event.summary}</h4>
                     <div className="grid grid-cols-2 gap-4">
                        {photoAttachments.map((att, index) => (
                           <div key={index} className="flex flex-col items-center">
                             <img 
                                src={getGoogleDriveThumbnailUrl(att.fileId!)} 
                                alt={att.title || `Lampiran ${index + 1}`}
                                className="w-full h-auto object-cover border"
                             />
                             <p className="text-sm mt-2 text-center">{att.title}</p>
                           </div>
                        ))}
                     </div>
                </div>
            )}
        </div>
    );
};


export default function ReportPage() {
  const { toast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [reportContent, setReportContent] = useState('');

  const { data: eventsData, error: eventsError, isLoading: isLoadingEvents } = useSWR('/api/events', fetcher);
    
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
  
  const handlePrint = () => {
    const reportContentPreview = document.querySelector('.report-content-preview');
    if (reportContentPreview) {
        reportContentPreview.innerHTML = reportContent;
    }
    window.print();
  };
  
  const handleReset = () => {
    setSelectedDate(undefined);
    setSelectedEvent(null);
    setReportContent('');
    toast({ description: 'Pilihan telah dikosongkan.' });
  }

  const photoAttachments = useMemo(() => selectedEvent?.attachments?.filter(att => att.mimeType?.startsWith('image/')) || [], [selectedEvent]);

  // Get letterhead data from environment variables
  const letterheadData = {
    instansi: process.env.NEXT_PUBLIC_KOP_INSTANSI || 'PEMERINTAH KABUPATEN',
    skpd: process.env.NEXT_PUBLIC_KOP_SKPD || 'NAMA SKPD',
    alamat: process.env.NEXT_PUBLIC_KOP_ALAMAT || 'Jalan Alamat No. 123',
    telepon: process.env.NEXT_PUBLIC_KOP_TELP || '(000) 123456',
    fax: process.env.NEXT_PUBLIC_KOP_FAX || '(000) 654321',
    website: process.env.NEXT_PUBLIC_KOP_WEBSITE || 'website.go.id',
    email: process.env.NEXT_PUBLIC_KOP_EMAIL || 'email@website.go.id'
  };

  const logoUrl = process.env.NEXT_PUBLIC_KOP_LOGO || "https://i.ibb.co/5xcxSzd/logo-cilacap.png";


  useEffect(() => {
    // Reset report content when a new event is selected
    setReportContent('');
  }, [selectedEvent]);


  return (
    <div className="flex flex-col gap-6">
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
            {/* Mini Photo Gallery */}
            {photoAttachments.length > 0 && (
                <div className="mt-6">
                    <Label className="font-semibold">Pratinjau Lampiran Foto</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-2">
                        {photoAttachments.map((att, index) => (
                             <img
                                key={index}
                                src={getGoogleDriveThumbnailUrl(att.fileId!)}
                                alt={att.title || `Lampiran ${index + 1}`}
                                className="w-full h-24 object-cover rounded-md border"
                            />
                        ))}
                    </div>
                </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-4">
            {selectedEvent ? (
                <ReportEditorTemplate 
                  event={selectedEvent} 
                  reportContent={reportContent} 
                  onContentChange={setReportContent}
                  letterheadData={letterheadData}
                  logoUrl={logoUrl}
                />
            ) : (
                <Card className="text-center text-muted-foreground py-16 print:hidden">
                    <p>Pilih tanggal dan kegiatan di atas untuk memulai membuat laporan.</p>
                </Card>
            )}
        </div>

        <style jsx global>{`
            @import "@blocknote/core/style.css";

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
