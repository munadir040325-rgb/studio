'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { Fragment } from 'react';

// Fungsi untuk mengubah segmen path menjadi judul yang mudah dibaca
const formatSegment = (segment: string) => {
  if (!segment) return 'Home';
  
  // Custom formatting
  const customFormats: { [key: string]: string } = {
    'sppd': 'SPPD',
    'spj': 'SPJ',
    'master': 'Master Data',
    'employees': 'Pegawai',
    'signatures': 'Tanda Tangan',
    'letterheads': 'Kop Surat',
    'calendar': 'Kalender',
    'upload': 'Upload Lampiran',
    'settings': 'Pengaturan',
    'reports': 'Laporan',
    'dashboard': 'Dashboard'
  };

  if (customFormats[segment]) {
    return customFormats[segment];
  }

  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  // Jika di halaman root/calendar, tidak menampilkan apa-apa atau hanya judul
  if (segments.length === 0 || (segments.length === 1 && segments[0] === 'calendar')) {
    return (
        <nav aria-label="Breadcrumb" className="hidden flex-1 md:flex">
            <ol className="flex items-center space-x-1 text-sm text-muted-foreground">
                <li>
                    <span className="font-medium text-foreground">Kalender</span>
                </li>
            </ol>
        </nav>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="hidden flex-1 md:flex">
      <ol className="flex items-center space-x-1 text-sm text-muted-foreground">
        <li>
          <Link href="/calendar" className="hover:text-foreground">
            <Home className="h-4 w-4" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {segments.map((segment, index) => {
          // Skip the first segment if it's the base like 'dashboard' or 'calendar'
          if (index === 0 && (segment === 'dashboard' || segment === 'calendar')) {
            return null;
          }
            
          const href = `/${segments.slice(0, index + 1).join('/')}`;
          const isLast = index === segments.length - 1;
          
          let displayText = formatSegment(segment);
          if (segment === 'new') {
            displayText = 'Buat Baru';
          }

          return (
            <Fragment key={href}>
              <li className="flex items-center">
                <ChevronRight className="h-4 w-4" />
                {isLast ? (
                   <span
                    className="ml-1 font-medium text-foreground"
                    aria-current="page"
                  >
                    {displayText}
                  </span>
                ) : (
                  <Link
                    href={href}
                    className="ml-1 hover:text-foreground"
                  >
                    {displayText}
                  </Link>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
