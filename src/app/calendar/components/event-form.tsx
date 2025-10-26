
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
import { useState, useRef } from 'react';


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
  // attachment will be a File object from the input
  attachment: z.instanceof(File).optional(),
});


type EventFormProps = {
  onSuccess: () => void;
};


export function EventForm({ onSuccess }: EventFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      summary: '',
      description: '',
      location: '',
    },
  });

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // result is "data:mime/type;base64,the-real-base-64-string"
            // we just want "the-real-base-64-string"
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
        };
        reader.onerror = error => reject(error);
    });
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      
      let attachmentPayload;
      if (values.attachment) {
          const base64Data = await fileToBase64(values.attachment);
          attachmentPayload = {
              filename: values.attachment.name,
              mimetype: values.attachment.type,
              data: base64Data,
          };
      }

      await createCalendarEvent({
        summary: values.summary,
        description: values.description,
        location: values.location,
        startDateTime: values.startDateTime.toISOString(),
        endDateTime: values.endDateTime.toISOString(),
        attachment: attachmentPayload,
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

  const attachmentFile = form.watch('attachment');

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
                    <span className='truncate'>{attachmentFile.name}</span>
                    <Button type="button" variant="ghost" size="icon" className='h-6 w-6' onClick={() => {
                        onChange(undefined);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                    }}>
                        <X className='h-4 w-4'/>
                    </Button>
                </div>
              ) : (
                <FormControl>
                    <Button type='button' variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Paperclip className="mr-2 h-4 w-4" />
                        Pilih Undangan/Surat Tugas
                    </Button>
                </FormControl>
              )}
              <Input
                type="file"
                ref={fileInputRef}
                onChange={(e) => onChange(e.target.files ? e.target.files[0] : undefined)}
                className="hidden"
                {...rest}
              />
               <FormDescription>
                    File akan diunggah ke Google Drive terpusat.
                </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />


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
