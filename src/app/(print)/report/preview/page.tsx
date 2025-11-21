
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { parseISO, format, isSameDay, isSameMonth } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { ReportHeader } from '@/components/report/report-header';


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

type PelaksanaData = {
    id: string;
    nama: string;
    nip: string;
    pangkat: string;
    jabatan: string;
};

type ReportData = {
    event: EventData;
    dasar: string;
    pelaksana: PelaksanaData[];
    narasumber: string;
    peserta: string;
    reportContent: string;
    photoAttachments: any[];
};



const formatReportDateRange = (startStr: string, endStr?: string): string => {
    try {
        const startDate = parseISO(startStr);
        const endDate = endStr ? parseISO(endStr) : startDate;

        if (isSameDay(startDate, endDate)) {
            return format(startDate, 'EEEE, dd MMMM yyyy', { locale: localeId });
        }
        
        const startDayName = format(startDate, 'EEEE', { locale: localeId });
        const endDayName = format(endDate, 'EEEE', { locale: localeId });
        const daysRange = `${startDayName} s.d. ${endDayName}`;

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
        return "Tanggal tidak valid";
    }
};

const getGoogleDriveThumbnailUrl = (fileIdOrUrl: string): string => {
    if (!fileIdOrUrl) return '';
    let fileId = fileIdOrUrl;
    const match = fileIdOrUrl.match(/(?:\/d\/|id=)([a-zA-Z0-9_-]{25,})/);
    if (match && match[1]) {
        fileId = match[1];
    }
    return `/api/drive/cache-image/${fileId}`;
};


const HtmlContent = ({ html, asList = false }: { html: string, asList?: boolean }) => {
    if (!html || html.trim() === '' || html.trim() === '<p><br></p>') {
      return asList ? <ol><li>-</li></ol> : <p>-</p>;
    }
    if (html.trim() === '-') {
      return asList ? <ol><li>-</li></ol> : <p>-</p>;
    }

    if (asList && !html.includes('<ol>') && !html.includes('<ul>')) {
        const content = html.replace(/<p>/g, '<li>').replace(/<\/p>/g, '</li>');
        return <ol className="list-decimal list-inside" dangerouslySetInnerHTML={{ __html: content }} />;
    }

    return <div dangerouslySetInnerHTML={{ __html: html }} />;
};

