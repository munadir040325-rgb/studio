'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Fragment } from 'react';

// Fungsi untuk mengubah segmen path menjadi judul yang mudah dibaca
const formatSegment = (segment: string) => {
  if (!segment) return 'Home';
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="hidden flex-1 md:flex">
      <ol className="flex items-center space-x-1 text-sm text-muted-foreground">
        <li>
          <Link href="/dashboard" className="hover:text-foreground">
            {formatSegment('')}
          </Link>
        </li>
        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join('/')}`;
          const isLast = index === segments.length - 1;

          // Jangan render breadcrumb untuk 'new', 'edit', dll.
          if (['new', 'edit'].includes(segment)) {
            return null;
          }

          return (
            <Fragment key={href}>
              <li className="flex items-center">
                <ChevronRight className="h-4 w-4" />
                <Link
                  href={href}
                  className={`ml-1 ${isLast ? 'font-medium text-foreground' : 'hover:text-foreground'}`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {formatSegment(segment)}
                </Link>
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
