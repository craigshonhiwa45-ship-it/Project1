import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

export default function StudyInviteDialog({ open, onOpenChange, me, buddy, onSent }) {
  const [groupSize, setGroupSize] = useState(2);
  const [when, setWhen] = useState('');
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const send = async () => {
    if (!me || !buddy) return;
    setSending(true);
    await base44.entities.StudyInvite.create({
      from_id: me.id,
      to_id: buddy.id,
      group_size: Math.max(1, Number(groupSize) || 2),
      when: when ? new Date(when).toISOString() : '',
      place: place.trim(),
      note: note.trim(),
      status: 'pending',
    });
    setSending(false);
    setWhen('');
    setPlace('');
    setNote('');
    onOpenChange(false);
    toast({ title: 'Study invite sent!', description: `${buddy.full_name || 'Your buddy'} will see it in their invites.` });
    onSent?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" /> Invite {buddy?.full_name || 'buddy'} to study
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground">People in the group (including you)</Label>
            <Input
              type="number" min="1" max="20"
              value={groupSize}
              onChange={(e) => setGroupSize(e.target.value)}
              className="rounded-2xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground">When</Label>
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="rounded-2xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground">Where</Label>
            <Input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Library, room B…" className="rounded-2xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground">Note</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What are you working on?" className="min-h-[60px] rounded-2xl" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" className="rounded-full" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="rounded-full" disabled={sending} onClick={send}>
            {sending ? 'Sending…' : 'Send invite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}