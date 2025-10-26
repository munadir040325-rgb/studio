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
import { createCalendarEvent } from '@/ai/flows/calendar-flow';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

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
});

type EventFormProps = {
  onSuccess: () => void;
};

export function EventForm({ onSuccess }: EventFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await createCalendarEvent({
        ...values,
        startDateTime: values.startDateTime.toISOString(),
        endDateTime: values.endDateTime.toISOString(),
      });
      toast({
        title: 'Berhasil!',
        description: 'Kegiatan baru telah ditambahkan ke kalender.',
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to create event:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal',
        description: 'Terjadi kesalahan saat menambahkan kegiatan.',
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
                <Input placeholder="e.g., Rapat Koordinasi Staf" {...field} />
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
                        format(field.value, 'PPP HH:mm')
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
                        format(field.value, 'PPP HH:mm')
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
                  placeholder="Tambahkan detail atau catatan penting tentang kegiatan ini."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Simpan Kegiatan
        </Button>
      </form>
    </Form>
  );
}
