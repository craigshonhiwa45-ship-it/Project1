import { Link } from 'react-router-dom';
import BackButton from '@/components/BackButton';

export default function LegalPage({ title, updated, children }) {
  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-2">
        <BackButton fallbackTo="/profile" label="Back to profile" />
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">{title}</h1>
      </div>

      <article className="space-y-4 rounded-3xl border border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground shadow-sm">
        {updated && <p className="text-xs font-bold uppercase tracking-wide">Last updated {updated}</p>}
        {children}
      </article>

      <div className="flex flex-wrap gap-x-4 gap-y-2 px-1 text-xs font-semibold">
        <Link to="/safety" className="text-primary hover:underline">Community guidelines</Link>
        <Link to="/privacy" className="text-primary hover:underline">Privacy policy</Link>
        <Link to="/terms" className="text-primary hover:underline">Terms of service</Link>
        <Link to="/feedback" className="text-primary hover:underline">Contact us</Link>
      </div>
    </div>
  );
}