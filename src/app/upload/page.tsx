'use client';

import { useState, useRef, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar as CalendarIcon, UploadCloud, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn, getFileIcon } from '@/lib/utils';
import { parseISO, format, isSameDay } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import useSWR from 'swr';
import { updateCalendarEvent } from '@/ai/flows/calendar-flow';
import { useGoogleDriveAuth } from '@/hooks/useGoogleDriveAuth';

const ROOT_FOLDER_ID = process.env.NEXT_PUBLIC_DRIVE_FOLDER_ID_HASIL;

type CalendarEvent = {
  id: string;
  summary: string;
  start: string;
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


const FileList = ({ files, onRemove, isUploading }: { files: File[], onRemove: (index: number) => void, isUploading: boolean }) => (
    <div className="space-y-2 mt-2">
        {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between text-sm p-2 bg-muted rounded-md">
                <div className="flex items-center gap-2 overflow-hidden">
                    {getFileIcon(file.name)}
                    <span className="truncate" title={file.name}>{file.name}</span>
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => onRemove(index)} disabled={isUploading}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                    <span className="sr-only">Hapus file</span>
                </Button>
            </div>
        ))}
    </div>
);


export default function UploadPage() {
  const { toast } = useToast();
  
  const {
    isReady,
    isUploading,
    error: driveError,
    requestAccessToken,
    uploadToSubfolders,
  } = useGoogleDriveAuth({ folderId: ROOT_FOLDER_ID });

  // Form state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedBagian, setSelectedBagian] = useState('');

  // File state
  const [undanganFiles, setUndanganFiles] = useState<File[]>([]);
  const [fotoFiles, setFotoFiles] = useState<File[]>([]);
  const [notulenFile, setNotulenFile] = useState<File | null>(null);
  const [materiFiles, setMateriFiles] = useState<File[]>([]);

  const undanganInputRef = useRef<HTMLInputElement>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const notulenInputRef = useRef<HTMLInputElement>(null);
  const materiInputRef = useRef<HTMLInputElement>(null);

  const { data: eventsData, error: eventsError, isLoading: isLoadingEvents } = useSWR('/api/events', fetcher);
  const { data: bagianData, error: bagianError } = useSWR('/api/sheets', fetcher);
  
  const events: CalendarEvent[] = eventsData?.items.sort((a: CalendarEvent, b: CalendarEvent) => parseISO(b.start).getTime() - parseISO(a.start).getTime()) || [];
  
  const filteredEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter(event => isSameDay(parseISO(event.start), selectedDate));
  }, [events, selectedDate]);


  const handleAuthorizeAndPick = async (pickerRef: React.RefObject<HTMLInputElement>) => {
    if (!isReady || isUploading || driveError) return;
    try {
        await requestAccessToken();
        pickerRef.current?.click();
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Izin Gagal',
            description: error.message || 'Gagal mendapatkan izin untuk mengakses Google Drive.',
        });
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !selectedBagian) {
      toast({ variant: 'destructive', title: 'Form Belum Lengkap', description: 'Mohon pilih kegiatan dan bagian.' });
      return;
    }
    if (!undanganFiles.length && !fotoFiles.length && !notulenFile && !materiFiles.length) {
        toast({ variant: 'destructive', title: 'Tidak Ada File', description: 'Mohon pilih setidaknya satu file untuk diunggah.' });
        return;
    }

    const subfolders: { folderName: string, files: File[] }[] = [
      ...(undanganFiles.length > 0 ? [{ folderName: 'Undangan', files: undanganFiles }] : []),
      ...(fotoFiles.length > 0 ? [{ folderName: 'Foto Kegiatan', files: fotoFiles }] : []),
      ...(notulenFile ? [{ folderName: 'Notulen', files: [notulenFile] }] : []),
      ...(materiFiles.length > 0 ? [{ folderName: 'Materi Kegiatan', files: materiFiles }] : []),
    ];

    const result = await uploadToSubfolders(selectedBagian, selectedEvent.summary, subfolders);

    if (result.error) {
      toast({ variant: 'destructive', title: 'Proses Gagal', description: result.error });
      return;
    }
    
    // Create attachment links for calendar description
    const allUploadedLinks: { webViewLink: string; name: string }[] = result.links || [];
    
    if (result.kegiatanFolderLink || allUploadedLinks.length > 0) {
        toast({ title: 'Berhasil!', description: 'Semua file telah berhasil diunggah ke Google Drive.' });
        
        toast({ description: "Memperbarui acara di kalender..." });
        try {
            await updateCalendarEvent({
                eventId: selectedEvent.id,
                resultFolderUrl: result.kegiatanFolderLink,
                attachments: allUploadedLinks
            });
            toast({ title: 'Berhasil!', description: 'Link lampiran & hasil kegiatan telah ditambahkan ke acara kalender.' });

            // Reset form
            setSelectedDate(undefined);
            setSelectedEvent(null);
            setSelectedBagian('');
            setUndanganFiles([]);
            setFotoFiles([]);
            setNotulenFile(null);
            setMateriFiles([]);

        } catch (updateError: any) {
            toast({ variant: 'destructive', title: 'Gagal Memperbarui Kalender', description: updateError.message });
        }
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedEvent(null); // Reset selected event when date changes
  };


  const handleFileChange = (setter: React.Dispatch<React.SetStateAction<any>>, multiple: boolean) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    if (multiple) {
      setter((prev: File[]) => [...prev, ...Array.from(e.target.files!)]);
    } else {
      setter(e.target.files[0] || null);
    }
    e.target.value = '';
  };
  
  const FileUploadButton = ({ pickerRef, label, files, isSingle, isUploading, isDisabled, onButtonClick }: { pickerRef: React.RefObject<HTMLInputElement>, label: string, files: File[] | null, isSingle?: boolean, isUploading: boolean, isDisabled: boolean, onButtonClick: () => void }) => {
    const fileCount = files ? files.length : 0;
    return (
        <div>
        <Button type="button" variant="outline" className="w-full justify-start font-normal" onClick={onButtonClick} disabled={isDisabled || isUploading}>
            <UploadCloud className="h-4 w-4 mr-2" />
            <span>{fileCount > 0 ? `${fileCount} file dipilih` : label}</span>
        </Button>
        <Input 
            id={pickerRef.current?.id}
            ref={pickerRef}
            type="file" 
            className="hidden" 
            multiple={!isSingle} 
            accept={
                pickerRef === undanganInputRef ? ".pdf,.doc,.docx" :
                pickerRef === fotoInputRef ? "image/*" : 
                pickerRef === notulenInputRef ? ".pdf,.doc,.docx" : 
                "*"
            }
            onChange={handleFileChange(
                pickerRef === undanganInputRef ? setUndanganFiles :
                pickerRef === fotoInputRef ? setFotoFiles : 
                pickerRef === notulenInputRef ? setNotulenFile : 
                setMateriFiles, 
                !isSingle
            )}
            disabled={isDisabled || isUploading}
        />
        </div>
    );
  };


  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Upload Lampiran Kegiatan"
        description="Unggah dokumen dan foto terkait kegiatan yang sudah dilaksanakan."
      />
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Detail Lampiran</CardTitle>
            <CardDescription>Pilih kegiatan, bagian, dan file yang akan diunggah ke Google Drive.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
             {driveError && <p className="text-red-500 text-sm">{driveError}</p>}
             {eventsError && <p className="text-red-500 text-sm">Gagal memuat kegiatan: {eventsError.message}</p>}
             {bagianError && <p className="text-red-500 text-sm">Gagal memuat bagian: {bagianError.message}</p>}
            
             <div className="space-y-4">
                <div className="space-y-2">
                    <Label className="font-semibold text-base">Pilih Kegiatan Berdasarkan Tanggal</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
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
                                onSelect={handleDateSelect}
                                initialFocus
                                locale={localeId}
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                {selectedDate && (
                    <div className="space-y-2">
                        <Label>Kegiatan pada {format(selectedDate, 'dd MMMM yyyy', { locale: localeId })}</Label>
                        {isLoadingEvents ? (
                            <div className="space-y-2 pt-2">
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : filteredEvents.length > 0 ? (
                        <Select onValueChange={(eventId) => setSelectedEvent(events.find(e => e.id === eventId) || null)} value={selectedEvent?.id ?? ''}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih kegiatan..." />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredEvents.map(event => (
                                <SelectItem key={event.id} value={event.id}>
                                    {event.summary} ({format(parseISO(event.start), 'HH:mm')})
                                </SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                        ) : (
                            <p className="text-sm text-muted-foreground pt-2">Tidak ada kegiatan untuk tanggal ini.</p>
                        )}
                    </div>
                )}
            </div>

             <div className="space-y-2">
                <Label htmlFor="bagian" className="font-semibold text-base">Pilih Bagian (Wajib)</Label>
                <Select value={selectedBagian} onValueChange={setSelectedBagian} required disabled={!bagianData || !!bagianError}>
                <SelectTrigger>
                    <SelectValue placeholder={!bagianData ? "Memuat opsi..." : "Pilih bagian"} />
                </SelectTrigger>
                <SelectContent>
                    {bagianData?.values?.map((item: string, index: number) => (
                        <SelectItem key={index} value={item.toLowerCase().replace(/ /g, '_')}>{item}</SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>

            <div className="space-y-4">
                <Label className="font-semibold text-base">Upload File Lampiran</Label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                      <Label htmlFor="undangan-upload">Upload Undangan/Surat Tugas</Label>
                      <FileUploadButton 
                          pickerRef={undanganInputRef} 
                          label="Pilih file..." 
                          files={undanganFiles} 
                          isUploading={isUploading} 
                          isDisabled={!isReady || !!driveError}
                          onButtonClick={() => handleAuthorizeAndPick(undanganInputRef)}
                      />
                      <p className="text-xs text-muted-foreground">Bisa unggah lebih dari satu file (PDF/DOCX).</p>
                      <FileList files={undanganFiles} onRemove={(index) => setUndanganFiles(files => files.filter((_, i) => i !== index))} isUploading={isUploading}/>
                  </div>

                  <div className="grid gap-2">
                      <Label htmlFor="foto-upload">Upload Foto Kegiatan</Label>
                      <FileUploadButton 
                          pickerRef={fotoInputRef} 
                          label="Pilih foto..." 
                          files={fotoFiles} 
                          isUploading={isUploading} 
                          isDisabled={!isReady || !!driveError}
                          onButtonClick={() => handleAuthorizeAndPick(fotoInputRef)}
                      />
                      <p className="text-xs text-muted-foreground">Bisa unggah lebih dari satu file gambar.</p>
                      <FileList files={fotoFiles} onRemove={(index) => setFotoFiles(files => files.filter((_, i) => i !== index))} isUploading={isUploading}/>
                  </div>

                  <div className="grid gap-2">
                      <Label htmlFor="notulen-upload">Upload Notulen/Laporan</Label>
                      <FileUploadButton 
                          pickerRef={notulenInputRef} 
                          label="Pilih file..." 
                          files={notulenFile ? [notulenFile] : null} 
                          isSingle 
                          isUploading={isUploading} 
                          isDisabled={!isReady || !!driveError}
                          onButtonClick={() => handleAuthorizeAndPick(notulenInputRef)}
                      />
                      <p className="text-xs text-muted-foreground">Hanya satu file (PDF/DOCX).</p>
                      {notulenFile && <FileList files={[notulenFile]} onRemove={() => setNotulenFile(null)} isUploading={isUploading} />}
                  </div>

                  <div className="grid gap-2">
                      <Label htmlFor="materi-upload">Upload Materi</Label>
                      <FileUploadButton 
                          pickerRef={materiInputRef} 
                          label="Pilih file..." 
                          files={materiFiles} 
                          isUploading={isUploading} 
                          isDisabled={!isReady || !!driveError}
                          onButtonClick={() => handleAuthorizeAndPick(materiInputRef)}
                      />
                      <p className="text-xs text-muted-foreground">Bisa unggah file jenis apa pun.</p>
                      <FileList files={materiFiles} onRemove={(index) => setMateriFiles(files => files.filter((_, i) => i !== index))} isUploading={isUploading}/>
                  </div>
                </div>
            </div>
          </CardContent>
            <CardFooter className="flex justify-end mt-4 border-t pt-6">
              <Button type="submit" disabled={isUploading || !isReady || !!driveError || !selectedEvent || !selectedBagian}>
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                {isUploading ? 'Mengunggah...' : 'Simpan & Upload Lampiran'}
              </Button>
            </CardFooter>
        </Card>
      </form>
    </div>
  );
}
