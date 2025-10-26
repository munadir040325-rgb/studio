
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  department: z.string().optional(),
  fileType: z.string().optional(),
  attachment: z.any().optional(),
}).refine(data => {
    // If there is an attachment, department and fileType must be selected.
    if (data.attachment && (!data.department || !data.fileType)) {
        return false;
    }
    return true;
}, {
    message: "Bagian dan Jenis Lampiran harus dipilih jika ada file yang diunggah.",
    path: ["attachment"], // You can point this error to a specific field if you prefer
});


type EventFormProps = {
  onSuccess: () => void;
};

// Helper function to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64String = (reader.result as string).split(',')[1];
            if (base64String) {
                resolve(base64String);
            } else {
                reject(new Error("Failed to convert file to base64"));
            }
        };
        reader.onerror = (error) => reject(error);
    });
};

const departments = ["UMPEG", "SEKRETARIAT", "PKA", "TRANTIB", "KESRA", "PM", "TAPEM"];
const fileTypes = ["Notulen", "Foto Kegiatan", "Materi", "Lainnya"];


export function EventForm({ onSuccess }: EventFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      summary: '',
      description: '',
      location: '',
    },
  });

  const attachmentValue = form.watch('attachment');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      let attachmentPayload;
      const file = values.attachment as File | undefined;
      
      if (file && values.department && values.fileType) {
          const base64Data = await fileToBase64(file);
          attachmentPayload = {
              filename: file.name,
              contentType: file.type,
              data: base64Data,
              department: values.department,
              fileType: values.fileType,
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
        if (error.message.includes("writer access")) {
          errorMessage = "Gagal: Pastikan service account memiliki izin 'Membuat perubahan pada acara' di setelan berbagi kalender.";
        } else if (error.message.includes("enabled")) {
          errorMessage = "Gagal: Google Calendar API atau Google Drive API mungkin belum diaktifkan untuk proyek Anda."
        } else if (error.message.includes("drive")){
            errorMessage = "Terjadi kesalahan saat mengunggah lampiran ke Google Drive. Pastikan API Drive sudah aktif dan ID Folder Root sudah benar."
        }
        else {
          errorMessage = error.message;
        }
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
      form.setValue('attachment', file);
      setFileName(file.name);
    }
  };

  const removeFile = () => {
    form.setValue('attachment', null);
    setFileName(null);
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
            <h3 className="font-medium text-base">Lampiran (Google Drive)</h3>
            <div>
                {fileName ? (
                    <div className='flex items-center justify-between gap-2 text-sm p-2 bg-muted rounded-md'>
                        <span className='truncate'>{fileName}</span>
                        <Button type="button" variant="ghost" size="icon" className='h-6 w-6' onClick={removeFile}>
                            <X className='h-4 w-4'/>
                        </Button>
                    </div>
                ) : (
                    <Button type='button' variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Paperclip className="mr-2 h-4 w-4" />
                        Pilih File untuk Diunggah
                    </Button>
                )}
                <Input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden"/>
                <FormDescription className="mt-2">
                    File akan diunggah ke folder Google Drive terpusat.
                </FormDescription>
            </div>
            {attachmentValue && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Bagian Penyelenggara</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih bagian..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {departments.map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="fileType"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Jenis Lampiran</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih jenis file..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {fileTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}
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
            {isSubripping && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Kegiatan
            </Button>
        </div>
      </form>
    </Form>
  );
}

