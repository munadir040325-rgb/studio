'use client';

import { useSidebar } from '@/components/ui/sidebar';

export function MobileSidebarHeader() {
  const { isMobile } = useSidebar();

  if (!isMobile) {
    return null;
  }

  return (
    <div className="flex md:hidden items-center p-4 border-b">
        <h2 className="text-lg font-semibold">Menu</h2>
    </div>
  );
}
