'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit } from 'lucide-react';

export default function MasterLetterheadsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Data Kop Surat"
        description="Kelola kop surat standar yang digunakan di semua dokumen resmi."
      >
        <Button variant="outline">
          <Edit className="mr-2 h-4 w-4" />
          Edit Kop Surat
        </Button>
      </PageHeader>
      <Card>
          <CardHeader>
              <CardTitle>Kop Surat Standar</CardTitle>
              <CardDescription>Pratinjau kop surat yang akan digunakan pada dokumen yang dicetak.</CardDescription>
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
    </div>
  );
}
