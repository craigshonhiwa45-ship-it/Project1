import { useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Compass, Newspaper, MessageCircle, LayoutDashboard, User, Video } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Discover', path: '/', icon: Compass },
  { label: 'Feed', path: '/feed', icon: Newspaper },
  { label: 'Rooms', path: '/rooms', icon: Video },
  { label: 'Chat', path: '/chat', icon: MessageCircle },
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Profile', path: '/profile', icon: User },
];

export default function AppLayout() {
  const { pathname } = useLocation();

  // One anonymous usage ping per browser session for the admin dashboard.
  useEffect(() => {
    if (sessionStorage.getItem('sb_visit_logged')) return;
    sessionStorage.setItem('sb_visit_logged', '1');
    base44.auth.me()
      .then((u) => { if (u) return base44.entities.Activity.create({ action: 'visit' }); })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="mx-auto w-full max-w-xl px-4 pt-6">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-lg shadow-[0_-4px_24px_rgba(15,60,60,0.08)]">
        <div className="mx-auto flex max-w-xl items-stretch justify-between px-2 py-2">
          {tabs.map((tab) => {
            const active = tab.path === '/' ? pathname === '/' : pathname.startsWith(tab.path);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-semibold transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full transition-all',
                    active ? 'bg-primary/10 scale-105' : ''
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                </span>
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}