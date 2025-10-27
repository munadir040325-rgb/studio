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
import { CalendarIcon, Loader2, UploadCloud, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { createCalendarEvent } from '@/ai/flows/calendar-flow';
import { useToast } from '@/hooks/use-toast';
import { useState, useRef } from 'react';
import { getFileIcon } from '@/lib/utils';
import { useGoogleDriveAuth } from '@/hooks/useGoogleDriveAuth';


const DRIVE_FOLDER_ID = process.env.NEXT_PUBLIC_DRIVE_FOLDER_ID;

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
  attachmentUrl: z.string().url().optional().or(z.literal('')),
  attachmentName: z.string().optional(),
});


type EventFormProps = {
  onSuccess: () => void;
};


export function EventForm({ onSuccess }: EventFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isReady,
    isUploading,
    error: driveError,
    requestAccessToken,
    authorizeAndUpload,
  } = useGoogleDriveAuth({ folderId: DRIVE_FOLDER_ID });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      summary: '',
      description: '',
      location: '',
      attachmentUrl: '',
      attachmentName: '',
    },
  });

  const handleUploadClick = async () => {
    try {
        await requestAccessToken(); // First, get permission
        fileInputRef.current?.click(); // Then, open file picker
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Izin Gagal',
            description: error.message || 'Gagal mendapatkan izin untuk mengakses Google Drive.',
        });
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      form.setValue('attachmentName', file.name);
      
      // We already have the token from handleUploadClick, so this should be quick
      const result = await authorizeAndUpload([file]);

      if (result.error) {
          toast({
              variant: 'destructive',
              title: 'Gagal Mengunggah',
              description: result.error,
          });
          form.setValue('attachmentName', '');
          form.setValue('attachmentUrl', '');
      } else if (result.links && result.links.length > 0) {
          form.setValue('attachmentUrl', result.links[0].webViewLink);
          toast({ title: "Berhasil!", description: `${file.name} telah diunggah.` });
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      toast({ description: "Menyimpan kegiatan ke Google Calendar..." });
      
      const now = new Date();
      const monthName = format(now, 'MMMM', { locale: id });
      const yearYY = format(now, 'yy');
      const timestamp = format(now, 'dd MMMM yyyy, HH:mm', { locale: id });
      
      const userInput = values.description || '';
      
      let descriptionParts = [];
      descriptionParts.push(`Giat_${monthName}_${yearYY}`);
      descriptionParts.push(userInput);
      descriptionParts.push(`Disimpan pada: ${timestamp}`);

      const finalDescription = descriptionParts.join('\n');

      await createCalendarEvent({
        summary: values.summary,
        description: finalDescription,
        location: values.location,
        startDateTime: values.startDateTime.toISOString(),
        endDateTime: values.endDateTime.toISOString(),
        attachmentUrl: values.attachmentUrl,
        attachmentName: values.attachmentName,
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

  const attachmentName = form.watch('attachmentName');
  
  const getButtonText = () => {
    if (driveError) return "Konfigurasi Error";
    if (isSubmitting) return "Menyimpan...";
    if (!isReady) return "Memuat Google API...";
    return "Simpan Kegiatan";
  }

  const handleRemoveAttachment = () => {
      form.setValue('attachmentUrl', '');
      form.setValue('attachmentName', '');
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="summary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Judul Kegiatan (Wajib)</FormLabel>
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
                  <FormLabel>Waktu Mulai (Wajib)</FormLabel>
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
                  <FormLabel>Waktu Selesai (Wajib)</FormLabel>
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
                <FormLabel>Lampiran Undangan/Surat Tugas (Opsional)</FormLabel>
                {attachmentName ? (
                  <div className='flex items-center justify-between text-sm p-2 bg-muted rounded-md'>
                      <div className="flex items-center gap-2 overflow-hidden">
                          {getFileIcon(attachmentName)}
                          <span className='truncate' title={attachmentName}>{attachmentName}</span>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className='h-6 w-6 flex-shrink-0' onClick={handleRemoveAttachment} disabled={isUploading}>
                          <Trash2 className='h-4 w-4 text-red-500'/>
                          <span className="sr-only">Hapus file</span>
                      </Button>
                  </div>
                ) : (
                  <div>
                    <Button type="button" variant="outline" onClick={handleUploadClick} disabled={!isReady || isUploading || !!driveError}>
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
                      File akan diunggah ke Google Drive. Kosongkan jika tidak ada lampiran.
                  </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />


          <div className="flex justify-end">
              <Button type="submit" disabled={!isReady || isSubmitting || isUploading || !!driveError}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {getButtonText()}
              </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
