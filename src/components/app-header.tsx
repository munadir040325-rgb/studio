'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Breadcrumbs } from './breadcrumbs';
import { CalendarDays } from 'lucide-react';
import Link from 'next/link';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <SidebarTrigger className="md:hidden" />
      
      {/* Mobile Header Title */}
      <div className="flex items-center gap-2 md:hidden">
        <Link href="/calendar" className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Calendar Manager</span>
        </Link>
      </div>

      <Breadcrumbs />
    </header>
  );
}
