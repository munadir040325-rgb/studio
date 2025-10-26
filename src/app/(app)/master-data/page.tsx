'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmployeeTable } from './components/employee-table';
import { employees } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const signatures = [
    { id: 1, name: 'Kepala Dinas', holder: 'Dr. H. Iwan Setiawan, M.Si.', imageUrl: 'https://picsum.photos/seed/sig1/200/100', imageHint: 'signature script' },
    { id: 2, name: 'Sekretaris', holder: 'Dra. Siti Aminah, M.M.', imageUrl: 'https://picsum.photos/seed/sig2/200/100', imageHint: 'signature script' },
]

export default function MasterDataPage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tab || 'employees');

  useEffect(() => {
    if (tab) {
      setActiveTab(tab);
    }
  }, [tab]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Data Master"
        description="Kelola data pegawai, tanda tangan, dan kop surat untuk pembuatan dokumen."
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah Baru
        </Button>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
          <TabsTrigger value="employees">Pegawai</TabsTrigger>
          <TabsTrigger value="signatures">Tanda Tangan</TabsTrigger>
          <TabsTrigger value="letterheads">Kop Surat</TabsTrigger>
        </TabsList>
        <TabsContent value="employees" className="mt-4">
          <EmployeeTable data={employees} />
        </TabsContent>
        <TabsContent value="signatures" className="mt-4">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {signatures.map(sig => (
                    <Card key={sig.id}>
                        <CardHeader>
                            <CardTitle>{sig.name}</CardTitle>
                            <CardDescription>{sig.holder}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="p-4 border rounded-md bg-muted/50 flex justify-center items-center">
                                <Image src={sig.imageUrl} alt={sig.name} width={200} height={100} data-ai-hint={sig.imageHint} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </TabsContent>
        <TabsContent value="letterheads" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Kop Surat Standar</CardTitle>
                    <CardDescription>Kop surat ini akan digunakan di semua dokumen resmi.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg p-8 text-center bg-background">
                        <div className="mx-auto w-20 h-20 bg-muted rounded-full mb-4 flex items-center justify-center font-bold text-muted-foreground">Logo</div>
                        <h2 className="font-bold text-xl">PEMERINTAH KABUPATEN CONTOH</h2>
                        <h3 className="font-semibold text-lg">DINAS KOMUNIKASI DAN INFORMATIKA</h3>
                        <p className="text-sm text-muted-foreground">Jalan Raya Pahlawan No. 123, Kota Contoh, 12345</p>
                        <p className="text-sm text-muted-foreground">Website: contohkab.go.id | Email: kominfo@contohkab.go.id</p>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
