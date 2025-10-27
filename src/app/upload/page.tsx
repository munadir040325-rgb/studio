'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Loader2, UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { employees } from '@/lib/data';
import { cn } from '@/lib/utils';

type CalendarEvent = {
  id: string;
  summary: string;
};

type Employee = {
  id: string;
  name: string;
};

export default function UploadPage() {
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedBagian, setSelectedBagian] = useState('');
  const [selectedPegawai, setSelectedPegawai] = useState('');
  const [openPegawai, setOpenPegawai] = useState(false);

  // File state
  const [fotoFiles, setFotoFiles] = useState<File[]>([]);
  const [notulenFile, setNotulenFile] = useState<File | null>(null);
  const [materiFiles, setMateriFiles] = useState<File[]>([]);

  useEffect(() => {
    async function fetchEvents() {
      setIsLoadingEvents(true);
      try {
        const response = await fetch('/api/events');
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Gagal mengambil daftar kegiatan.');
        }
        setEvents(data.items || []);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Gagal Memuat Kegiatan',
          description: error.message,
        });
      } finally {
        setIsLoadingEvents(false);
      }
    }
    fetchEvents();
  }, [toast]);

  const handleFileChange = (setter: React.Dispatch<React.SetStateAction<any>>, multiple: boolean) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      if (multiple) {
        setter((prev: File[]) => [...prev, ...Array.from(e.target.files!)]);
      } else {
        setter(e.target.files[0] || null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !selectedBagian || !selectedPegawai) {
      toast({
        variant: 'destructive',
        title: 'Form Belum Lengkap',
        description: 'Mohon isi semua field yang wajib diisi.',
      });
      return;
    }

    setIsSubmitting(true);
    toast({ description: "Memulai proses unggah..." });

    // TODO: Implement the actual upload logic to Google Drive
    // This will involve:
    // 1. Getting an access token for Google Drive.
    // 2. Checking if the base folder for the 'bagian' (e.g., 'umpeg') exists. Create if not.
    // 3. Checking if the subfolders ('foto', 'notulen', 'materi') exist. Create if not.
    // 4. Uploading each file to the correct destination folder.
    // 5. Handling progress and final success/error messages.

    console.log({
        kegiatanId: selectedEvent,
        bagian: selectedBagian,
        disposisiPegawaiId: selectedPegawai,
        foto: fotoFiles.map(f => f.name),
        notulen: notulenFile?.name,
        materi: materiFiles.map(f => f.name),
    });

    // Simulate upload process
    await new Promise(resolve => setTimeout(resolve, 2000));

    toast({
      title: 'Proses Selesai (Simulasi)',
      description: 'Logika unggah file ke Google Drive perlu diimplementasikan.',
    });
    setIsSubmitting(false);
  };
  
  const FileInputTrigger = ({ files, label }: { files: File[], label: string }) => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <UploadCloud className="h-4 w-4" />
        <span>{files.length > 0 ? `${files.length} file dipilih` : label}</span>
    </div>
);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Upload Lampiran Kegiatan"
        description="Unggah dokumen dan foto terkait kegiatan yang sudah dilaksanakan."
      />
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Detail Lampiran</CardTitle>
            <CardDescription>Pilih kegiatan dan lengkapi detail lampiran yang akan diunggah.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label htmlFor="kegiatan">Pilih Kegiatan</Label>
                <Select value={selectedEvent} onValueChange={setSelectedEvent} required>
                  <SelectTrigger disabled={isLoadingEvents}>
                    <SelectValue placeholder={isLoadingEvents ? "Memuat kegiatan..." : "Pilih dari kalender"} />
                  </SelectTrigger>
                  <SelectContent>
                    {!isLoadingEvents && events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>{event.summary}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bagian">Pilih Bagian</Label>
                <Select value={selectedBagian} onValueChange={setSelectedBagian} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih bagian" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="umpeg">Umum & Kepegawaian (Umpeg)</SelectItem>
                    <SelectItem value="keuangan">Keuangan</SelectItem>
                    <SelectItem value="perencanaan">Perencanaan</SelectItem>
                    <SelectItem value="lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid gap-2">
                <Label>Disposisi</Label>
                <Popover open={openPegawai} onOpenChange={setOpenPegawai}>
                    <PopoverTrigger asChild>
                        <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openPegawai}
                        className="w-full justify-between"
                        >
                        {selectedPegawai
                            ? employees.find((employee) => employee.id === selectedPegawai)?.name
                            : "Pilih pegawai..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Cari pegawai..." />
                            <CommandList>
                                <CommandEmpty>Pegawai tidak ditemukan.</CommandEmpty>
                                <CommandGroup>
                                {employees.map((employee) => (
                                    <CommandItem
                                    key={employee.id}
                                    value={employee.name}
                                    onSelect={() => {
                                        setSelectedPegawai(employee.id);
                                        setOpenPegawai(false);
                                    }}
                                    >
                                    <Check
                                        className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedPegawai === employee.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {employee.name}
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="foto-kegiatan">Upload Foto Kegiatan</Label>
                    <Button type="button" variant="outline" asChild className="cursor-pointer">
                        <label htmlFor="foto-kegiatan">
                            <FileInputTrigger files={fotoFiles} label="Pilih foto..." />
                        </label>
                    </Button>
                    <Input id="foto-kegiatan" type="file" className="hidden" multiple accept="image/*" onChange={handleFileChange(setFotoFiles, true)} />
                    <p className="text-xs text-muted-foreground">Bisa unggah lebih dari satu file gambar.</p>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="notulen">Upload Notulen/Laporan</Label>
                     <Button type="button" variant="outline" asChild className="cursor-pointer">
                        <label htmlFor="notulen">
                             <FileInputTrigger files={notulenFile ? [notulenFile] : []} label="Pilih file..." />
                        </label>
                    </Button>
                    <Input id="notulen" type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleFileChange(setNotulenFile, false)} />
                    <p className="text-xs text-muted-foreground">Hanya satu file (PDF/DOCX).</p>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="materi">Upload Materi</Label>
                     <Button type="button" variant="outline" asChild className="cursor-pointer">
                        <label htmlFor="materi">
                             <FileInputTrigger files={materiFiles} label="Pilih file..." />
                        </label>
                    </Button>
                    <Input id="materi" type="file" className="hidden" multiple onChange={handleFileChange(setMateriFiles, true)}/>
                    <p className="text-xs text-muted-foreground">Bisa unggah file jenis apa pun.</p>
                </div>
            </div>
             <div className="flex justify-end mt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan & Upload Lampiran
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
