
'use client';

import Link from 'next/link';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { CalendarDays, FilePenLine, BookText } from 'lucide-react';

export function MobileAwareSidebarMenu() {
  const { setOpenMobile } = useSidebar();

  const handleMenuClick = () => {
    setOpenMobile(false);
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem onClick={handleMenuClick}>
        <SidebarMenuButton asChild size="lg">
          <Link href="/">
            <CalendarDays />
            Kalender
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem onClick={handleMenuClick}>
        <SidebarMenuButton asChild size="lg">
          <Link href="/report">
            <FilePenLine />
            Buat Laporan
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem onClick={handleMenuClick}>
        <SidebarMenuButton asChild size="lg">
          <Link href="/panduan">
            <BookText />
            Panduan
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
