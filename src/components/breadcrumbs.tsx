

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { Fragment } from 'react';

// Fungsi untuk mengubah segmen path menjadi judul yang mudah dibaca
const formatSegment = (segment: string) => {
  if (!segment) return 'Kalender'; // Default to 'Kalender' for root
  
  // Custom formatting
  const customFormats: { [key: string]: string } = {
    'report': 'Buat Laporan',
    'panduan': 'Panduan',
    'preview': 'Preview'
  };

  if (customFormats[segment]) {
    return customFormats[segment];
  }

  // Fallback for dynamic segments like event IDs
  if (segment.length > 15) { // Assuming event IDs are long
      return "Detail Laporan";
  }

  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function Breadcrumbs() {
  const path = usePathname();
  const segments = path.split('/').filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="hidden flex-1 md:flex">
      <ol className="flex min-w-0 flex-1 items-center space-x-1 whitespace-nowrap text-sm text-muted-foreground">
        <li>
            <Link href="/" className="hover:text-foreground">
                <Home className="h-4 w-4" />
                <span className="sr-only">Home</span>
            </Link>
        </li>
        {/* If we are on the homepage, show "Kalender" */}
        {path === '/' && (
             <li className="flex items-center">
                <ChevronRight className="h-4 w-4 shrink-0" />
                <span className="ml-1 truncate font-medium text-foreground" aria-current="page">
                    Kalender
                </span>
             </li>
        )}
        {segments.map((segment, index) => {
            const isLast = index === segments.length - 1;
            const href = `/${segments.slice(0, index + 1).join('/')}`;
            let displayText = formatSegment(segment);

            // Don't show breadcrumb for the root path if it's the only segment
            if (path !== '/' && href === '/') return null;


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
