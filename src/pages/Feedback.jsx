import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, ShieldCheck, FileQuestion, Lightbulb, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const types = [
  { id: 'complaint', label: 'Complaint', icon: Bug },
  { id: 'suggestion', label: 'Suggestion', icon: Lightbulb },
  { id: 'question', label: 'Question', icon: FileQuestion },
];

export default function Feedback() {
  const [type, setType] = useState('complaint');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    await base44.entities.Feedback.create({ type, subject: subject.trim(), message: message.trim() });
    setSent(true);
  };

  if (sent) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-3 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="h-8 w-8" />
        </span>
        <h1 className="font-heading text-xl font-extrabold">Thank you!</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          Your message is with the Studybuddy team. We take every report seriously and will follow up if we need more detail.
        </p>
        <Button variant="outline" className="mt-2 rounded-full" onClick={() => { setSent(false); setSubject(''); setMessage(''); }}>
          Send another
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <header>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">Feedback & complaints</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tell the Studybuddy team what is working — and what is not.</p>
      </header>

      <form onSubmit={submit} className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="grid grid-cols-3 gap-2">
          {types.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setType(t.id)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-xs font-semibold transition',
                type === t.id ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'
              )}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground">Subject</label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What is it about?" className="rounded-2xl" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground">Message</label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Give us as much detail as you can…" className="min-h-[120px] rounded-2xl" required />
        </div>
        <Button type="submit" className="w-full rounded-full">
          <Send className="h-4 w-4" /> Send to the team
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Reports about another user may lead to a review of their account.
        </p>
      </form>
    </div>
  );
}