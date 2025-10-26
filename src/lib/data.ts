import type { Employee, SPPD } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const userAvatars = PlaceHolderImages.filter(img => img.id.startsWith('user-'));

export const employees: Employee[] = [
  { id: '1', name: 'Budi Santoso', nip: '198503152010121001', position: 'Kepala Bagian', avatarUrl: userAvatars[0]?.imageUrl || '' },
  { id: '2', name: 'Citra Lestari', nip: '199008202015032002', position: 'Staf Analis', avatarUrl: userAvatars[1]?.imageUrl || '' },
  { id: '3', name: 'Doni Firmansyah', nip: '198811052014011003', position: 'Staf Pelaksana', avatarUrl: userAvatars[2]?.imageUrl || '' },
  { id: '4', name: 'Eka Wijayanti', nip: '199201252018022001', position: 'Staf Ahli', avatarUrl: userAvatars[3]?.imageUrl || '' },
  { id: '5', name: 'Fajar Nugroho', nip: '198906302013051004', position: 'Staf Keuangan', avatarUrl: userAvatars[4]?.imageUrl || '' },
];

export const sppds: SPPD[] = [
  {
    id: 'SPPD001',
    activity: 'Rapat Koordinasi Nasional',
    sppdNumber: 'ST/001/III/2024',
    destination: 'Jakarta',
    startDate: new Date('2024-07-20'),
    endDate: new Date('2024-07-22'),
    executors: [employees[0], employees[1]],
    status: 'COMPLETED',
  },
  {
    id: 'SPPD002',
    activity: 'Studi Banding Implementasi E-Gov',
    sppdNumber: 'ST/002/III/2024',
    destination: 'Surabaya',
    startDate: new Date('2024-08-05'),
    endDate: new Date('2024-08-07'),
    executors: [employees[2]],
    status: 'APPROVED',
  },
  {
    id: 'SPPD003',
    activity: 'Pelatihan Teknis Jaringan Komputer',
    sppdNumber: 'ST/003/IV/2024',
    destination: 'Bandung',
    startDate: new Date('2024-08-10'),
    endDate: new Date('2024-08-14'),
    executors: [employees[3], employees[4]],
    status: 'ON-GOING',
  },
  {
    id: 'SPPD004',
    activity: 'Workshop Penyusunan Anggaran',
    sppdNumber: 'ST/004/IV/2024',
    destination: 'Yogyakarta',
    startDate: new Date('2024-09-01'),
    endDate: new Date('2024-09-03'),
    executors: [employees[1]],
    status: 'DRAFT',
  },
  {
    id: 'SPPD005',
    activity: 'Konsultasi Program dengan Pusat',
    sppdNumber: 'ST/005/V/2024',
    destination: 'Jakarta',
    startDate: new Date('2024-07-28'),
    endDate: new Date('2024-07-29'),
    executors: [employees[0]],
    status: 'CANCELED',
  },
];
