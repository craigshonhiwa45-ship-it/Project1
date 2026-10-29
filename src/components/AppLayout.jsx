import { useEffect, useRef, useState } from 'react';
import { useOutlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Compass, Newspaper, MessageCircle, LayoutDashboard, User, Video } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import PullToRefresh from '@/components/PullToRefresh';

const tabs = [
  { label: 'Discover', path: '/', icon: Compass },
  { label: 'Feed', path: '/feed', icon: Newspaper },
  { label: 'Rooms', path: '/rooms', icon: Video },
  { label: 'Chat', path: '/chat', icon: MessageCircle },
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Profile', path: '/profile', icon: User },
];

const tabRootOf = (pathname) =>
  tabs.find((t) => (t.path === '/' ? pathname === '/' : pathname.startsWith(t.path)))?.path || '/';

export default function AppLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const outlet = useOutlet();
  const stacks = useRef({});
  const [refreshKey, setRefreshKey] = useState(0);

  // One anonymous usage ping per browser session for the admin dashboard.
  useEffect(() => {
    if (sessionStorage.getItem('sb_visit_logged')) return;
    sessionStorage.setItem('sb_visit_logged', '1');
    base44.auth.me()
      .then((u) => { if (u) return base44.entities.Activity.create({ action: 'visit' }); })
      .catch(() => {});
  }, []);

  const currentRoot = tabRootOf(pathname);

  // Each tab remembers where you were inside it, so switching tabs keeps your place.
  const handleTabClick = (event, tab) => {
    if (tab.path === currentRoot) {
      stacks.current[tab.path] = [];
      if (pathname !== tab.path) {
        event.preventDefault();
        navigate(tab.path);
      }
      return;
    }
    event.preventDefault();
    if (pathname !== currentRoot) {
      const stack = stacks.current[currentRoot] || (stacks.current[currentRoot] = []);
      stack.push(pathname);
    }
    const saved = stacks.current[tab.path] || [];
    navigate(saved[saved.length - 1] || tab.path);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <main
        className="mx-auto w-full max-w-xl px-4"
        style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}
      >
        <PullToRefresh onRefresh={() => setRefreshKey((k) => k + 1)}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${pathname}-${refreshKey}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </PullToRefresh>
      </main>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-lg shadow-[0_-4px_24px_rgba(15,60,60,0.08)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex max-w-xl items-stretch justify-between px-2 py-1.5">
          {tabs.map((tab) => {
            const active = tab.path === currentRoot;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                role="tab"
                aria-current={active ? 'page' : undefined}
                aria-selected={active}
                onClick={(event) => handleTabClick(event, tab)}
                className={cn(
                  'flex min-h-11 flex-1 select-none flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-xs font-semibold transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-full transition-all',
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