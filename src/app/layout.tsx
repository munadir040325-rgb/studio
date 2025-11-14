import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
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

export const metadata: Metadata = {
  title: 'Calendar Manager',
  description: 'Aplikasi Kalender Jadwal Kegiatan dan Upload Lampirannya',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
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
        <Toaster />
      </body>
    </html>
  );
}
