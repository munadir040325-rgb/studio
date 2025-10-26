
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2, Paperclip, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { createCalendarEvent } from '@/ai/flows/calendar-flow';
import { useToast } from '@/hooks/use-toast';
import { useState, useRef, useEffect, useCallback } from 'react';
import { gapi } from 'gapi-script';


const formSchema = z.object({
  summary: z.string().min(2, {
    message: 'Judul kegiatan harus diisi (minimal 2 karakter).',
  }),
  description: z.string().optional(),
  location: z.string().optional(),
  startDateTime: z.date({
    required_error: 'Tanggal & waktu mulai harus diisi.',
  }),
  endDateTime: z.date({
    required_error: 'Tanggal & waktu selesai harus diisi.',
  }),
  attachment: z.any().optional(),
});


type EventFormProps = {
  onSuccess: () => void;
};


// --- Client-side Google Drive Upload Logic ---
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
const DRIVE_FOLDER_ID = '1ozMzvJUBgy9h0bq4HXXxN0aPkPW4duCH';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient: google.accounts.oauth2.TokenClient | null = null;


export function EventForm({ onSuccess }: EventFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const [gapiLoaded, setGapiLoaded] = useState(false);

  // Load GAPI and GIS scripts
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => gapi.load('client', () => setGapiLoaded(true));
    document.body.appendChild(script);

    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.defer = true;
    document.body.appendChild(gisScript);

    return () => {
      document.body.removeChild(script);
      document.body.removeChild(gisScript);
    };
  }, []);

  // Initialize GAPI client and Token Client once scripts are loaded
  useEffect(() => {
    if (!gapiLoaded) return;
    
    async function initializeGapiClient() {
        await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        });
    }

    initializeGapiClient();

    if (window.google?.accounts?.oauth2) {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: '', // Callback will be handled by the promise flow
        });
    }
  }, [gapiLoaded]);


  const uploadFileToDrive = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            return reject(new Error('Google Auth client not initialized.'));
        }

        const callback = async (resp: google.accounts.oauth2.TokenResponse) => {
            if (resp.error) {
                return reject(new Error('Gagal mendapatkan izin Google Drive.'));
            }

            try {
                const metadata = {
                    name: file.name,
                    parents: [DRIVE_FOLDER_ID],
                };

                const form = new FormData();
                form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
                form.append('file', file);
                
                const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                    method: 'POST',
                    headers: new Headers({ 'Authorization': 'Bearer ' + gapi.client.getToken().access_token }),
                    body: form,
                });
                
                const data = await response.json();

                if (data.error) {
                    return reject(new Error(data.error.message));
                }

                if (!data.webViewLink) {
                    return reject(new Error('Gagal mendapatkan link file setelah upload.'));
                }
                
                resolve(data.webViewLink);

            } catch (error: any) {
                reject(new Error(`Error saat upload file: ${error.message}`));
            }
        };

        // Request an access token.
        tokenClient.callback = callback;
        tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }, []);



  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      summary: '',
      description: '',
      location: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      let uploadedFileUrl: string | undefined;

      if (attachmentFile) {
          if (!gapiLoaded || !tokenClient) {
              throw new Error("Layanan Google belum siap. Mohon tunggu sejenak dan coba lagi.");
          }
          toast({
            title: 'Proses Upload...',
            description: 'Sedang mengunggah file ke Google Drive. Mohon tunggu...',
          });
          uploadedFileUrl = await uploadFileToDrive(attachmentFile);
      }

      await createCalendarEvent({
        summary: values.summary,
        description: values.description,
        location: values.location,
        startDateTime: values.startDateTime.toISOString(),
        endDateTime: values.endDateTime.toISOString(),
        fileUrl: uploadedFileUrl,
      });

      toast({
        title: 'Berhasil!',
        description: 'Kegiatan baru telah ditambahkan ke kalender.',
      });
      onSuccess();
    } catch (error: any) {
      console.error('Failed to create event:', error);
      let errorMessage = 'Terjadi kesalahan saat menambahkan kegiatan.';
       if (error?.message) {
         errorMessage = error.message;
       }
      toast({
        variant: 'destructive',
        title: 'Gagal Membuat Kegiatan',
        description: errorMessage,
      });
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleDateChange = (field: any, date: Date | undefined) => {
    if (!date) return;
    const currentValue = field.value || new Date();
    const newDate = new Date(date);
    newDate.setHours(currentValue.getHours());
    newDate.setMinutes(currentValue.getMinutes());
    field.onChange(newDate);
  };
  
  const handleTimeChange = (field: any, timeValue: string) => {
    if (!timeValue) return;
    const [hours, minutes] = timeValue.split(':').map(Number);
    const newDate = field.value ? new Date(field.value) : new Date();
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    field.onChange(newDate);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAttachmentFile(file);
    }
  };

  const removeFile = () => {
    setAttachmentFile(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="summary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Judul Kegiatan</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g., Rapat Koordinasi Staf terkait..."
                  className="h-20"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
            control={form.control}
            name="startDateTime"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                <FormLabel>Waktu Mulai</FormLabel>
                <Popover>
                    <PopoverTrigger asChild>
                    <FormControl>
                        <Button
                        variant={'outline'}
                        className={cn(
                            'pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                        )}
                        >
                        {field.value ? (
                            format(field.value, 'PPP HH:mm', { locale: id })
                        ) : (
                            <span>Pilih tanggal dan waktu</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => handleDateChange(field, date)}
                        locale={id}
                        initialFocus
                    />
                    <div className="p-2 border-t">
                        <Input 
                            type="time" 
                            value={field.value ? format(field.value, 'HH:mm') : ''}
                            onChange={(e) => handleTimeChange(field, e.target.value)}
                        />
                    </div>
                    </PopoverContent>
                </Popover>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="endDateTime"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                <FormLabel>Waktu Selesai</FormLabel>
                <Popover>
                    <PopoverTrigger asChild>
                    <FormControl>
                        <Button
                        variant={'outline'}
                        className={cn(
                            'pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                        )}
                        >
                        {field.value ? (
                            format(field.value, 'PPP HH:mm', { locale: id })
                        ) : (
                            <span>Pilih tanggal dan waktu</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => handleDateChange(field, date)}
                        locale={id}
                        initialFocus
                    />
                    <div className="p-2 border-t">
                        <Input 
                            type="time" 
                            value={field.value ? format(field.value, 'HH:mm') : ''}
                            onChange={(e) => handleTimeChange(field, e.target.value)}
                        />
                    </div>
                    </PopoverContent>
                </Popover>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Lokasi</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Aula Kecamatan" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Deskripsi</FormLabel>
                    <FormControl>
                        <Textarea
                        placeholder="Tambahkan detail kegiatan."
                        {...field}
                        className="h-20"
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
             />
        </div>
        <div className="space-y-4 rounded-md border p-4">
            <h3 className="font-medium text-base">Lampiran Undangan/Surat Tugas</h3>
            <div>
                {attachmentFile ? (
                    <div className='flex items-center justify-between gap-2 text-sm p-2 bg-muted rounded-md'>
                        <span className='truncate'>{attachmentFile.name}</span>
                        <Button type="button" variant="ghost" size="icon" className='h-6 w-6' onClick={removeFile}>
                            <X className='h-4 w-4'/>
                        </Button>
                    </div>
                ) : (
                    <Button type='button' variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Paperclip className="mr-2 h-4 w-4" />
                        Pilih Undangan/Surat Tugas
                    </Button>
                )}
                <Input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden"/>
                <FormDescription className="mt-2">
                    File akan diunggah ke Google Drive terpusat setelah Anda memberikan izin.
                </FormDescription>
            </div>
             <FormField
                control={form.control}
                name="attachment"
                render={() => (
                    <FormItem>
                       <FormMessage />
                    </FormItem>
                )}
             />
        </div>

        <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Kegiatan
            </Button>
        </div>
      </form>
    </Form>
  );
}
