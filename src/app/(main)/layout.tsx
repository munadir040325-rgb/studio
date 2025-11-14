import type { Metadata } from 'next';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
} from '@/components/ui/sidebar';
import {
  CalendarDays,
} from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import { MobileSidebarHeader } from '@/components/mobile-sidebar-header';
import { MobileAwareSidebarMenu } from '@/components/mobile-aware-sidebar-menu';


export default function MainAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <div className="hidden md:flex items-center gap-2 p-2">
              <CalendarDays className="w-7 h-7 text-primary" />
              <span className="text-lg font-semibold">
                <span>Calendar Manager</span>
              </span>
            </div>
              <MobileSidebarHeader />
          </SidebarHeader>
          <SidebarContent>
            <MobileAwareSidebarMenu />
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <AppHeader />
          <main className="p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
  );
}
