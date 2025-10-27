'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
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
    'letterheads': 'Kop Surat'
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

  // Handle case for root or dashboard
  if (segments.length === 0 || (segments.length === 1 && (segments[0] === 'dashboard' || segments[0] === 'calendar'))) {
    let rootLabel = 'Dashboard';
    if (segments[0] === 'calendar') {
        rootLabel = 'Kalender';
    }
    return (
        <nav aria-label="Breadcrumb" className="hidden flex-1 md:flex">
            <ol className="flex items-center space-x-1 text-sm text-muted-foreground">
                <li>
                    <span className="font-medium text-foreground">{rootLabel}</span>
                </li>
            </ol>
        </nav>
    );
  }
  
  const baseHref = segments[0] === 'dashboard' || segments[0] === 'calendar' ? '/' + segments[0] : '/dashboard';
  const baseLabel = segments[0] === 'dashboard' || segments[0] === 'calendar' ? formatSegment(segments[0]) : 'Home';


  return (
    <nav aria-label="Breadcrumb" className="hidden flex-1 md:flex">
      <ol className="flex items-center space-x-1 text-sm text-muted-foreground">
        <li>
          <Link href={baseHref} className="hover:text-foreground">
            {baseLabel}
          </Link>
        </li>
        {segments.map((segment, index) => {
          // Skip the first segment if it's the base
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
