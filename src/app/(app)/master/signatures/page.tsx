'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import Image from 'next/image';

const signatures = [
    { id: 1, name: 'Kepala Dinas', holder: 'Dr. H. Iwan Setiawan, M.Si.', imageUrl: 'https://picsum.photos/seed/sig1/200/100', imageHint: 'signature script' },
    { id: 2, name: 'Sekretaris', holder: 'Dra. Siti Aminah, M.M.', imageUrl: 'https://picsum.photos/seed/sig2/200/100', imageHint: 'signature script' },
];

export default function MasterSignaturesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Data Tanda Tangan"
        description="Kelola tanda tangan digital untuk digunakan dalam dokumen SPPD."
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah Tanda Tangan
        </Button>
      </PageHeader>
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
    </div>
  );
}