const PelaksanaList = ({ pelaksana }: { pelaksana: PelaksanaData[] }) => {
    if (!pelaksana || pelaksana.length === 0) {
        return <div>-</div>;
    }

    if (pelaksana.length === 1) {
        const p = pelaksana[0];
        return (
            <div key={p.id}>
                <table className="w-full border-separate" style={{ borderSpacing: 0 }}>
                    <tbody>
                        <tr><td className="w-40 align-top">Nama</td><td className="w-2 px-1 align-top">:</td><td>{p.nama}</td></tr>
                        <tr><td className="w-40 align-top">NIP</td><td className="w-2 px-1 align-top">:</td><td>{p.nip}</td></tr>
                        <tr><td className="w-40 align-top">Jabatan</td><td className="w-2 px-1 align-top">:</td><td>{p.jabatan}</td></tr>
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {pelaksana.map((p, index) => (
                <div key={p.id}>
                    <div className="flex">
                        <span className="w-6 align-top">{index + 1}.</span>
                        <div className="flex-1">
                            <table className="w-full border-separate" style={{ borderSpacing: 0 }}>
                                <tbody>
                                    <tr><td className="w-36 align-top">Nama</td><td className="w-2 px-1 align-top">:</td><td>{p.nama}</td></tr>
                                    <tr><td className="w-36 align-top">NIP</td><td className="w-2 px-1 align-top">:</td><td>{p.nip}</td></tr>
                                    <tr><td className="w-36 align-top">Jabatan</td><td className="w-2 px-1 align-top">:</td><td>{p.jabatan}</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const ReportSection = ({ number, title, children }: { number: string, title: string, children: React.ReactNode }) => (
    <div className="flex mb-2">
        <div className="w-12 text-left">{number}</div>
        <div className="flex-1">
            <div className="font-semibold uppercase">{title}</div>
            <div className="mt-1">{children}</div>
        </div>
    </div>
);


function ReportPreviewComponent() {
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Add a short delay to mitigate race conditions with localStorage
        const timer = setTimeout(() => {
            try {
                const dataString = localStorage.getItem('reportPrintData');
                if (dataString) {
                    const parsedData: ReportData = JSON.parse(dataString);

                    // Clean up localStorage immediately after reading
                    localStorage.removeItem('reportPrintData');

                    setReportData(parsedData);
                } else {
                    throw new Error("Data laporan tidak ditemukan di penyimpanan lokal.");
                }
            } catch (e: any) {
                console.error("Failed to parse report data from localStorage", e);
                setError(e.message || "Gagal mem-parsing data laporan dari penyimpanan lokal.");
            } finally {
                setIsLoading(false);
            }
        }, 100); // 100ms delay

        return () => clearTimeout(timer);
    }, []);


    useEffect(() => {
        if (reportData && !isLoading && !error) {
             const timeoutId = setTimeout(() => {
                window.print();
            }, 500); // Small delay to ensure rendering is complete
            return () => clearTimeout(timeoutId);
        }
    }, [reportData, isLoading, error]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen text-muted-foreground bg-white">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mempersiapkan pratinjau...
            </div>
        );
    }
    
    if (error || !reportData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-muted-foreground bg-white gap-4 p-4">
                 <h2 className="text-xl font-bold">Data Laporan Tidak Ditemukan</h2>
                 <p className="text-center">{error}</p>
                 <Button onClick={() => window.close()}>Tutup Tab</Button>
            </div>
        );
    }
    
    const { event, dasar, pelaksana, narasumber, peserta, reportContent, photoAttachments } = reportData;
    const isManualEvent = 'waktu' in event && !!event.waktu;
    const isPesertaFilled = peserta && peserta.trim() !== '' && peserta.trim() !== '<p><br></p>' && peserta.trim() !== '-';

    
    const lokasiTanggal = `${process.env.NEXT_PUBLIC_KOP_KECAMATAN || 'Gandrungmangu'}, ${format(parseISO(event.start), 'dd MMMM yyyy', { locale: localeId })}`;


    return (
        <div id="print-area" className="bg-white text-black p-8 max-w-4xl mx-auto" style={{ lineHeight: 1.1 }}>
            <div className='-mt-8'>
                <ReportHeader />
            </div>
            <h3 className="text-center font-bold text-lg my-4 uppercase underline">LAPORAN KEGIATAN</h3>
            
            <div className="space-y-4 text-justify">
                <ReportSection number="I." title="Dasar">
                   <p>{dasar}</p>
                </ReportSection>

                <ReportSection number="II." title="Maksud dan Tujuan">
                    <p>Menghadiri kegiatan {event.summary} dalam rangka meningkatkan koordinasi dan pelaksanaan tugas.</p>
                </ReportSection>
                
                <ReportSection number="III." title="Kegiatan yang dilaksanakan">
                     <table className="w-full">
                        <tbody>
                            <tr><td className="w-32 align-top">Nama Kegiatan</td><td className="w-2 align-top">:</td><td>{event.summary}</td></tr>
                            <tr><td className='w-32 align-top'>Hari/Tanggal</td><td className='w-2 align-top'>:</td><td>{formatReportDateRange(event.start, event.end)}</td></tr>
                            <tr><td className='w-32 align-top'>Waktu</td><td className='w-2 align-top'>:</td><td>{isManualEvent ? event.waktu : `Pukul ${format(parseISO(event.start), 'HH:mm', { locale: localeId })} WIB s.d. Selesai`}</td></tr>
                            <tr><td className='w-32 align-top'>Tempat</td><td className='w-2 align-top'>:</td><td>{event.location}</td></tr>
                            {isPesertaFilled && (
                                <tr>
                                    <td className='w-32 align-top'>Peserta</td>
                                    <td className='w-2 align-top'>:</td>
                                    <td><HtmlContent html={peserta} asList={true} /></td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </ReportSection>

                <ReportSection number="IV." title="Pelaksana Tugas">
                    <PelaksanaList pelaksana={pelaksana} />
                </ReportSection>

                <ReportSection number="V." title="Pihak Terkait / Narasumber">
                    <HtmlContent html={narasumber} asList={true} />
                </ReportSection>

                <ReportSection number="VI." title="Hasil Kegiatan dan Tindak Lanjut">
                    <HtmlContent html={reportContent} />
                </ReportSection>
                
                <ReportSection number="VII." title="Penutup">
                    <p>Demikian laporan ini dibuat untuk menjadikan periksa dan sebagai bahan masukan untuk pimpinan dalam mengambil kebijakan lebih lanjut.</p>
                </ReportSection>
            </div>
            
             <div className="flex justify-end mt-12">
                <div className="w-96 text-left">
                    <p>{lokasiTanggal}</p>
                    <p>Yang melaksanakan tugas,</p>
                    <div className="h-20"></div>
                    {pelaksana.length === 1 ? (
                        <div>
                            <div className="font-semibold underline">{pelaksana[0].nama}</div>
                            <div>{pelaksana[0].jabatan}</div>
                        </div>
                    ) : pelaksana.length > 1 ? (
                         <>
                            <div className="h-20"></div>
                            {pelaksana.map((item, index) => (
                                <div key={item.id}>
                                    <div className="flex">
                                        <span className="w-6 align-top">{index + 1}.</span>
                                        <div className="flex-1">
                                            <div className="font-semibold underline">{item.nama}</div>
                                            <div>{item.jabatan}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                         </>
                    ) : (
                        <div className="h-28">-</div>
                    )}
                </div>
            </div>

            {photoAttachments.length > 0 && (
                 <div className="page-break">
                    <div className="p-8 md:p-12">
                        <h3 className="text-center font-bold text-lg mb-4 uppercase">Lampiran Foto Kegiatan</h3>
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
                </div>
            )}
        </div>
    );
}

export default function ReportPreviewPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen text-muted-foreground bg-white">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mempersiapkan pratinjau...
            </div>
        }>
            <ReportPreviewComponent />
        </Suspense>
    )
}
