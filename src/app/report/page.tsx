
'use client';

import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarIcon, Loader2, Copy, Trash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { parseISO, format, isSameDay } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import useSWR from 'swr';
import { extractDisposisi } from '../calendar/page';


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

const generateReportTemplate = (event: CalendarEvent): string => {
    if (!event) return '';

    const disposisi = extractDisposisi(event.description);
    
    const template = `
HASIL MENGIKUTI KEGIATAN
===================================

I. DASAR:
Surat Undangan Nomor: [Nomor Surat] Tanggal [Tanggal Surat]

II. NAMA KEGIATAN:
${event.summary || ''}

III. WAKTU DAN TEMPAT:
- Hari/Tanggal: ${event.start ? format(parseISO(event.start), 'EEEE, dd MMMM yyyy', { locale: localeId }) : ''}
- Waktu: Pukul ${event.start ? format(parseISO(event.start), 'HH:mm', { locale: localeId }) : ''} WIB s.d. Selesai
- Tempat: ${event.location || ''}

IV. PENYELENGGARA:
[Nama Penyelenggara]

V. PESERTA:
[Sebutkan peserta/perwakilan yang hadir]

VI. MATERI/BAHASAN:
1. Materi Utama
    a. Sub-materi pertama
    b. Sub-materi kedua
2. Materi Berikutnya

VII. KESIMPULAN/TINDAK LANJUT:
${disposisi ? `- ${disposisi}\n- [Tindak Lanjut Lainnya]` : `- [Isi Kesimpulan atau Tindak Lanjut]`}

VIII. PENUTUP:
Demikian laporan ini dibuat sebagai bahan masukan dan informasi lebih lanjut.

Dibuat di: [Tempat]
Pada tanggal: ${format(new Date(), 'dd MMMM yyyy', { locale: localeId })}

Mengetahui,
[Jabatan Atasan]

[Nama Atasan]
[NIP Atasan]

Yang Melaporkan,
[Jabatan Pelapor]

[Nama Pelapor]
[NIP Pelapor]
`;
    return template.trim();
}


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

  useEffect(() => {
    if (selectedEvent) {
        setReportContent(generateReportTemplate(selectedEvent));
    } else {
        setReportContent('');
    }
  }, [selectedEvent]);
  
  const handleCopy = () => {
    if (!reportContent) {
        toast({ variant: 'destructive', title: 'Gagal Menyalin', description: 'Editor masih kosong.'});
        return;
    }
    navigator.clipboard.writeText(reportContent);
    toast({ title: 'Berhasil!', description: 'Isi laporan telah disalin ke clipboard.' });
  }
  
  const handleReset = () => {
    setSelectedDate(undefined);
    setSelectedEvent(null);
    setReportContent('');
    toast({ description: 'Editor telah dikosongkan.' });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Buat Laporan/Notulen"
        description="Pilih kegiatan untuk membuat draf laporan berdasarkan template yang tersedia."
      />
        <Card>
          <CardHeader>
            <CardTitle>Editor Laporan</CardTitle>
            <CardDescription>Pilih tanggal dan kegiatan untuk mengisi template secara otomatis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             {eventsError && <p className="text-red-500 text-sm">Gagal memuat kegiatan: {eventsError.message}</p>}
            
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

            <div className="space-y-2">
                <Label htmlFor="report-editor" className="font-semibold">Isi Laporan</Label>
                <Textarea
                    id="report-editor"
                    placeholder="Pilih kegiatan untuk memulai, atau tulis manual di sini..."
                    className="h-[500px] font-mono text-xs leading-relaxed"
                    value={reportContent}
                    onChange={(e) => setReportContent(e.target.value)}
                />
            </div>

          </CardContent>
            <CardFooter className="flex justify-end gap-2 mt-4 border-t pt-6">
                <Button variant="outline" onClick={handleReset}>
                    <Trash className="mr-2 h-4 w-4"/>
                    Reset
                </Button>
                <Button onClick={handleCopy}>
                    <Copy className="mr-2 h-4 w-4" />
                    Salin Notulen
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
