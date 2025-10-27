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
    'calendar': 'Kalender',
    'upload': 'Upload Lampiran',
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
  
  useEffect(() => {
      setSegments(path.split('/').filter(Boolean));
  }, [path]);


  // Handle case where root is /calendar
  const breadcrumbSegments = segments.length > 0 ? segments : ['calendar'];


  return (
    <nav aria-label="Breadcrumb" className="hidden flex-1 md:flex">
      <ol className="flex min-w-0 flex-1 items-center space-x-1 whitespace-nowrap text-sm text-muted-foreground">
        <li>
            <Link href="/calendar" className="hover:text-foreground">
                <Home className="h-4 w-4" />
                <span className="sr-only">Home</span>
            </Link>
        </li>
        {breadcrumbSegments.map((segment, index) => {
            const isLast = index === breadcrumbSegments.length - 1;
            const href = `/${breadcrumbSegments.slice(0, index + 1).join('/')}`;

            // If it's the first segment and it's 'calendar', it's the home page.
            if (segment === 'calendar' && index === 0) {
                 // If it's the only segment, show its name next to home icon.
                 if (breadcrumbSegments.length === 1) {
                     return (
                         <li key={segment} className="flex items-center">
                            <ChevronRight className="h-4 w-4 shrink-0" />
                            <span
                                className="ml-1 truncate font-medium text-foreground"
                                aria-current="page"
                            >
                                {formatSegment(segment)}
                            </span>
                         </li>
                     )
                 }
                 // Otherwise, don't render anything, the home icon is enough.
                 return null;
            }

            let displayText = formatSegment(segment);

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
