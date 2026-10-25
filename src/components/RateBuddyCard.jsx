import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export default function RateBuddyCard({ session, otherName, onRated }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const rate = async () => {
    if (!stars) return;
    setSaving(true);
    await base44.entities.Rating.create({
      session_id: session.id,
      rater_id: session.meId,
      rated_id: session.otherId,
      stars,
      comment: comment.trim(),
    });
    setSaving(false);
    onRated?.();
  };

  return (
    <div className="rounded-3xl border border-accent/40 bg-accent/5 p-4">
      <p className="text-sm font-bold">How was studying with {otherName}?</p>
      <p className="text-xs text-muted-foreground">Session on {session.happened_on} · {session.duration_minutes} min</p>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} onClick={() => setStars(s)} className="rounded-full p-1 transition hover:scale-110">
            <Star className={cn('h-6 w-6', s <= stars ? 'fill-accent text-accent' : 'text-muted-foreground/30')} />
          </button>
        ))}
      </div>
      {stars > 0 && (
        <div className="mt-2 space-y-2">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional: how did it go?"
            className="min-h-[50px] rounded-2xl bg-card text-sm"
          />
          <Button size="sm" className="rounded-full" disabled={saving} onClick={rate}>
            {saving ? 'Saving…' : 'Submit rating'}
          </Button>
        </div>
      )}
    </div>
  );
}