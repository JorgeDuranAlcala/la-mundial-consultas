import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AuroraBackground } from '@/components/layout/AuroraBackground';
import { SideNav } from '@/components/layout/SideNav';
import { TopBarActions } from '@/components/layout/TopBarActions';
import { cn } from '@/lib/utils';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

const SIDEBAR_KEY = 'logistika_sidebar_collapsed';

export function AppLayout() {
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem(SIDEBAR_KEY) === 'true');
  useSessionTimeout();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, String(isCollapsed));
  }, [isCollapsed]);

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />
      <SideNav isCollapsed={isCollapsed} onToggle={() => setIsCollapsed((v) => !v)} />
      <TopBarActions />
      <main
        className={cn(
          'relative min-h-screen transition-all duration-300',
          isCollapsed ? 'md:ml-20' : 'md:ml-64',
        )}
      >
        <div className="mx-auto max-w-[1400px] flex-1 px-6 pt-14 pb-10 md:px-10 md:pt-16">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
