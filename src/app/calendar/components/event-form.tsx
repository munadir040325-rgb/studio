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
import { CalendarIcon, Loader2, Paperclip, X, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { createCalendarEvent } from '@/ai/flows/calendar-flow';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef } from 'react';
import Script from 'next/script';

const DRIVE_FOLDER_ID = '1ozMzvJUBgy9h0bq4HXXxN0aPkPW4duCH';

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
  attachmentUrl: z.string().url().optional(),
});


type EventFormProps = {
  onSuccess: () => void;
};


export function EventForm({ onSuccess }: EventFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGisLoaded, setIsGisLoaded] = useState(false);
  const [isGapiLoaded, setIsGapiLoaded] = useState(false);
  const [gapiError, setGapiError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  
  const tokenClient = useRef<any>(null);
  const accessTokenRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      summary: '',
      description: '',
      location: '',
      attachmentUrl: '',
    },
  });

  useEffect(() => {
    const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!API_KEY || !CLIENT_ID) {
      const errorMsg = "Kredensial Google (API_KEY atau CLIENT_ID) belum diatur di .env.";
      console.error(errorMsg);
      setGapiError(errorMsg);
      toast({
        variant: 'destructive',
        title: 'Kesalahan Konfigurasi',
        description: errorMsg,
        duration: Infinity,
      });
    }
  }, [toast]);

  const handleGapiLoad = async () => {
    const { gapi } = window as any;
    gapi.load('client', async () => {
      try {
        await gapi.client.init({
            apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
        });
        setIsGapiLoaded(true);
      } catch (error: any) {
         const errorMsg = `Gagal menginisialisasi Google API Client: ${error.message}`;
         console.error(errorMsg, error);
         setGapiError(errorMsg);
      }
    });
  };

  const handleGisLoad = () => {
    const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!CLIENT_ID) return;
    
    const { google } = window as any;
    if (google?.accounts?.oauth2) {
      tokenClient.current = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: '', // Callback is handled in the promise
      });
      setIsGisLoaded(true);
    } else {
        const errorMsg = "Google Identity Services library tidak termuat dengan benar."
        setGapiError(errorMsg);
        console.error(errorMsg);
    }
  };
  
  const requestAccessToken = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const client = tokenClient.current;
      if (!client) {
        return reject(new Error("Google Identity Services client not initialized."));
      }

      client.callback = (tokenResponse: any) => {
        if (tokenResponse.error) {
          console.error("Google Access Token Error:", tokenResponse.error, tokenResponse.error_description);
          reject(new Error(`Gagal mendapatkan izin Google: ${tokenResponse.error_description || tokenResponse.error}`));
        } else {
          resolve(tokenResponse.access_token);
        }
      };
      
      // Prompt for consent to ensure the user sees the auth flow.
      client.requestAccessToken({ prompt: 'consent' });
    });
  };

  const uploadFileToDrive = async (file: File, accessToken: string): Promise<string> => {
    const { gapi } = window as any;
    
    // Set the access token for this gapi client session
    gapi.client.setToken({ access_token: accessToken });

    const metadata = {
        name: file.name,
        mimeType: file.type,
        parents: [DRIVE_FOLDER_ID],
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);
    
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        body: form,
    });
    
    const body = await response.json();

    if (!response.ok) {
        console.error("Google Drive API Error:", body);
        throw new Error(`Gagal mengunggah file ke Google Drive: ${body.error?.message || 'Unknown error'}`);
    }

    const fileId = body.id;

    // Make the file publicly readable
    const permissionResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            role: 'reader',
            type: 'anyone',
        }),
    });

    if (!permissionResponse.ok) {
        console.error("Google Drive Permission Error:", await permissionResponse.json());
        // Don't throw, just warn, as the file is uploaded but not public
        toast({
            variant: "destructive",
            title: "Peringatan Izin",
            description: "File berhasil diunggah tapi gagal membuatnya dapat diakses publik."
        });
    }

    // Get the web view link
    const fileDetailsResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    
    const fileDetails = await fileDetailsResponse.json();

    if (!fileDetails.webViewLink) {
        throw new Error("Gagal mendapatkan link publik untuk file yang diunggah.");
    }
    
    return fileDetails.webViewLink;
  }

  const handleAuthorizeClick = async () => {
    if (!isReady || isUploading || gapiError) return;

    toast({ description: "Meminta izin Google..." });
    try {
        const token = await requestAccessToken();
        accessTokenRef.current = token;
        toast({ title: "Izin diberikan!", description: "Anda sekarang dapat memilih file untuk diunggah." });
        // After successful auth, automatically trigger the file input
        fileInputRef.current?.click();
    } catch (error: any) {
        console.error("Authorization failed:", error);
        accessTokenRef.current = null;
        toast({
            variant: 'destructive',
            title: 'Izin Ditolak',
            description: error.message,
        });
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file) {
          return;
      }
      
      // Check if we have a token. If not, try to get one.
      let token = accessTokenRef.current;
      if (!token) {
          toast({ description: "Meminta izin Google untuk mengunggah..." });
          try {
              token = await requestAccessToken();
              accessTokenRef.current = token;
          } catch (error: any) {
              toast({
                  variant: 'destructive',
                  title: 'Izin Diperlukan',
                  description: 'Izin Google diperlukan untuk mengunggah file. Silakan coba lagi.',
              });
              if(fileInputRef.current) fileInputRef.current.value = "";
              return;
          }
      }

      setIsUploading(true);
      setAttachmentName(file.name);
      toast({ description: `Mengunggah ${file.name}...` });
      
      try {
          const publicUrl = await uploadFileToDrive(file, token);
          form.setValue('attachmentUrl', publicUrl);
          toast({ title: "Berhasil!", description: `${file.name} telah diunggah.` });

      } catch(error: any) {
          console.error("Upload process failed:", error);
          toast({
              variant: 'destructive',
              title: 'Gagal Mengunggah',
              description: error.message,
          });
          // Clear attachment if upload fails
          setAttachmentName(null);
          form.setValue('attachmentUrl', undefined);
      } finally {
          setIsUploading(false);
          // Reset file input to allow re-uploading the same file
          if(fileInputRef.current) {
            fileInputRef.current.value = "";
          }
      }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      toast({ description: "Menyimpan kegiatan ke Google Calendar..." });
      await createCalendarEvent({
        summary: values.summary,
        description: values.description,
        location: values.location,
        startDateTime: values.startDateTime.toISOString(),
        endDateTime: values.endDateTime.toISOString(),
        attachmentUrl: values.attachmentUrl,
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

  const attachmentUrl = form.watch('attachmentUrl');
  const isReady = isGapiLoaded && isGisLoaded;
  
  const getButtonText = () => {
    if (gapiError) return "Konfigurasi Error";
    if (isSubmitting) return "Menyimpan...";
    if (!isReady) return "Memuat Google API...";
    return "Simpan Kegiatan";
  }

  const handleRemoveAttachment = () => {
      form.setValue('attachmentUrl', undefined);
      setAttachmentName(null);
  }

  return (
    <>
      <Script src="https://apis.google.com/js/api.js" async defer onLoad={handleGapiLoad}></Script>
      <Script src="https://accounts.google.com/gsi/client" async defer onLoad={handleGisLoad}></Script>
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

          <FormField
            control={form.control}
            name="attachmentUrl"
            render={() => (
              <FormItem>
                <FormLabel>Lampiran Undangan/Surat Tugas</FormLabel>
                {attachmentUrl ? (
                  <div className='flex items-center justify-between gap-2 text-sm p-2 bg-muted rounded-md'>
                      <a href={attachmentUrl} target='_blank' rel='noopener noreferrer' className="flex items-center gap-2 overflow-hidden hover:underline">
                          <Paperclip className="h-4 w-4 flex-shrink-0" />
                          <span className='truncate'>{attachmentName || 'Lihat Lampiran'}</span>
                      </a>
                      <Button type="button" variant="ghost" size="icon" className='h-6 w-6 flex-shrink-0' onClick={handleRemoveAttachment} disabled={isUploading}>
                          <X className='h-4 w-4'/>
                          <span className="sr-only">Hapus file</span>
                      </Button>
                  </div>
                ) : (
                  <div>
                    <Button type="button" variant="outline" onClick={handleAuthorizeClick} disabled={!isReady || isUploading || !!gapiError}>
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                        {isUploading ? 'Mengunggah...' : 'Unggah Lampiran'}
                    </Button>
                    <FormControl>
                      <Input
                        type="file"
                        id="file-upload"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
                        disabled={isUploading}
                      />
                    </FormControl>
                  </div>
                )}
                <FormDescription>
                      File akan diunggah ke Google Drive setelah Anda memberikan izin.
                  </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />


          <div className="flex justify-end">
              <Button type="submit" disabled={!isReady || isSubmitting || isUploading || !!gapiError}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {getButtonText()}
              </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
