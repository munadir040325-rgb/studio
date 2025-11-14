
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
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
    pelaksana: string;
    narasumber: string;
    peserta: string;
    reportContent: string;
    photoAttachments: any[];
};

type PelaksanaData = {
    nama: string;
    jabatan: string;
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

const parsePelaksana = (html: string): PelaksanaData[] => {
    if (typeof document === 'undefined') return [];

    // Hapus tag p kosong dan <br> di awal/akhir
    const cleanedHtml = html.trim().replace(/^<p><br><\/p>$/, '').replace(/^(<br\s*\/?>)+|(<br\s*\/?>)+$/g, '');
    if (!cleanedHtml) return [];

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cleanedHtml;

    const results: PelaksanaData[] = [];
    const listItems = Array.from(tempDiv.querySelectorAll('li'));

    if (listItems.length > 0) {
        // Handle list items (ul, ol)
        for (const li of listItems) {
            const lines = li.innerHTML.split('<br>')
                .map(line => line.replace(/<[^>]*>/g, '').trim())
                .filter(line => line);
            if (lines.length > 0) {
                results.push({
                    nama: lines[0] || '',
                    jabatan: lines[1] || '',
                });
            }
        }
    } else {
        // Handle plain text with <br> or multiple <p>
        const blocks = Array.from(tempDiv.children).length > 0 ? Array.from(tempDiv.children) : [tempDiv];
        for (const block of blocks) {
            const lines = block.innerHTML.split('<br>')
                .map(line => line.replace(/<[^>]*>/g, '').trim())
                .filter(line => line);
             if (lines.length > 0) {
                results.push({
                    nama: lines[0] || '',
                    jabatan: lines[1] || '',
                });
            }
        }
    }

    return results;
};

const HtmlContent = ({ html, asList = false }: { html: string, asList?: boolean }) => {
    const cleanedHtml = html.replace(/<p>&nbsp;<\/p>/g, '').replace(/<p><br><\/p>/g, '').trim();
    if (!cleanedHtml || cleanedHtml === '<br>') {
        return null;
    }

    if (asList) {
        // Cek jika sudah ada <ul> atau <ol>
        if (cleanedHtml.startsWith('<ul>') || cleanedHtml.startsWith('<ol>')) {
             return <div dangerouslySetInnerHTML={{ __html: cleanedHtml }} />;
        }
        // Jika tidak, bungkus dengan <ol>
        return <ol className="list-decimal list-inside" dangerouslySetInnerHTML={{ __html: cleanedHtml.replace(/<p>/g, '<li>').replace(/<\/p>/g, '</li>') }} />;
    }

    return <div dangerouslySetInnerHTML={{ __html: cleanedHtml }} />;
};


export default function ReportPreviewPage() {
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        try {
            const data = localStorage.getItem('reportDataForPrint');
            if (data) {
                const parsedData = JSON.parse(data);
                setReportData(parsedData);
            } else {
                setError("Data laporan tidak ditemukan. Silakan kembali dan coba lagi.");
            }
        } catch (e) {
            setError("Gagal mem-parsing data laporan.");
            console.error("Failed to parse report data from localStorage", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (reportData && !isLoading) {
             const timeoutId = setTimeout(() => {
                window.print();
            }, 500); 
            return () => clearTimeout(timeoutId);
        }
    }, [reportData, isLoading]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen text-muted-foreground bg-gray-100">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mempersiapkan pratinjau...
            </div>
        );
    }
    
    if (error || !reportData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-muted-foreground bg-gray-100 gap-4 p-4">
                 <h2 className="text-xl font-bold">Data Laporan Tidak Ditemukan</h2>
                 <p className="text-center">{error}</p>
                 <Button onClick={() => window.close()}>Tutup Tab</Button>
            </div>
        );
    }
    
    const { event, dasar, pelaksana, narasumber, peserta, reportContent, photoAttachments } = reportData;
    const isManualEvent = 'waktu' in event && !!event.waktu;
    
    const parsedPelaksana = parsePelaksana(pelaksana);

    const letterheadData = {
        instansi: process.env.NEXT_PUBLIC_KOP_INSTANSI || 'PEMERINTAH KABUPATEN CILACAP',
        skpd: process.env.NEXT_PUBLIC_KOP_SKPD || 'KECAMATAN GANDRUNGMANGU',
        alamat: process.env.NEXT_PUBLIC_KOP_ALAMAT || 'Jalan Pertiwi Nomor 1 Gandrungmangu, Gandrungmangu, Cilacap, Jawa Tengah 53254',
        telepon: process.env.NEXT_PUBLIC_KOP_TELP || '(0280)6260733',
        fax: process.env.NEXT_PUBLIC_KOP_FAX || '(0280)6260733',
        website: process.env.NEXT_PUBLIC_KOP_WEBSITE || 'www.gandrungmangu.cilacapkab.go.id',
        email: process.env.NEXT_PUBLIC_KOP_EMAIL || 'kecamatan.gandrungmangu2020@gmail.com'
    };
    const logoUrl = process.env.NEXT_PUBLIC_KOP_LOGO || "https://i.ibb.co/5xcxSzd/logo-cilacap.png";
    
    const lokasiTanggal = `${process.env.NEXT_PUBLIC_KOP_KECAMATAN || 'Gandrungmangu'}, ${format(parseISO(event.start), 'dd MMMM yyyy', { locale: localeId })}`;


    return (
        <div id="print-area" className="bg-white text-black p-8 max-w-4xl mx-auto" style={{ lineHeight: 1.2 }}>
            <div>
                <ReportHeader letterheadData={letterheadData} logoUrl={logoUrl} />
                <h3 className="text-center font-bold text-lg my-6 uppercase">Laporan Kegiatan/Perjalanan Dinas</h3>
                
                <table className="w-full mt-4 border-separate" style={{borderSpacing: '0 8px'}}>
                    <tbody>
                        <tr>
                            <td colSpan={4} className='font-semibold'>Dasar Kegiatan</td>
                        </tr>
                        <tr>
                            <td colSpan={4} className='pb-2'><HtmlContent html={dasar} asList={true} /></td>
                        </tr>

                        <tr>
                            <td colSpan={4}>
                                <table className="w-full">
                                    <tbody>
                                        <tr><td className="w-32 align-top">Acara</td><td className="w-4 align-top">:</td><td>{event.summary}</td></tr>
                                        <tr><td className='w-32 align-top'>Hari/Tanggal</td><td className='w-4 align-top'>:</td><td>{formatReportDateRange(event.start, event.end)}</td></tr>
                                        <tr><td className='w-32 align-top'>Waktu</td><td className='w-4 align-top'>:</td><td>{isManualEvent ? event.waktu : `Pukul ${format(parseISO(event.start), 'HH:mm', { locale: localeId })} WIB s.d. Selesai`}</td></tr>
                                        <tr><td className='w-32 align-top'>Tempat</td><td className='w-4 align-top'>:</td><td>{event.location}</td></tr>
                                        <tr><td className='w-32 align-top'>Pelaksana</td><td className='w-4 align-top'>:</td><td><HtmlContent html={pelaksana} asList={true} /></td></tr>
                                        <tr><td className="w-32 align-top">Narasumber/Verifikator</td><td className='w-4 align-top'>:</td><td><HtmlContent html={narasumber} asList={true} /></td></tr>
                                        <tr><td className='w-32 align-top'>Pejabat/Peserta</td><td className='w-4 align-top'>:</td><td><HtmlContent html={peserta} asList={true} /></td></tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                        
                        <tr><td colSpan={4} className='font-semibold pt-2'>Hasil dan Tindak Lanjut</td></tr>
                        <tr><td colSpan={4} className="w-full"><HtmlContent html={reportContent} /></td></tr>
                        <tr className='text-justify'><td colSpan={4} className="pt-4">Demikian untuk menjadikan periksa dan terima kasih.</td></tr>
                    </tbody>
                </table>
                
                <div className="flex justify-between mt-8">
                    <div></div>
                    <div className="text-center w-80">
                        <p>{lokasiTanggal}</p>
                        <p>Yang melaksanakan kegiatan,</p>
                        <br />
                        
                        {parsedPelaksana.length > 0 && (
                            <table className="w-full text-left" style={{ borderSpacing: '0 2rem' }}>
                                <tbody>
                                    {parsedPelaksana.map((item, index) => (
                                        <tr key={index}>
                                            <td className="align-top pr-2">{index + 1}.</td>
                                            <td>
                                                <div className="flex flex-col">
                                                    <span className="h-12">(.....................................)</span>
                                                    <span className="font-semibold underline">{item.nama}</span>
                                                    <span>{item.jabatan}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
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

    

    
