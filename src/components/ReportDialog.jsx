import { useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function ReportDialog({ open, onOpenChange, meId, reportedId, reportedName, conversationId }) {
  const [reason, setReason] = useState('harassment');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const submit = async () => {
    setSending(true);
    try {
      await base44.entities.Report.create({
        reporter_id: meId,
        reported_id: reportedId,
        conversation_id: conversationId || '',
        reason,
        details: details.trim(),
        status: 'open',
      });
      onOpenChange(false);
      setDetails('');
      toast({ title: 'Report sent', description: 'Thank you — our team will review this conversation.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading">Report {reportedName || 'this user'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">What is happening?</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="harassment">Harassment or bullying</SelectItem>
                <SelectItem value="inappropriate content">Inappropriate content</SelectItem>
                <SelectItem value="spam">Spam or scam</SelectItem>
                <SelectItem value="other">Something else</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">Details (optional)</label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Tell us what happened…"
              className="min-h-[80px] rounded-2xl"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" className="rounded-full" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="rounded-full" disabled={sending} onClick={submit}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
            Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}