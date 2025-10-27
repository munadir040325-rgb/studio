'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';

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
  const path = usePathname();
  const [segments, setSegments] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setSegments(path.split('/').filter(Boolean));
    setIsClient(true);
  }, [path]);

  if (!isClient) {
    // Render null atau placeholder di server untuk menghindari mismatch
    return null;
  }
  
  const breadcrumbSegments = ['home', ...segments];

  return (
    <nav aria-label="Breadcrumb" className="hidden flex-1 md:flex">
      <ol className="flex min-w-0 flex-1 items-center space-x-1 text-sm text-muted-foreground">
        {breadcrumbSegments.map((segment, index) => {
          const isFirst = index === 0;
          const isLast = index === breadcrumbSegments.length - 1;
          const href = `/${segments.slice(0, index).join('/')}`;

          let displayText = formatSegment(segment);
            if (segment === 'new') {
                displayText = 'Buat Baru';
            }

          if (isFirst) {
            return (
              <li key="home">
                <Link href="/calendar" className="hover:text-foreground">
                  <Home className="h-4 w-4" />
                  <span className="sr-only">Home</span>
                </Link>
              </li>
            );
          }

          // Jangan render "Home" lagi karena sudah ada di atas
          if (segment === 'home') return null;

          // Jika ini adalah halaman kalender itu sendiri, jangan render breadcrumbnya
          if (segment === 'calendar' && breadcrumbSegments.length <= 2) {
              return (
                 <Fragment key={href}>
                    <li className="flex items-center">
                        <ChevronRight className="h-4 w-4 shrink-0" />
                         <span className="ml-1 truncate font-medium text-foreground" aria-current="page">
                            {displayText}
                        </span>
                    </li>
                </Fragment>
             )
          }
          if (segment === 'calendar') return null;


          return (
            <Fragment key={href}>
              <li className="flex items-center">
                <ChevronRight className="h-4 w-4 shrink-0" />
                {isLast ? (
                   <span
                    className="ml-1 truncate font-medium text-foreground"
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
