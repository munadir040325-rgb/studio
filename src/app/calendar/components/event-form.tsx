'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, buttonVariants } from '@/components/ui/button';
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
  attachment: z.instanceof(File).optional(),
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
  
  // Ref to store the token client from Google Identity Services
  const tokenClient = useRef<any>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      summary: '',
      description: '',
      location: '',
    },
  });

  useEffect(() => {
    const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (!API_KEY) {
      const errorMsg = "Kredensial Google API (API_KEY) belum diatur di file .env Anda.";
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

  // Callback when gapi script is loaded
  const handleGapiLoad = async () => {
    const { gapi } = window as any;
    gapi.load('client', async () => {
      await gapi.client.init({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
      });
      setIsGapiLoaded(true);
    });
  };

  // Callback when gis script is loaded
  const handleGisLoad = () => {
    const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!CLIENT_ID) {
      const errorMsg = "Kredensial Google API (CLIENT_ID) belum diatur di file .env Anda.";
      console.error(errorMsg);
      setGapiError(errorMsg);
      toast({
        variant: 'destructive',
        title: 'Kesalahan Konfigurasi',
        description: errorMsg,
        duration: Infinity,
      });
      return;
    }
    
    const { google } = window as any;
    tokenClient.current = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: '', // Callback will be handled by the promise in `requestAccessToken`
    });
    setIsGisLoaded(true);
  };
  
  // Promise-based function to get the access token
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

      client.requestAccessToken({ prompt: 'consent' });
    });
  };

  const uploadFileToDrive = async (file: File, accessToken: string): Promise<string> => {
    const { gapi } = window as any;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = async () => {
        const fileContent = reader.result;
        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const metadata = {
          name: file.name,
          mimeType: file.type,
          parents: [DRIVE_FOLDER_ID],
        };

        const multipartRequestBody =
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          'Content-Type: ' + file.type + '\r\n' +
          '\r\n' +
          // The body is now raw binary, not base64
          fileContent +
          close_delim;
        
        try {
          const uploadRequest = gapi.client.request({
            path: '/upload/drive/v3/files',
            method: 'POST',
            params: { uploadType: 'multipart' },
            headers: {
              'Content-Type': 'multipart/related; boundary=' + boundary,
              'Authorization': `Bearer ${accessToken}` // Use the access token
            },
            body: multipartRequestBody,
          });

          const uploadResponse = await uploadRequest;
          const uploadedFile = uploadResponse.result;
          
          if (!uploadedFile.id) {
            reject(new Error("Upload failed, file ID not returned."));
            return;
          }

          // Make the file publicly readable
          const permissionRequest = gapi.client.request({
              path: `/drive/v3/files/${uploadedFile.id}/permissions`,
              method: 'POST',
              headers: { 'Authorization': `Bearer ${accessToken}` },
              body: {
                  role: 'reader',
                  type: 'anyone'
              }
          });
          await permissionRequest;
          
          // Get the public web view link
          const fileDetailsRequest = gapi.client.request({
             path: `/drive/v3/files/${uploadedFile.id}`,
             method: 'GET',
             headers: { 'Authorization': `Bearer ${accessToken}` },
             params: { fields: 'webViewLink' }
          });
          
          const fileDetailsResponse = await fileDetailsRequest;
          const fileWithLink = fileDetailsResponse.result;

          resolve(fileWithLink.webViewLink as string);

        } catch (error: any) {
          console.error("Google Drive API Error:", error);
          const errorMessage = error?.result?.error?.message || error.message || 'Unknown error occurred.';
          reject(new Error(`Gagal berkomunikasi dengan Google Drive: ${errorMessage}`));
        }
      };
      reader.onerror = error => reject(error);
    });
  }


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      let attachmentUrlPayload: string | undefined;
      if (values.attachment) {
          toast({ description: "Meminta izin Google dan mengunggah file..." });
          const accessToken = await requestAccessToken();
          attachmentUrlPayload = await uploadFileToDrive(values.attachment, accessToken);
      }

      toast({ description: "Menyimpan kegiatan ke Google Calendar..." });
      await createCalendarEvent({
        summary: values.summary,
        description: values.description,
        location: values.location,
        startDateTime: values.startDateTime.toISOString(),
        endDateTime: values.endDateTime.toISOString(),
        attachmentUrl: attachmentUrlPayload,
      });

      toast({
        title: 'Berhasil!',
        description: 'Kegiatan baru telah ditambahkan ke kalender dan file telah diunggah.',
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

  const attachmentFile = form.watch('attachment');
  const isReady = isGapiLoaded && isGisLoaded;
  
  const getButtonText = () => {
    if (gapiError) return "Konfigurasi Error";
    if (isSubmitting) return "Menyimpan...";
    if (!isReady) return "Memuat Google API...";
    return "Simpan Kegiatan";
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
            name="attachment"
            render={({ field: { onChange, value, ...rest } }) => (
              <FormItem>
                <FormLabel>Lampiran Undangan/Surat Tugas</FormLabel>
                {attachmentFile ? (
                  <div className='flex items-center justify-between gap-2 text-sm p-2 bg-muted rounded-md'>
                      <div className="flex items-center gap-2 overflow-hidden">
                          <Paperclip className="h-4 w-4 flex-shrink-0" />
                          <span className='truncate'>{attachmentFile.name}</span>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className='h-6 w-6 flex-shrink-0' onClick={() => onChange(undefined)}>
                          <X className='h-4 w-4'/>
                          <span className="sr-only">Hapus file</span>
                      </Button>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="file-upload" className={cn(buttonVariants({ variant: 'outline' }), 'cursor-pointer')}>
                        <Paperclip className="mr-2 h-4 w-4" />
                        Pilih Lampiran
                    </label>
                    <FormControl>
                      <Input
                        type="file"
                        id="file-upload"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          onChange(file);
                        }}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
                        {...rest}
                      />
                    </FormControl>
                  </div>
                )}
                <FormDescription>
                      File akan diunggah ke Google Drive Anda setelah Anda memberikan izin. Ukuran maks 10MB.
                  </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />


          <div className="flex justify-end">
              <Button type="submit" disabled={!isReady || isSubmitting || !!gapiError}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {getButtonText()}
              </Button>
          </div>
        </form>
      </Form>
    </>
  );
}