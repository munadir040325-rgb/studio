'use client';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  CalendarDays,
  FolderKanban,
  FileCheck2,
  PieChart,
  User,
  Fingerprint,
  Newspaper,
} from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const logo = PlaceHolderImages.find((img) => img.id === 'logo');

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            {logo && (
              <Image
                src={logo.imageUrl}
                width={32}
                height={32}
                alt="App Logo"
                className="rounded-md"
                data-ai-hint={logo.imageHint}
              />
            )}
            <h1 className="text-lg font-bold">SPPD Manager</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Dashboard"
              >
                <Link href="/dashboard">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Calendar"
              >
                <Link href="/calendar">
                  <CalendarDays />
                  <span>Kalender</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            {/* SPPD Section */}
            <SidebarMenuItem>
              <div className='flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm text-muted-foreground'>
                  <FileText />
                  <span>SPPD</span>
              </div>
            </SidebarMenuItem>
            <div className="pl-6">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Kelola">
                            <Link href="/sppd">
                                <FolderKanban />
                                <span>Kelola</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="SPJ">
                            <Link href="#">
                                <FileCheck2 />
                                <span>SPJ</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Rekap">
                            <Link href="/reports">
                                <PieChart />
                                <span>Rekap</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </div>

            {/* Master Section */}
            <SidebarMenuItem>
               <div className='flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm text-muted-foreground'>
                    <Users />
                    <span>Master</span>
                </div>
            </SidebarMenuItem>
            <div className="pl-6">
                 <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Pegawai">
                            <Link href="/master-data">
                                <User />
                                <span>Pegawai</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Tanda Tangan">
                            <Link href="/master-data?tab=signatures">
                                <Fingerprint />
                                <span>Tanda Tangan</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Kop Surat">
                            <Link href="/master-data?tab=letterheads">
                                <Newspaper />
                                <span>Kop Surat</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                 </SidebarMenu>
            </div>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Settings"
              >
                <Link href="/settings">
                  <Settings />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
