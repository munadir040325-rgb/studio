

'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, UploadCloud, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn, getFileIcon } from '@/lib/utils';
import useSWR from 'swr';
import { updateEventAttachments } from '@/lib/google-calendar-attachments';
import { useGoogleDriveAuth } from '@/hooks/useGoogleDriveAuth';
import type { CalendarEvent } from '@/app/(main)/calendar/page';


const ROOT_FOLDER_ID = process.env.NEXT_PUBLIC_DRIVE_FOLDER_ID_HASIL;

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
                <div className="flex items-center gap-2 min-w-0">
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

type UploadAttachmentFormProps = {
    event: CalendarEvent;
    onSuccess: () => void;
};


export function UploadAttachmentForm({ event, onSuccess }: UploadAttachmentFormProps) {
  const { toast } = useToast();
  
  const {
    isReady,
    isUploading,
    error: driveError,
    requestAccessToken,
    uploadToSubfolders,
  } = useGoogleDriveAuth({ folderId: ROOT_FOLDER_ID });

  const [selectedBagian, setSelectedBagian] = useState('');
  const [undanganFiles, setUndanganFiles] = useState<File[]>([]);
  const [fotoFiles, setFotoFiles] = useState<File[]>([]);
  const [notulenFile, setNotulenFile] = useState<File | null>(null);
  const [materiFiles, setMateriFiles] = useState<File[]>([]);

  const undanganInputRef = useRef<HTMLInputElement>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const notulenInputRef = useRef<HTMLInputElement>(null);
  const materiInputRef = useRef<HTMLInputElement>(null);

  const { data: bagianData, error: bagianError } = useSWR('/api/sheets', fetcher);
  
  useEffect(() => {
    // Pre-fill "bagian" if it's already known for the event
    if (event.bagianName) {
        // Find the key in the BAGIAN_ROW_MAP that corresponds to the event's bagianName
        // This is a bit tricky since we only have the display name. We'll have to guess the key.
        const likelyKey = event.bagianName.toLowerCase().replace(/ /g, '_');
        if (bagianData?.values.some((v: string) => v.toLowerCase().replace(/ /g, '_') === likelyKey)) {
             setSelectedBagian(likelyKey);
        }
    }
  }, [event.bagianName, bagianData]);


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
    const calendarId = process.env.NEXT_PUBLIC_CALENDAR_ID;

    if (!selectedBagian || !calendarId) {
      toast({ variant: 'destructive', title: 'Form Belum Lengkap', description: 'Mohon pilih bagian pelaksana.' });
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

    const result = await uploadToSubfolders(selectedBagian, event.summary || "Kegiatan Tanpa Nama", subfolders);

    if (result.error) {
      toast({ variant: 'destructive', title: 'Proses Gagal', description: result.error });
      return;
    }
    
    if (result.kegiatanFolderLink || (result.links && result.links.length > 0)) {
        toast({ title: 'Berhasil!', description: 'Semua file telah berhasil diunggah ke Google Drive.' });
        
        toast({ description: "Memperbarui acara di kalender..." });
        try {
            const allUploadedLinks = result.links || [];
            
            const attachmentGroups = [];

            const undanganGroup = allUploadedLinks.filter(l => undanganFiles.some(f => f.name === l.name));
            if (undanganGroup.length > 0) attachmentGroups.push({ label: 'Undangan', files: undanganGroup.map(link => ({
                fileId: link.fileId,
                name: link.name,
                webViewLink: link.webViewLink,
                mimeType: link.mimeType,
            })) });

            const fotoGroup = allUploadedLinks.filter(l => fotoFiles.some(f => f.name === l.name));
            if (fotoGroup.length > 0) attachmentGroups.push({ label: 'Foto Kegiatan', files: fotoGroup.map(link => ({
                fileId: link.fileId,
                name: link.name,
                webViewLink: link.webViewLink,
                mimeType: link.mimeType,
            })) });

            const notulenGroup = allUploadedLinks.filter(l => notulenFile && notulenFile.name === l.name);
            if (notulenGroup.length > 0) attachmentGroups.push({ label: 'Notulen', files: notulenGroup.map(link => ({
                fileId: link.fileId,
                name: link.name,
                webViewLink: link.webViewLink,
                mimeType: link.mimeType,
            })) });

            const materiGroup = allUploadedLinks.filter(l => materiFiles.some(f => f.name === l.name));
            if (materiGroup.length > 0) attachmentGroups.push({ label: 'Materi', files: materiGroup.map(link => ({
                fileId: link.fileId,
                name: link.name,
                webViewLink: link.webViewLink,
                mimeType: link.mimeType,
            })) });


             await updateEventAttachments({
                calendarId: calendarId,
                eventId: event.id!,
                resultFolderUrl: result.kegiatanFolderLink,
                groups: attachmentGroups,
            });
            toast({ title: 'Berhasil!', description: 'Lampiran & link hasil kegiatan telah ditambahkan ke acara kalender.' });

            onSuccess();

        } catch (updateError: any) {
             let errorMessage = updateError.message || 'Terjadi kesalahan saat memperbarui acara di kalender.';
             if (errorMessage.includes('INVALID_ARGUMENT')) {
                errorMessage = "Gagal memperbarui kalender: Format lampiran tidak valid. Pastikan fileId benar.";
             }
             toast({ variant: 'destructive', title: 'Gagal Memperbarui Kalender', description: errorMessage });
        }
    }
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
    <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
            <Label htmlFor="bagian" className="font-semibold">Pilih Bagian</Label>
            <Select value={selectedBagian} onValueChange={setSelectedBagian} required disabled={!bagianData || !!bagianError}>
            <SelectTrigger id="bagian" className="w-full">
                <SelectValue placeholder={!bagianData ? "Memuat opsi..." : "Pilih bagian pelaksana"} />
            </SelectTrigger>
            <SelectContent>
                {(bagianData?.values || []).map((item: string, index: number) => (
                <SelectItem key={index} value={item.toLowerCase().replace(/ /g, '_')}>{item.toUpperCase()}</SelectItem>
                ))}
            </SelectContent>
            </Select>
            {bagianError && <p className="text-red-500 text-sm mt-1">Gagal memuat bagian: {bagianError.message}</p>}
        </div>

        <div className="space-y-4">
            <Label className="font-semibold">Upload File Lampiran</Label>
            {driveError && <p className="text-red-500 text-sm">{driveError}</p>}
            
            <div className="grid grid-cols-1 gap-4">
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
                    <div className="max-h-32 overflow-y-auto no-scrollbar">
                    <FileList files={undanganFiles} onRemove={(index) => setUndanganFiles(files => files.filter((_, i) => i !== index))} isUploading={isUploading}/>
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="foto-upload">Upload Foto Kegiatan</Label>                      <FileUploadButton 
                        pickerRef={fotoInputRef} 
                        label="Pilih foto..." 
                        files={fotoFiles} 
                        isUploading={isUploading} 
                        isDisabled={!isReady || !!driveError}
                        onButtonClick={() => handleAuthorizeAndPick(fotoInputRef)}
                    />
                    <p className="text-xs text-muted-foreground">Bisa unggah lebih dari satu file gambar.</p>
                     <div className="max-h-32 overflow-y-auto no-scrollbar">
                    <FileList files={fotoFiles} onRemove={(index) => setFotoFiles(files => files.filter((_, i) => i !== index))} isUploading={isUploading}/>
                    </div>
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
                    <div className="max-h-32 overflow-y-auto no-scrollbar">
                    {notulenFile && <FileList files={[notulenFile]} onRemove={() => setNotulenFile(null)} isUploading={isUploading} />}
                    </div>
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
                    <div className="max-h-32 overflow-y-auto no-scrollbar">
                    <FileList files={materiFiles} onRemove={(index) => setMateriFiles(files => files.filter((_, i) => i !== index))} isUploading={isUploading}/>
                    </div>
                </div>
            </div>
        </div>

        <CardFooter className="flex justify-end mt-4 p-0">
            <Button type="submit" disabled={isUploading || !isReady || !!driveError || !selectedBagian}>
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            {isUploading ? 'Mengunggah...' : 'Simpan & Upload Lampiran'}
            </Button>
        </CardFooter>
    </form>
  );
}
