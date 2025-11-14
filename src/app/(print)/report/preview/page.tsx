
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseISO, format, isSameDay, isSameMonth } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

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

type ReportData = {
    event: EventData;
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

const ReportHeader = ({ letterheadData, logoUrl }: { letterheadData: any, logoUrl: string }) => (
    <div className="mb-4">
        <div className="flex items-start gap-4 pb-2">
            <img src={logoUrl} alt="Logo Instansi" width={80} height={80} className="print:w-20 print:h-20" />
            <div className="text-center flex-grow" style={{ lineHeight: 1.1 }}>
                <p className="font-semibold uppercase" style={{ fontSize: '14pt' }}>{letterheadData.instansi}</p>
                <p className="font-bold uppercase" style={{ fontSize: '22pt' }}>{letterheadData.skpd}</p>
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

export default function ReportPreviewPage() {
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const data = localStorage.getItem('reportDataForPrint');
        if (data) {
            try {
                setReportData(JSON.parse(data));
            } catch (e) {
                console.error("Failed to parse report data from localStorage", e);
            }
        }
        setIsReady(true);
    }, []);
    
    useEffect(() => {
        if (isReady && reportData) {
            const timer = setTimeout(() => {
                window.print();
            }, 500); 
            
            return () => clearTimeout(timer);
        }
    }, [isReady, reportData]);

    if (!isReady) {
        return (
            <div className="flex items-center justify-center min-h-screen text-muted-foreground bg-gray-100">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mempersiapkan pratinjau...
            </div>
        );
    }
    
    if (!reportData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-muted-foreground bg-gray-100 gap-4 p-4">
                 <h2 className="text-xl font-bold">Data Laporan Tidak Ditemukan</h2>
                 <p className="text-center">Silakan kembali ke halaman sebelumnya dan pastikan Anda telah mengisi detail laporan sebelum mencetak.</p>
                 <Button onClick={() => window.close()}>Tutup Tab</Button>
            </div>
        );
    }
    
    const { event, dasar, pimpinan, labelPimpinan, narasumber, labelNarasumber, peserta, labelPeserta, reportContent, lokasiTanggal, pelapor, photoAttachments } = reportData;
    const isManualEvent = 'waktu' in event && !!event.waktu;
    
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

    return (
        <main className="p-4 md:p-6">
            <div className="fixed top-4 right-4 print:hidden">
                <Button onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Cetak Ulang
                </Button>
            </div>
            <div id="print-area" className="bg-white text-black p-8 max-w-4xl mx-auto" style={{ lineHeight: 1.2 }}>
                {/* Halaman 1: Laporan */}
                <div className="report-page">
                    <ReportHeader letterheadData={letterheadData} logoUrl={logoUrl} />
                    <h3 className="text-center font-bold text-lg my-6 uppercase">Laporan Kegiatan/Perjalanan Dinas</h3>
                    
                    <table className="w-full mt-4 border-separate" style={{borderSpacing: '0 8px'}}>
                        <tbody>
                            <tr>
                                <td className="w-[1.8rem] align-top font-semibold">I.</td>
                                <td colSpan={3} className='font-semibold'>Dasar Kegiatan</td>
                            </tr>
                            <tr>
                                <td></td>
                                <td colSpan={3} className='pb-2' dangerouslySetInnerHTML={{ __html: dasar }}></td>
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
                                            <tr><td className="w-32 align-top">Acara</td><td className="w-4 align-top">:</td><td>{event.summary}</td></tr>
                                            <tr><td className='w-32 align-top'>Hari/Tanggal</td><td className='w-4 align-top'>:</td><td>{formatReportDateRange(event.start, event.end)}</td></tr>
                                            <tr><td className='w-32 align-top'>Waktu</td><td className='w-4 align-top'>:</td><td>{isManualEvent ? event.waktu : `Pukul ${format(parseISO(event.start), 'HH:mm', { locale: localeId })} WIB s.d. Selesai`}</td></tr>
                                            <tr><td className='w-32 align-top'>Tempat</td><td className='w-4 align-top'>:</td><td>{event.location}</td></tr>
                                            <tr><td className='w-32 align-top'>{labelPimpinan}</td><td className='w-4 align-top'>:</td><td dangerouslySetInnerHTML={{ __html: pimpinan }}></td></tr>
                                            <tr><td className="w-32 align-top">{labelNarasumber}</td><td className='w-4 align-top'>:</td><td dangerouslySetInnerHTML={{ __html: narasumber }}></td></tr>
                                            <tr><td className='w-32 align-top'>{labelPeserta}</td><td className='w-4 align-top'>:</td><td dangerouslySetInnerHTML={{ __html: peserta }}></td></tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                            
                            <tr><td className="w-[1.8rem] align-top font-semibold pt-2">III.</td><td colSpan={3} className='font-semibold pt-2'>Hasil dan Tindak Lanjut</td></tr>
                            <tr><td></td><td colSpan={3} className="w-full" dangerouslySetInnerHTML={{ __html: reportContent }}></td></tr>
                            <tr className='text-justify'><td></td><td colSpan={3} className="pt-4">Demikian untuk menjadikan periksa dan terima kasih.</td></tr>
                        </tbody>
                    </table>
                    
                    <div className="flex justify-end mt-8">
                        <div className="text-center w-72">
                            <p dangerouslySetInnerHTML={{ __html: lokasiTanggal }}></p>
                            <p>Yang melaksanakan kegiatan,</p>
                            <br /><br /><br />
                            <p className="font-semibold underline" dangerouslySetInnerHTML={{ __html: pelapor }}></p>
                        </div>
                    </div>
                </div>

                {/* Halaman 2: Lampiran Foto (jika ada) */}
                {photoAttachments.length > 0 && (
                    <div className="attachment-page p-8 md:p-12">
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
                )}
            </div>
        </main>
    );
}
