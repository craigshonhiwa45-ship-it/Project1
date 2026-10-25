import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export default function EditProfileDialog({ open, onOpenChange, me, onSaved }) {
  const [form, setForm] = useState({ university: '', course: '', year: '1', gender: 'prefer not to say', bio: '', modules: '', hide_social: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && me) {
      setForm({
        university: me.university || '',
        course: me.course || '',
        year: String(me.year || '1'),
        gender: me.gender || 'prefer not to say',
        bio: me.bio || '',
        modules: (me.modules || []).join(', '),
        hide_social: !!me.hide_social,
      });
    }
  }, [open, me]);

  const save = async () => {
    setSaving(true);
    const modules = form.modules.split(',').map((m) => m.trim()).filter(Boolean);
    await base44.auth.updateMe({
      university: form.university.trim(),
      course: form.course.trim(),
      year: Number(form.year),
      gender: form.gender,
      bio: form.bio.trim(),
      modules,
      hide_social: form.hide_social,
    });
    setSaving(false);
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading">Edit study profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground">University</Label>
            <Input
              value={form.university}
              onChange={(e) => setForm({ ...form, university: e.target.value })}
              placeholder="e.g. University of Botswana"
              className="rounded-2xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground">Course</Label>
            <Input
              value={form.course}
              onChange={(e) => setForm({ ...form, course: e.target.value })}
              placeholder="e.g. BSc Computer Science"
              className="rounded-2xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Year of study</Label>
              <Select value={form.year} onValueChange={(v) => setForm({ ...form, year: v })}>
                <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((y) => (
                    <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Gender</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer not to say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground">Modules (comma separated)</Label>
            <Input
              value={form.modules}
              onChange={(e) => setForm({ ...form, modules: e.target.value })}
              placeholder="CS201 Algorithms, STA202 Statistics"
              className="rounded-2xl"
            />
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold">Private buddy list</p>
              <p className="text-[11px] text-muted-foreground">Others see your StudyBuddies count only.</p>
            </div>
            <Switch checked={form.hide_social} onCheckedChange={(v) => setForm({ ...form, hide_social: v })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground">Bio</Label>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Tell buddies how you like to study…"
              className="min-h-[70px] rounded-2xl"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" className="rounded-full" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="rounded-full" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save profile'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}