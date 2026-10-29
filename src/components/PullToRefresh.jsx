import { useRef, useState } from 'react';
import { ArrowDown, Loader2 } from 'lucide-react';

const THRESHOLD = 64;
const MAX_PULL = 108;

/**
 * Touch pull-to-refresh for the app shell.
 * Pulling down from the top of the page reveals an indicator; releasing past
 * the threshold runs `onRefresh` (usually a remount of the current page).
 */
export default function PullToRefresh({ onRefresh, children }) {
  const startY = useRef(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const atTop = () => (window.scrollY || document.documentElement.scrollTop || 0) <= 0;

  const handleStart = (event) => {
    if (refreshing) return;
    startY.current = atTop() ? event.touches[0].clientY : null;
  };

  const handleMove = (event) => {
    if (startY.current == null || refreshing) return;
    const delta = event.touches[0].clientY - startY.current;
    if (delta <= 0 || !atTop()) {
      startY.current = null;
      setPull(0);
      return;
    }
    setPull(Math.min(MAX_PULL, delta * 0.5));
  };

  const handleEnd = async () => {
    if (startY.current == null) return;
    startY.current = null;
    if (pull < THRESHOLD) {
      setPull(0);
      return;
    }
    setRefreshing(true);
    setPull(THRESHOLD);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
      setPull(0);
    }
  };

  return (
    <div onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd} onTouchCancel={handleEnd}>
      <div className="flex items-center justify-center overflow-hidden" style={{ height: pull }}>
        {refreshing ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <ArrowDown
            className="h-5 w-5 text-muted-foreground transition-transform"
            style={{ transform: `rotate(${pull >= THRESHOLD ? 180 : 0}deg)` }}
          />
        )}
      </div>
      {children}
    </div>
  );
}