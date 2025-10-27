'use client';

import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Loader2, UploadCloud, File as FileIcon, X, Trash2, Paperclip } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { parseISO, format } from 'date-fns';
import useSWR from 'swr';
import Script from 'next/script';

const ROOT_FOLDER_ID = process.env.NEXT_PUBLIC_DRIVE_FOLDER_ID;

type CalendarEvent = {
  id: string;
  summary: string;
  start: string;
};

const fetcher = (url: string) => fetch(url).then(res => {
    if (!res.ok) {
        throw new Error('Gagal mengambil data');
    }
    return res.json();
});

const FileList = ({ files, onRemove }: { files: File[], onRemove: (index: number) => void }) => (
    <div className="space-y-2 mt-2">
        {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between text-sm p-2 bg-muted rounded-md">
                <div className="flex items-center gap-2 overflow-hidden">
                    <Paperclip className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate" title={file.name}>{file.name}</span>
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => onRemove(index)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                    <span className="sr-only">Hapus file</span>
                </Button>
            </div>
        ))}
    </div>
);


export default function UploadPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Auth state
  const [isGisLoaded, setIsGisLoaded] = useState(false);
  const [gapiError, setGapiError] = useState<string | null>(null);
  const tokenClient = useRef<any>(null);
  const accessTokenRef = useRef<string | null>(null);
  
  // Form state
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [openEvent, setOpenEvent] = useState(false);
  const [selectedBagian, setSelectedBagian] = useState('');

  // File state
  const [fotoFiles, setFotoFiles] = useState<File[]>([]);
  const [notulenFile, setNotulenFile] = useState<File | null>(null);
  const [materiFiles, setMateriFiles] = useState<File[]>([]);

  const { data: eventsData, error: eventsError, isLoading: isLoadingEvents } = useSWR('/api/events', fetcher);
  const { data: bagianData, error: bagianError } = useSWR('/api/sheets', fetcher);
  
  const events: CalendarEvent[] = eventsData?.items.sort((a: CalendarEvent, b: CalendarEvent) => parseISO(b.start).getTime() - parseISO(a.start).getTime()) || [];

  useEffect(() => {
    const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!API_KEY || !CLIENT_ID || !ROOT_FOLDER_ID) {
      const errorMsg = "Kredensial Google (API_KEY, CLIENT_ID, atau DRIVE_FOLDER_ID) belum diatur di .env.";
      console.error(errorMsg);
      setGapiError(errorMsg);
    }

    if (eventsError) toast({ variant: 'destructive', title: 'Gagal Memuat Kegiatan', description: eventsError.message });
    if (bagianError) toast({ variant: 'destructive', title: 'Gagal Memuat Opsi Bagian', description: bagianError.message });

  }, [eventsError, bagianError, toast]);

  const handleGisLoad = () => {
    const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!CLIENT_ID) return;
    
    try {
        tokenClient.current = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive',
            callback: '', // Callback is handled in the promise
        });
        setIsGisLoaded(true);
    } catch (e) {
        const errorMsg = "Google Identity Services library tidak termuat dengan benar."
        setGapiError(errorMsg);
        console.error(errorMsg);
    }
  };
  
  const requestAccessToken = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!tokenClient.current) {
        return reject(new Error("Google Identity Services client not initialized."));
      }
      tokenClient.current.callback = (resp: any) => {
        if (resp.error) reject(new Error(`Gagal mendapatkan izin: ${resp.error_description || resp.error}`));
        else resolve(resp.access_token);
      };
      tokenClient.current.requestAccessToken({ prompt: 'consent' });
    });
  };

  const getOrCreateFolder = async (name: string, parentId: string): Promise<string> => {
    const q = `'${parentId}' in parents and name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`, {
        headers: { 'Authorization': `Bearer ${accessTokenRef.current}` }
    });
    const body = await res.json();
    if (body.files && body.files.length > 0) return body.files[0].id;

    const metadata = { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] };
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessTokenRef.current}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata)
    });
    const createBody = await createRes.json();
    if (!createRes.ok) throw new Error(`Gagal membuat folder '${name}': ${createBody.error?.message}`);
    return createBody.id;
  }
  
  const uploadFile = async (file: File, folderId: string) => {
      const metadata = { name: file.name, parents: [folderId] };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);
      
      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessTokenRef.current}` },
          body: form,
      });
      if (!res.ok) {
          const body = await res.json();
          throw new Error(`Gagal mengunggah ${file.name}: ${body.error?.message}`);
      }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !selectedBagian) {
      toast({ variant: 'destructive', title: 'Form Belum Lengkap', description: 'Mohon pilih kegiatan dan bagian.' });
      return;
    }
    if (!fotoFiles.length && !notulenFile && !materiFiles.length) {
        toast({ variant: 'destructive', title: 'Tidak Ada File', description: 'Mohon pilih setidaknya satu file untuk diunggah.' });
        return;
    }

    setIsSubmitting(true);
    toast({ description: "Memulai proses unggah..." });

    try {
        if (!accessTokenRef.current) {
            const token = await requestAccessToken();
            accessTokenRef.current = token;
        }

        if (!ROOT_FOLDER_ID) throw new Error("ROOT_FOLDER_ID belum diatur.");

        const bagianFolderId = await getOrCreateFolder(selectedBagian, ROOT_FOLDER_ID);
        const kegiatanFolderId = await getOrCreateFolder(selectedEvent.summary, bagianFolderId);

        const uploadPromises = [];
        
        if (fotoFiles.length > 0) {
            const fotoFolderId = await getOrCreateFolder('Foto Kegiatan', kegiatanFolderId);
            for (const file of fotoFiles) {
                uploadPromises.push(uploadFile(file, fotoFolderId));
            }
        }
        if (notulenFile) {
            const notulenFolderId = await getOrCreateFolder('Notulen', kegiatanFolderId);
            uploadPromises.push(uploadFile(notulenFile, notulenFolderId));
        }
        if (materiFiles.length > 0) {
            const materiFolderId = await getOrCreateFolder('Materi Kegiatan', kegiatanFolderId);
            for (const file of materiFiles) {
                uploadPromises.push(uploadFile(file, materiFolderId));
            }
        }
        
        await Promise.all(uploadPromises);

        toast({ title: 'Berhasil!', description: 'Semua file telah berhasil diunggah ke Google Drive.' });
        // Reset form
        setSelectedEvent(null);
        setSelectedBagian('');
        setFotoFiles([]);
        setNotulenFile(null);
        setMateriFiles([]);

    } catch (error: any) {
        console.error("Upload process failed:", error);
        toast({ variant: 'destructive', title: 'Gagal Mengunggah', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleFileChange = (setter: React.Dispatch<React.SetStateAction<any>>, multiple: boolean) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    if (!accessTokenRef.current) {
        try {
            const token = await requestAccessToken();
            accessTokenRef.current = token;
            toast({ title: "Izin diberikan!", description: "Anda sekarang dapat memilih file." });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Izin Ditolak', description: error.message });
            e.target.value = ""; // clear file input
            return;
        }
    }
    
    if (multiple) {
      setter((prev: File[]) => [...prev, ...Array.from(e.target.files!)]);
    } else {
      setter(e.target.files[0] || null);
    }
  };

  const FileInputTrigger = ({ files, label, singleFile }: { files: File[], label: string, singleFile?: boolean }) => (
    <Button type="button" variant="outline" className="w-full justify-start font-normal cursor-pointer">
        <label htmlFor={singleFile ? "notulen-upload" : label.includes("Foto") ? "foto-upload" : "materi-upload"} className="flex items-center gap-2 text-sm text-muted-foreground w-full cursor-pointer">
            <UploadCloud className="h-4 w-4" />
            <span>{files.length > 0 ? `${files.length} file dipilih` : label}</span>
        </label>
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <Script src="https://accounts.google.com/gsi/client" async defer onLoad={handleGisLoad}></Script>
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
          <CardContent className="grid gap-6">
             {gapiError && <p className="text-red-500 text-sm">{gapiError}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label htmlFor="kegiatan">Pilih Kegiatan (Wajib)</Label>
                <Popover open={openEvent} onOpenChange={setOpenEvent}>
                    <PopoverTrigger asChild>
                        <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openEvent}
                        className="w-full justify-between"
                        disabled={isLoadingEvents}
                        >
                        {isLoadingEvents 
                            ? "Memuat kegiatan..." 
                            : selectedEvent
                            ? selectedEvent.summary
                            : "Pilih kegiatan..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Cari kegiatan..." />
                            <CommandList>
                                <CommandEmpty>Kegiatan tidak ditemukan.</CommandEmpty>
                                <CommandGroup>
                                {events.map((event) => (
                                    <CommandItem
                                    key={event.id}
                                    value={event.summary}
                                    onSelect={() => {
                                        setSelectedEvent(event);
                                        setOpenEvent(false);
                                    }}
                                    >
                                    <Check
                                        className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedEvent?.id === event.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {event.summary}
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bagian">Pilih Bagian (Wajib)</Label>
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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="foto-upload">Upload Foto Kegiatan</Label>
                    <FileInputTrigger files={fotoFiles} label="Pilih foto..." />
                    <Input id="foto-upload" type="file" className="hidden" multiple accept="image/*" onChange={handleFileChange(setFotoFiles, true)} disabled={!isGisLoaded || !!gapiError} />
                    <p className="text-xs text-muted-foreground">Bisa unggah lebih dari satu file gambar.</p>
                    <FileList files={fotoFiles} onRemove={(index) => setFotoFiles(files => files.filter((_, i) => i !== index))} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="notulen-upload">Upload Notulen/Laporan</Label>
                    <FileInputTrigger files={notulenFile ? [notulenFile] : []} label="Pilih file..." singleFile />
                    <Input id="notulen-upload" type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleFileChange(setNotulenFile, false)} disabled={!isGisLoaded || !!gapiError} />
                    <p className="text-xs text-muted-foreground">Hanya satu file (PDF/DOCX).</p>
                    {notulenFile && <FileList files={[notulenFile]} onRemove={() => setNotulenFile(null)} />}
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="materi-upload">Upload Materi</Label>
                    <FileInputTrigger files={materiFiles} label="Pilih file..." />
                    <Input id="materi-upload" type="file" className="hidden" multiple onChange={handleFileChange(setMateriFiles, true)} disabled={!isGisLoaded || !!gapiError}/>
                    <p className="text-xs text-muted-foreground">Bisa unggah file jenis apa pun.</p>
                     <FileList files={materiFiles} onRemove={(index) => setMateriFiles(files => files.filter((_, i) => i !== index))} />
                </div>
            </div>
             <div className="flex justify-end mt-4">
              <Button type="submit" disabled={isSubmitting || !isGisLoaded || !!gapiError}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                {isSubmitting ? 'Mengunggah...' : 'Simpan & Upload Lampiran'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
