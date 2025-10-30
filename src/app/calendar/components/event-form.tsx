
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
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { createCalendarEvent } from '@/ai/flows/calendar-flow';
import { writeEventToSheet } from '@/ai/flows/sheets-flow';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import useSWR from 'swr';


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
  bagian: z.string().min(1, { message: 'Bagian harus dipilih.' }),
});


type EventFormProps = {
  onSuccess: () => void;
};


export function EventForm({ onSuccess }: EventFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: bagianData, error: bagianError } = useSWR('/api/sheets', fetcher);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      summary: '',
      description: '',
      location: '',
      bagian: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      toast({ description: "Menyimpan kegiatan ke Google Calendar..." });
      
      const userInput = values.description || '';

      await createCalendarEvent({
        summary: values.summary,
        description: userInput, // Send the raw description
        location: values.location,
        startDateTime: values.startDateTime.toISOString(),
        endDateTime: values.endDateTime.toISOString(),
      });

      toast({
        title: 'Berhasil!',
        description: 'Kegiatan baru telah ditambahkan ke kalender.',
      });

      // Fire-and-forget: write to sheet in the background
      writeEventToSheet({
        summary: values.summary,
        location: values.location,
        startDateTime: values.startDateTime.toISOString(),
        // Pass the original user input to the sheet flow.
        disposisi: userInput,
        bagian: values.bagian,
      }).then(res => {
          if(res?.status === 'success') {
            console.log(`Successfully wrote to sheet cell: ${res.cell}`);
          }
      }).catch(err => {
          console.error("Gagal menulis ke Google Sheet:", err);
          // Optionally, show a non-blocking warning toast
          toast({
            variant: 'destructive',
            title: 'Gagal Sinkronisasi Sheet',
            description: `Kegiatan berhasil dibuat di kalender, tapi gagal ditulis ke Google Sheet. Error: ${err.message}`,
          });
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
    // Reconstruct date without timezone shift
    const newDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        currentValue.getHours(),
        currentValue.getMinutes()
    );
    field.onChange(newDate);
  };
  
  const handleTimeChange = (field: any, timeValue: string) => {
    if (!timeValue) return;
    const [hours, minutes] = timeValue.split(':').map(Number);
    const currentValue = field.value ? new Date(field.value) : new Date();
    // Reconstruct date to avoid timezone issues
    const newDate = new Date(
        currentValue.getFullYear(),
        currentValue.getMonth(),
        currentValue.getDate(),
        hours,
        minutes
    );
    field.onChange(newDate);
  };
  
  const getButtonText = () => {
    if (isSubmitting) return "Menyimpan...";
    return "Simpan Kegiatan";
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
                name="bagian"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Bagian (Wajib)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!bagianData || !!bagianError}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={!bagianData ? "Memuat..." : "Pilih bagian pelaksana"} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {(bagianData?.values || []).map((item: string, index: number) => (
                                    <SelectItem key={index} value={item.toLowerCase().replace(/ /g, '_')}>{item.toUpperCase()}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                         {bagianError && <p className="text-red-500 text-xs mt-1">Gagal memuat daftar bagian: {bagianError.message}</p>}
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
          </div>
           <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Deskripsi / Disposisi</FormLabel>
                      <FormControl>
                          <Textarea
                          placeholder="e.g., 'Dihadiri oleh Camat, membawa laptop'"
                          {...field}
                          className="h-20"
                          />
                      </FormControl>
                      <FormDescription>
                        Teks yang Anda masukkan di sini akan disimpan sebagai "Disposisi" di Google Calendar.
                      </FormDescription>
                      <FormMessage />
                      </FormItem>
                  )}
              />

          <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {getButtonText()}
              </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
