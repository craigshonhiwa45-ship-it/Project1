import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PROMPT_INTERVAL_DAYS = 14;

export default function RatingPrompt({ me }) {
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!me) return;
    const last = me.last_rating_prompt ? new Date(me.last_rating_prompt) : null;
    const due = !last || Date.now() - last.getTime() > PROMPT_INTERVAL_DAYS * 86400000;
    if (due) setOpen(true);
  }, [me]);

  const submit = async (given) => {
    if (sending) return;
    setSending(true);
    try {
      if (given >= 1) {
        await base44.entities.AppRating.create({ stars: given, comment: comment.trim() });
      }
      await base44.auth.updateMe({ last_rating_prompt: new Date().toISOString() });
    } finally {
      setSending(false);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) submit(0); }}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading">How is Studybuddy treating you?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Rate the app — it takes 10 seconds and helps the team improve.</p>
        <div className="flex justify-center gap-1.5 py-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setStars(n)}
              aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
              className="transition hover:scale-110"
            >
              <Star className={cn('h-9 w-9', n <= stars ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40')} />
            </button>
          ))}
        </div>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Anything you'd like to tell us? (optional)"
          className="min-h-[70px] rounded-2xl"
        />
        <DialogFooter>
          <Button variant="ghost" className="rounded-full" onClick={() => submit(0)} disabled={sending}>Maybe later</Button>
          <Button className="rounded-full" onClick={() => submit(stars)} disabled={sending || stars < 1}>Send rating</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}