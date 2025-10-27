
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
import { useState, useEffect } from 'react';
import { gapi } from 'gapi-script';

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
  const [isGapiLoaded, setIsGapiLoaded] = useState(false);
  const [gapiError, setGapiError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      summary: '',
      description: '',
      location: '',
    },
  });

  useEffect(() => {
    const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    
    if (!CLIENT_ID || !API_KEY) {
      const errorMsg = "Kredensial Google API (CLIENT_ID/API_KEY) belum diatur di file .env Anda.";
      setGapiError(errorMsg);
      toast({
        variant: 'destructive',
        title: 'Kesalahan Konfigurasi',
        description: errorMsg,
        duration: Infinity,
      });
      return;
    }
    
    const start = () => {
      gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file',
      }).then(() => {
        setIsGapiLoaded(true);
      }, (error: any) => {
        console.error("Error initializing gapi client:", error);
        const errorMsg = 'Tidak dapat terhubung ke layanan Google. Periksa konsol untuk detail.';
        setGapiError(errorMsg);
        toast({
          variant: 'destructive',
          title: 'Gagal Inisialisasi Google API',
          description: errorMsg,
        });
      });
    };
    gapi.load('client:auth2', start);
  }, [toast]);


  const uploadFileToDrive = async (file: File): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      if (!isGapiLoaded) {
        reject(new Error("Google API client is not loaded yet."));
        return;
      }
      
      const authInstance = gapi.auth2.getAuthInstance();
      const isSignedIn = authInstance.isSignedIn.get();

      if (!isSignedIn) {
        try {
          await authInstance.signIn();
        } catch (error) {
           console.error("Google Sign-In Error:", error);
           reject(new Error("Login Google dibatalkan atau gagal."));
           return;
        }
      }
      
      const reader = new FileReader();
      reader.readAsBinaryString(file);
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
          'Content-Transfer-Encoding: base64\r\n' +
          '\r\n' +
          btoa(fileContent as string) +
          close_delim;
        
        try {
          const uploadRequest = gapi.client.request({
            path: '/upload/drive/v3/files',
            method: 'POST',
            params: { uploadType: 'multipart' },
            headers: {
              'Content-Type': 'multipart/related; boundary=' + boundary,
            },
            body: multipartRequestBody,
          });

          const uploadResponse = await uploadRequest;
          const uploadedFile = JSON.parse(uploadResponse.body);
          
          if (!uploadedFile.id) {
            reject(new Error("Upload failed, file ID not returned."));
            return;
          }

          // Make the file publicly readable
          const permissionRequest = gapi.client.request({
              path: `/drive/v3/files/${uploadedFile.id}/permissions`,
              method: 'POST',
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
             params: { fields: 'webViewLink' }
          });
          
          const fileDetailsResponse = await fileDetailsRequest;
          const fileWithLink = JSON.parse(fileDetailsResponse.body);

          resolve(fileWithLink.webViewLink as string);

        } catch (error: any) {
          console.error("Google Drive Upload Error:", error);
          const errorMessage = error?.result?.error?.message || error.message || 'Unknown error occurred.';
          reject(new Error(`Gagal mengunggah file ke Google Drive: ${errorMessage}`));
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
          toast({ description: "Meminta izin dan mengunggah file ke Google Drive..." });
          attachmentUrlPayload = await uploadFileToDrive(values.attachment);
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
  
  const getButtonText = () => {
    if (gapiError) return "Konfigurasi Error";
    if (isSubmitting) return "Menyimpan...";
    if (!isGapiLoaded) return "Memuat Google API...";
    return "Simpan Kegiatan";
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
            <Button type="submit" disabled={isSubmitting || !isGapiLoaded || !!gapiError}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {getButtonText()}
            </Button>
        </div>
      </form>
    </Form>
  );
}


    