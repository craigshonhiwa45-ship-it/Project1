import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Stack-based back navigation. Goes to the previous screen; if the app was
 * opened straight onto this page (no history), it falls back to `fallbackTo`.
 */
export default function BackButton({ fallbackTo = '/', label = 'Go back', className }) {
  const navigate = useNavigate();

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(fallbackTo);
  };

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={label}
      className={cn(
        'inline-flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95 active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className
      )}
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}