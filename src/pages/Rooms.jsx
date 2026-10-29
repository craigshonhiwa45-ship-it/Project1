import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, LogIn, Copy, Check, Users, Video } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { timeAgo } from '@/lib/studybuddy';

const makeCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export default function Rooms() {
  const [me, setMe] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [title, setTitle] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const load = useCallback(async () => {
    const current = await base44.auth.me();
    setMe(current);
    const page = await base44.entities.StudyRoom.filter({ member_ids: current.id });
    setRooms((page.items || page).sort((a, b) => (b.updated_date || b.created_date || '').localeCompare(a.updated_date || a.created_date || '')));
  }, []);

  useEffect(() => { load(); }, [load]);

  const createRoom = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      const room = await base44.entities.StudyRoom.create({
        code: makeCode(),
        title: title.trim(),
        member_ids: [me.id],
        is_active: true,
      });
      await base44.entities.Conversation.create({
        type: 'group',
        title: room.title,
        member_ids: [me.id],
        room_id: room.id,
      });
      setTitle('');
      navigate(`/room/${room.code}`);
    } finally {
      setBusy(false);
    }
  };

  const joinRoom = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code || busy) return;
    setBusy(true);
    try {
      const page = await base44.entities.StudyRoom.filter({ code });
      const room = (page.items || page)[0];
      if (!room) {
        toast({ title: 'Room not found', description: 'Check the code and try again.', variant: 'destructive' });
        return;
      }
      if (!room.member_ids.includes(me.id)) {
        await base44.entities.StudyRoom.update(room.id, { member_ids: [...room.member_ids, me.id] });
        const cPage = await base44.entities.Conversation.filter({ room_id: room.id });
        const convo = (cPage.items || cPage)[0];
        if (convo && !convo.member_ids.includes(me.id)) {
          await base44.entities.Conversation.update(convo.id, { member_ids: [...convo.member_ids, me.id] });
        }
      }
      setJoinCode('');
      navigate(`/room/${room.code}`);
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text, key) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-5 pb-6">
      <header>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">Online study rooms</h1>
        <p className="mt-1 text-sm text-muted-foreground">Study together over voice, video and screen share.</p>
      </header>

      <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
        <p className="flex items-center gap-2 text-sm font-bold"><Plus className="h-4 w-4 text-primary" /> Create a room</p>
        <div className="mt-2.5 flex gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createRoom()}
            placeholder="e.g. CS201 exam cram"
            className="rounded-2xl"
          />
          <Button className="rounded-2xl" onClick={createRoom} disabled={busy || !title.trim()}>Create</Button>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
        <p className="flex items-center gap-2 text-sm font-bold"><LogIn className="h-4 w-4 text-secondary" /> Join with a code</p>
        <div className="mt-2.5 flex gap-2">
          <Input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
            placeholder="e.g. K7Q2XD"
            className="rounded-2xl uppercase tracking-widest"
          />
          <Button className="rounded-2xl" variant="outline" onClick={joinRoom} disabled={busy || !joinCode.trim()}>Join</Button>
        </div>
      </div>

      <section>
        <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Your rooms</h2>
        <div className="space-y-2">
          {rooms.map((room) => (
            <div key={room.id} className="rounded-3xl border border-border bg-card p-3.5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Video className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{room.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Code {room.code} · {(room.member_ids || []).length} member{(room.member_ids || []).length === 1 ? '' : 's'}
                  </p>
                </div>
                <Button size="sm" variant="ghost" className="min-h-[44px] min-w-[44px] rounded-full px-2" onClick={() => copy(room.code, room.id)} aria-label="Copy room code">
                  {copied === room.id ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button size="sm" className="min-h-[44px] shrink-0 rounded-full px-3" onClick={() => navigate(`/room/${room.code}`)}>Open</Button>
              </div>
              <button
                onClick={() => copy(`${window.location.origin}/room/${room.code}`, room.id + 'link')}
                className="mt-2 flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {copied === room.id + 'link' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied === room.id + 'link' ? 'Link copied!' : 'Copy invite link'}
              </button>
            </div>
          ))}
          {rooms.length === 0 && (
            <p className="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No rooms yet — create one above or join a buddy's room with their code.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}