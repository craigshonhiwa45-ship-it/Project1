import { useState, useEffect, useCallback, useRef } from 'react';
import { Heart, MessageSquare, Repeat2, Send, Globe, Users, Paperclip, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import BuddyAvatar from '@/components/BuddyAvatar';
import { Image } from '@/components/ui/image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { findViolation } from '@/lib/moderation';

export default function Feed() {
  const [me, setMe] = useState(null);
  const [posts, setPosts] = useState([]);
  const [likes, setLikes] = useState([]);
  const [comments, setComments] = useState([]);
  const [reposts, setReposts] = useState([]);
  const [friendIds, setFriendIds] = useState([]);
  const [draft, setDraft] = useState('');
  const [draftVisibility, setDraftVisibility] = useState('everyone');
  const [pendingAtts, setPendingAtts] = useState([]);
  const [openComments, setOpenComments] = useState(null);
  const [commentDraft, setCommentDraft] = useState('');
  const fileRef = useRef(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    const current = await base44.auth.me();
    setMe(current);
    const [p, l, c, r, mine, theirs] = await Promise.all([
      base44.entities.Post.list({ sort: '-created_date', limit: 100 }),
      base44.entities.PostLike.filter({}),
      base44.entities.PostComment.filter({}),
      base44.entities.PostRepost.filter({}),
      base44.entities.Friendship.filter({ requester_id: current.id, status: 'accepted' }),
      base44.entities.Friendship.filter({ addressee_id: current.id, status: 'accepted' }),
    ]);
    setPosts(p.items || p);
    setLikes(l);
    setComments(c);
    setReposts(r);
    setFriendIds([...mine.map((f) => f.addressee_id), ...theirs.map((f) => f.requester_id)]);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!me) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  const userName = (id) => (id === me.id ? 'You' : 'Buddy');

  const visiblePosts = (posts.items || posts).filter(
    (p) => p.visibility === 'everyone' || p.created_by_id === me.id || friendIds.includes(p.created_by_id)
  );

  const attachFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    try {
      for (const f of files) {
        const { file_url } = await base44.integrations.Core.UploadPublicFile({ file: f });
        setPendingAtts((p) => [...p, { kind: 'image', name: f.name, file_url }]);
      }
    } catch {
      toast({ title: 'Upload failed', description: 'Could not attach that file. Try again.', variant: 'destructive' });
    }
  };

  const publish = async () => {
    if (!draft.trim()) return;
    if (findViolation(draft)) {
      toast({
        title: 'Post not published',
        description: 'Your post contains words that are not allowed on Studybuddy. Please rephrase it.',
        variant: 'destructive',
      });
      return;
    }
    await base44.entities.Post.create({ text: draft.trim(), visibility: draftVisibility, attachments: pendingAtts });
    setDraft('');
    setPendingAtts([]);
    toast({ title: 'Posted!', description: draftVisibility === 'everyone' ? 'Shared with everyone on Studybuddy.' : 'Shared with your friends only.' });
    load();
  };

  const toggleLike = async (post) => {
    const existing = likes.find((l) => l.post_id === post.id && l.user_id === me.id);
    if (existing) await base44.entities.PostLike.delete(existing.id);
    else await base44.entities.PostLike.create({ post_id: post.id, user_id: me.id });
    load();
  };

  const toggleRepost = async (post) => {
    const existing = reposts.find((r) => r.post_id === post.id && r.user_id === me.id);
    if (existing) await base44.entities.PostRepost.delete(existing.id);
    else await base44.entities.PostRepost.create({ post_id: post.id, user_id: me.id });
    load();
  };

  const addComment = async (post) => {
    if (!commentDraft.trim()) return;
    if (findViolation(commentDraft)) {
      toast({
        title: 'Comment not posted',
        description: 'Your comment contains words that are not allowed on Studybuddy. Please rephrase it.',
        variant: 'destructive',
      });
      return;
    }
    await base44.entities.PostComment.create({ post_id: post.id, text: commentDraft.trim() });
    setCommentDraft('');
    load();
  };

  return (
    <div className="space-y-5 pb-6">
      <header>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">Buddy feed</h1>
        <p className="mt-1 text-sm text-muted-foreground">Updates from your study community.</p>
      </header>

      <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
        <div className="flex gap-3">
          <BuddyAvatar name={me.full_name} size="sm" />
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Share something with your study community…"
            className="min-h-[70px] resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
          />
        </div>
        {pendingAtts.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {pendingAtts.map((a, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold">
                <Paperclip className="h-3 w-3" />
                <span className="max-w-[120px] truncate">{a.name}</span>
                <button onClick={() => setPendingAtts((p) => p.filter((_, j) => j !== i))} aria-label="Remove attachment">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <div className="flex gap-1.5">
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={attachFiles} />
            <button
              onClick={() => fileRef.current?.click()}
              aria-label="Attach images"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-primary"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDraftVisibility('everyone')}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                draftVisibility === 'everyone' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
              )}
            >
              <Globe className="h-3.5 w-3.5" /> Everyone
            </button>
            <button
              onClick={() => setDraftVisibility('friends')}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                draftVisibility === 'friends' ? 'border-secondary bg-secondary/10 text-secondary' : 'border-border text-muted-foreground'
              )}
            >
              <Users className="h-3.5 w-3.5" /> Friends only
            </button>
          </div>
          <Button size="sm" className="h-9 rounded-full" onClick={publish}>
            <Send className="h-3.5 w-3.5" /> Post
          </Button>
        </div>
      </div>

      {visiblePosts.map((p) => {
        const postLikes = likes.filter((l) => l.post_id === p.id);
        const postComments = comments.filter((c) => c.post_id === p.id);
        const postReposts = reposts.filter((r) => r.post_id === p.id);
        const iLiked = postLikes.some((l) => l.user_id === me.id);
        const iReposted = postReposts.some((r) => r.user_id === me.id);
        return (
          <article key={p.id} className="rounded-3xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <BuddyAvatar name={userName(p.created_by_id)} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{userName(p.created_by_id)}</p>
                <p className="text-[11px] text-muted-foreground">{new Date(p.created_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
              </div>
              <Badge variant="outline" className="rounded-full text-[10px] text-muted-foreground">
                {p.visibility === 'everyone' ? <Globe className="mr-1 h-3 w-3" /> : <Users className="mr-1 h-3 w-3" />}
                {p.visibility === 'everyone' ? 'Public' : 'Friends'}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-relaxed">{p.text}</p>
            {(p.attachments || []).length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {p.attachments.filter((a) => a.file_url).map((a, i) => a.kind === 'image' ? (
                  <div key={i} className="overflow-hidden rounded-2xl">
                    <Image src={a.file_url} alt={a.name || 'Attachment'} className="h-40 w-full" />
                  </div>
                ) : (
                  <a key={i} href={a.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 self-start rounded-2xl bg-muted px-3 py-2 text-xs font-semibold">
                    <Paperclip className="h-3.5 w-3.5" />
                    <span className="truncate">{a.name}</span>
                  </a>
                ))}
              </div>
            )}
            <div className="mt-3 flex items-center gap-1 border-t border-border pt-2 text-muted-foreground">
              <button
                onClick={() => toggleLike(p)}
                className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition hover:bg-muted', iLiked && 'text-rose-500')}
              >
                <Heart className={cn('h-4 w-4', iLiked && 'fill-rose-500')} /> {postLikes.length}
              </button>
              <button
                onClick={() => setOpenComments(openComments === p.id ? null : p.id)}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition hover:bg-muted"
              >
                <MessageSquare className="h-4 w-4" /> {postComments.length}
              </button>
              <button
                onClick={() => toggleRepost(p)}
                className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition hover:bg-muted', iReposted && 'text-primary')}
              >
                <Repeat2 className="h-4 w-4" /> {postReposts.length}
              </button>
            </div>
            {openComments === p.id && (
              <div className="mt-2 space-y-2 rounded-2xl bg-muted/40 p-3">
                {postComments.map((c) => (
                  <div key={c.id} className="text-xs">
                    <span className="font-bold">{userName(c.created_by_id)}</span>{' '}
                    <span className="text-muted-foreground">{c.text}</span>
                  </div>
                ))}
                {postComments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
                <div className="flex gap-2 pt-1">
                  <Input
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addComment(p)}
                    placeholder="Add a comment…"
                    className="h-8 rounded-full bg-card text-xs"
                  />
                  <Button size="sm" className="h-8 rounded-full px-3" onClick={() => addComment(p)}>Reply</Button>
                </div>
              </div>
            )}
          </article>
        );
      })}
      {visiblePosts.length === 0 && (
        <p className="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Nothing here yet — be the first to post!
        </p>
      )}
    </div>
  );
}