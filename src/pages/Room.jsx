import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check, UserPlus, Users, Video } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import BuddyAvatar from '@/components/BuddyAvatar';
import ChatComposer from '@/components/ChatComposer';
import MessageAttachment from '@/components/MessageAttachment';
import RoomCall from '@/components/RoomCall';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { timeAgo } from '@/lib/studybuddy';
import { cn } from '@/lib/utils';

export default function Room() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [room, setRoom] = useState(null);
  const [convo, setConvo] = useState(null);
  const [users, setUsers] = useState({});
  const [messages, setMessages] = useState([]);
  const [friendIds, setFriendIds] = useState([]);
  const [copied, setCopied] = useState(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    const current = await base44.auth.me();
    setMe(current);
    const rPage = await base44.entities.StudyRoom.filter({ code });
    const found = (rPage.items || rPage)[0];
    if (!found) return;
    setRoom(found);
    const [uPage, cPage, mine, theirs] = await Promise.all([
      base44.entities.User.filter({}),
      base44.entities.Conversation.filter({ room_id: found.id }),
      base44.entities.Friendship.filter({ requester_id: current.id, status: 'accepted' }),
      base44.entities.Friendship.filter({ addressee_id: current.id, status: 'accepted' }),
    ]);
    setUsers(Object.fromEntries((uPage.items || uPage).map((u) => [u.id, u])));
    setConvo((cPage.items || cPage)[0] || null);
    setFriendIds([...mine.map((f) => f.addressee_id), ...theirs.map((f) => f.requester_id)]);
  }, [code]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!convo || !room) return;
    let unsub;
    (async () => {
      try {
        const page = await base44.entities.Message.filter({ conversation_id: convo.id }, { sort: 'created_date', limit: 200 });
        setMessages(Array.isArray(page) ? page : page.items || []);
      } catch { /* keep empty */ }
      try {
        unsub = base44.entities.Message.subscribe((event) => {
          const m = event && event.data;
          if (!m || m.conversation_id !== convo.id) return;
          setMessages((ms) => (ms.some((x) => x.id === m.id) ? ms.map((x) => (x.id === m.id ? m : x)) : [...ms, m]));
        });
      } catch { /* realtime unavailable */ }
    })();
    return () => unsub?.();
  }, [convo, room]);

  const send = async (text, attachments) => {
    if (!convo) return;
    try {
      const res = await base44.functions.invoke('sendMessage', { conversation_id: convo.id, text, attachments: attachments || [] });
      const saved = res?.data?.message;
      if (saved) setMessages((ms) => (ms.some((m) => m.id === saved.id) ? ms.map((m) => (m.id === saved.id ? saved : m)) : [...ms, saved]));
    } catch (err) {
      toast({
        title: 'Message not sent',
        description: err?.response?.data?.error || 'Could not send your message. Try again.',
        variant: 'destructive',
      });
    }
  };

  const copy = async (text, key) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const inviteFriend = async (friendId) => {
    if (room.member_ids.includes(friendId)) return;
    await base44.entities.StudyRoom.update(room.id, { member_ids: [...room.member_ids, friendId] });
    if (convo && !convo.member_ids.includes(friendId)) {
      await base44.entities.Conversation.update(convo.id, { member_ids: [...convo.member_ids, friendId] });
    }
    toast({ title: 'Invited!', description: `${users[friendId]?.full_name || 'Your buddy'} can now join this room.` });
    load();
  };

  if (!me) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="space-y-4 pb-6 text-center">
        <p className="rounded-3xl border border-dashed border-border bg-card p-8 text-sm text-muted-foreground">
          Room not found. Check the code and try again.
        </p>
        <Button asChild><Link to="/rooms">Back to rooms</Link></Button>
      </div>
    );
  }

  const otherMembers = (room.member_ids || []).filter((id) => id !== me.id);
  const invitables = friendIds.filter((id) => !room.member_ids.includes(id));

  return (
    <div className="space-y-4 pb-6">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate('/rooms')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-heading text-lg font-extrabold">{room.title}</h1>
          <p className="text-xs text-muted-foreground">Code {room.code}</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => copy(`${window.location.origin}/room/${room.code}`, 'link')}>
          {copied === 'link' ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />} Link
        </Button>
      </header>

      <RoomCall room={room} me={me} otherMembers={otherMembers} />

      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <Users className="h-4 w-4" /> Room chat
          </h2>
          <span className="text-[11px] text-muted-foreground">{room.member_ids.length} member{room.member_ids.length === 1 ? '' : 's'}</span>
        </div>
        {invitables.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-3xl border border-border bg-card p-3">
            <span className="text-[11px] font-semibold text-muted-foreground">Invite buddies:</span>
            {invitables.slice(0, 6).map((id) => (
              <button
                key={id}
                onClick={() => inviteFriend(id)}
                className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold transition hover:border-primary/40 hover:text-primary"
              >
                <UserPlus className="h-3 w-3" /> {users[id]?.full_name || 'Buddy'}
              </button>
            ))}
          </div>
        )}
        <div className="max-h-[45vh] space-y-2.5 overflow-y-auto rounded-3xl border border-border bg-card p-3">
          {messages.map((m) => {
            const mine = m.sender_id === me.id;
            return (
              <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[85%] rounded-3xl px-3.5 py-2 text-sm shadow-sm', mine ? 'rounded-br-lg bg-primary text-primary-foreground' : 'rounded-bl-lg bg-muted text-foreground')}>
                  {!mine && <p className="mb-0.5 text-[11px] font-bold text-secondary">{m.sender_name || 'Buddy'}</p>}
                  {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                  {(m.attachments || []).length > 0 && (
                    <div className={cn('mt-1.5 space-y-1.5', !m.text && 'mt-0')}>
                      {m.attachments.map((a, i) => <MessageAttachment key={i} attachment={a} />)}
                    </div>
                  )}
                  <p className={cn('mt-0.5 text-right text-[10px]', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                    {timeAgo(m.created_date)}
                  </p>
                </div>
              </div>
            );
          })}
          {messages.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Room chat is quiet — say hello!</p>
          )}
        </div>
        <div className="mt-2 overflow-hidden rounded-3xl border border-border bg-card">
          <ChatComposer onSend={send} placeholder="Message the room…" />
        </div>
      </section>
    </div>
  );
}