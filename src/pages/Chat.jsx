import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MoreVertical, Flag, Ban, EyeOff, Eye, Trash2, UserPlus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import BuddyAvatar from '@/components/BuddyAvatar';
import BackButton from '@/components/BackButton';
import ChatComposer from '@/components/ChatComposer';
import MessageAttachment from '@/components/MessageAttachment';
import ReportDialog from '@/components/ReportDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { timeAgo, fetchFriendships, buddyIdsFrom } from '@/lib/studybuddy';

const REQUEST_LIMIT = 3;

export default function Chat() {
  const { conversationId } = useParams();
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState({});
  const [convos, setConvos] = useState([]);
  const [friendIds, setFriendIds] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [tab, setTab] = useState('chats');
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [showRestricted, setShowRestricted] = useState(false);
  const [reporting, setReporting] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    const current = await base44.auth.me();
    setMe(current);
    const [uPage, cPage, friendships, myBlocks] = await Promise.all([
      base44.entities.User.filter({}),
      base44.entities.Conversation.filter({ member_ids: current.id }),
      fetchFriendships(current.id),
      base44.entities.Block.filter({ blocker_id: current.id }),
    ]);
    setUsers(Object.fromEntries((uPage.items || uPage).map((u) => [u.id, u])));
    setConvos((cPage.items || cPage).sort((a, b) => (b.updated_date || '').localeCompare(a.updated_date || '')));
    setFriendIds(buddyIdsFrom(friendships, current.id));
    setBlocks(myBlocks);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!conversationId || !me) return;
    let unsub;
    let cancelled = false;
    (async () => {
      let convo;
      try {
        convo = await base44.entities.Conversation.get(conversationId);
      } catch {
        if (!cancelled) setActive(null);
        return;
      }
      if (cancelled) return;
      setActive(convo);
      try {
        const page = await base44.entities.Message.filter({ conversation_id: conversationId }, { sort: 'created_date', limit: 200 });
        if (!cancelled) setMessages(Array.isArray(page) ? page : page.items || []);
      } catch { /* keep empty */ }
      try {
        unsub = base44.entities.Message.subscribe((event) => {
          const m = event && event.data;
          if (!m || m.conversation_id !== conversationId) return;
          setMessages((ms) => (ms.some((x) => x.id === m.id) ? ms.map((x) => (x.id === m.id ? m : x)) : [...ms, m]));
        });
      } catch { /* realtime unavailable */ }
    })();
    return () => { cancelled = true; unsub?.(); };
  }, [conversationId, me]);

  const isFriend = (id) => friendIds.includes(id);
  const nameIn = (convo) => {
    const others = (convo.member_ids || []).filter((mid) => mid !== me?.id).map((mid) => users[mid]?.full_name || 'Buddy');
    return convo.type === 'group' ? convo.title || 'Study group' : others[0] || 'Buddy';
  };

  const isRequestConvo = (convo) => {
    if (convo.type !== 'direct' || !me) return false;
    const others = (convo.member_ids || []).filter((mid) => mid !== me.id);
    return others.some((id) => !isFriend(id));
  };
  const requestConvos = convos.filter((c) => isRequestConvo(c) && c.id !== active?.id);
  const chatConvos = convos.filter((c) => !isRequestConvo(c));

  const send = async (text, attachments) => {
    if (!active) return;
    // Show the bubble immediately, marked as sending.
    const tempId = `pending-${Date.now()}`;
    const draft = {
      id: tempId,
      conversation_id: active.id,
      sender_id: me.id,
      sender_name: me.full_name,
      member_ids: active.member_ids,
      text,
      attachments: attachments || [],
      created_date: new Date().toISOString(),
      pending: true,
    };
    setMessages((ms) => [...ms, draft]);
    try {
      const res = await base44.functions.invoke('sendMessage', {
        conversation_id: active.id,
        text,
        attachments: attachments || [],
      });
      const saved = res?.data?.message;
      setMessages((ms) => {
        const withoutDraft = ms.filter((m) => m.id !== tempId);
        if (!saved) return withoutDraft;
        return withoutDraft.some((m) => m.id === saved.id)
          ? withoutDraft.map((m) => (m.id === saved.id ? saved : m))
          : [...withoutDraft, saved];
      });
    } catch (err) {
      setMessages((ms) => ms.filter((m) => m.id !== tempId));
      toast({
        title: 'Message not sent',
        description: err?.response?.data?.error || 'Could not send your message. Try again.',
        variant: 'destructive',
      });
    }
  };

  const deleteMessage = async (m) => {
    try {
      await base44.entities.Message.delete(m.id);
      setMessages((ms) => ms.filter((x) => x.id !== m.id));
      toast({ title: 'Message deleted' });
    } catch {
      toast({ title: 'Could not delete this message', variant: 'destructive' });
    }
  };

  const addBack = async (otherId) => {
    await base44.entities.Friendship.create({ requester_id: me.id, addressee_id: otherId, status: 'accepted' });
    toast({ title: 'Study buddy added!', description: 'Chat is now open — no more message limits.' });
    load();
  };

  const setBlock = async (otherId, kind, on) => {
    const existing = blocks.find((b) => b.blocked_id === otherId && b.kind === kind);
    if (on && existing) return;
    if (!on && existing) {
      await base44.entities.Block.delete(existing.id);
      toast({ title: kind === 'blocked' ? 'Unblocked' : 'Restriction lifted' });
    } else {
      await base44.entities.Block.create({ blocker_id: me.id, blocked_id: otherId, kind });
      toast({
        title: kind === 'blocked' ? 'User blocked' : 'User restricted',
        description: kind === 'blocked'
          ? 'They can no longer message you anywhere on Studybuddy.'
          : 'Their messages will be hidden by default in your chats.',
      });
    }
    load();
  };

  if (!me) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (active && conversationId) {
    const otherId = (active.member_ids || []).find((mid) => mid !== me.id);
    const otherName = users[otherId]?.full_name || nameIn(active);
    const blockRec = blocks.find((b) => b.blocked_id === otherId && b.kind === 'blocked');
    const restrictRec = blocks.find((b) => b.blocked_id === otherId && b.kind === 'restricted');
    const blockedIds = blocks.filter((b) => b.kind === 'blocked').map((b) => b.blocked_id);
    const restrictedIds = blocks.filter((b) => b.kind === 'restricted').map((b) => b.blocked_id);
    const hiddenCount = messages.filter((m) =>
      blockedIds.includes(m.sender_id) || (restrictedIds.includes(m.sender_id) && !showRestricted)).length;
    const visibleMessages = messages.filter((m) =>
      !blockedIds.includes(m.sender_id) && (showRestricted || !restrictedIds.includes(m.sender_id)));
    const requestConvo = isRequestConvo(active);
    const mySent = messages.filter((m) => m.sender_id === me.id).length;
    const remaining = Math.max(0, REQUEST_LIMIT - mySent);
    const composerDisabled = !!blockRec || (requestConvo && remaining <= 0);
    const disabledReason = blockRec
      ? 'You blocked this buddy. Unblock them from the menu above to chat again.'
      : requestConvo && remaining <= 0
        ? 'Request limit reached — they need to add you as a study buddy before you can send more.'
        : '';

    return (
      <div className="-mx-4 flex h-[calc(100dvh_-_7.5rem_-_env(safe-area-inset-top))] flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
          <BackButton fallbackTo="/chat" label="Back to chats" />
          <BuddyAvatar name={otherName} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{otherName}</p>
            <p className="text-sm text-muted-foreground">
              {active.type === 'group' ? 'Group chat' : requestConvo ? 'Chat request' : 'Direct chat'}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full focus-visible:ring-2 focus-visible:ring-offset-2" aria-label="Chat options">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setReporting(true)}>
                <Flag className="mr-2 h-4 w-4" /> Report {otherName}
              </DropdownMenuItem>
              {blockRec ? (
                <DropdownMenuItem onClick={() => setBlock(otherId, 'blocked', false)}>
                  <Ban className="mr-2 h-4 w-4" /> Unblock
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setBlock(otherId, 'blocked', true)}>
                  <Ban className="mr-2 h-4 w-4" /> Block
                </DropdownMenuItem>
              )}
              {restrictRec ? (
                <DropdownMenuItem onClick={() => setBlock(otherId, 'restricted', false)}>
                  <Eye className="mr-2 h-4 w-4" /> Unrestrict
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setBlock(otherId, 'restricted', true)}>
                  <EyeOff className="mr-2 h-4 w-4" /> Restrict
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {requestConvo && !blockRec && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-accent/10 px-4 py-2.5 text-xs">
            <span className="flex-1 text-muted-foreground">
              Chat request — you are not study buddies yet, so they can send up to {REQUEST_LIMIT} messages.
            </span>
            <Button size="sm" className="min-h-[44px] rounded-full px-3" onClick={() => addBack(otherId)}>
              <UserPlus className="h-3 w-3" /> Add buddy
            </Button>
          </div>
        )}

        {hiddenCount > 0 && (
          <button
            onClick={() => setShowRestricted((s) => !s)}
            className="min-h-[44px] border-b border-border bg-muted/40 px-4 py-1.5 text-xs font-semibold text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {showRestricted ? 'Hide' : 'Show'} {hiddenCount} restricted or blocked message{hiddenCount === 1 ? '' : 's'}
          </button>
        )}

        <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
          {visibleMessages.map((m) => {
            const mine = m.sender_id === me.id;
            return (
              <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div className={cn('group max-w-[80%] rounded-3xl px-4 py-2.5 text-sm shadow-sm', mine ? 'rounded-br-lg bg-primary text-primary-foreground' : 'rounded-bl-lg bg-card text-foreground', m.pending && 'opacity-70')}>
                  {!mine && active.type === 'group' && (
                    <p className="mb-0.5 text-xs font-bold text-secondary">{m.sender_name || 'Buddy'}</p>
                  )}
                  {m.text && <p className="whitespace-pre-wrap break-words leading-relaxed">{m.text}</p>}
                  {(m.attachments || []).length > 0 && (
                    <div className={cn('mt-1.5 space-y-1.5', !m.text && 'mt-0')}>
                      {m.attachments.map((a, i) => <MessageAttachment key={i} attachment={a} />)}
                    </div>
                  )}
                  <div className="mt-1 flex items-center justify-end gap-2">
                    <span className={cn('text-xs', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                      {m.pending ? 'Sending…' : timeAgo(m.created_date)}
                    </span>
                    {mine && (
                      <button
                        onClick={() => deleteMessage(m)}
                        aria-label="Delete message"
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full opacity-0 transition focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {visibleMessages.length === 0 && (
            <p className="pt-10 text-center text-sm text-muted-foreground">No messages yet — say hi!</p>
          )}
        </div>

        <ChatComposer
          onSend={send}
          disabled={composerDisabled}
          disabledReason={disabledReason}
          placeholder={requestConvo ? `Message… (${remaining} of ${REQUEST_LIMIT} left)` : 'Message…'}
        />

        {reporting && (
          <ReportDialog
            open={reporting}
            onOpenChange={setReporting}
            meId={me.id}
            reportedId={otherId}
            reportedName={otherName}
            conversationId={active.id}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <header>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">Chats</h1>
        <p className="mt-1 text-sm text-muted-foreground">Messages, chat requests and study groups.</p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2 rounded-2xl">
          <TabsTrigger value="chats">Chats</TabsTrigger>
          <TabsTrigger value="requests">
            Requests{requestConvos.length > 0 && <Badge className="ml-1.5 rounded-full bg-primary px-1.5 text-xs">{requestConvos.length}</Badge>}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-2">
        {(tab === 'chats' ? chatConvos : requestConvos).map((c) => (
          <Link
            key={c.id}
            to={`/chat/${c.id}`}
            className="flex items-center gap-3 rounded-3xl border border-border bg-card p-3.5 shadow-sm transition hover:border-primary/40 active:scale-[0.99] active:bg-muted/60"
          >
            <BuddyAvatar name={nameIn(c)} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{nameIn(c)}</p>
              <p className="truncate text-sm text-muted-foreground">
                {c.type === 'group' ? 'Group chat' : isRequestConvo(c) ? 'Wants to chat with you' : 'Direct chat'}
              </p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(c.updated_date || c.created_date)}</span>
          </Link>
        ))}
        {(tab === 'chats' ? chatConvos : requestConvos).length === 0 && (
          <p className="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            {tab === 'chats'
              ? 'No chats yet — start one from a buddy profile or a study invite.'
              : 'No chat requests. Messages from people you haven’t added will appear here.'}
          </p>
        )}
      </div>
    </div>
  );
}