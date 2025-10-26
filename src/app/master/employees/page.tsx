'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { EmployeeTable } from './components/employee-table';
import { employees } from '@/lib/data';

export default function MasterEmployeesPage() {

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Data Pegawai"
        description="Kelola data pegawai yang terlibat dalam perjalanan dinas."
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah Pegawai
        </Button>
      </PageHeader>
      <EmployeeTable data={employees} />
    </div>
  );
}
