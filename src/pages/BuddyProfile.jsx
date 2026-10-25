import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, UserPlus, MapPin, GraduationCap, MessageCircle, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import BuddyAvatar from '@/components/BuddyAvatar';
import Stars from '@/components/Stars';
import StudyInviteDialog from '@/components/StudyInviteDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { sendFriendRequest, findOrCreateDirectConversation } from '@/lib/studybuddy';
import { useToast } from '@/components/ui/use-toast';

export default function BuddyProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [buddy, setBuddy] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [me, setMe] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [friendStatus, setFriendStatus] = useState(null);
  const [buddyCount, setBuddyCount] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const [current, b, ratings, cSent, cReceived] = await Promise.all([
        base44.auth.me(),
        base44.entities.User.get(id),
        base44.entities.Rating.filter({ rated_id: id }),
        base44.entities.Friendship.count({ requester_id: id, status: 'accepted' }),
        base44.entities.Friendship.count({ addressee_id: id, status: 'accepted' }),
      ]);
      setBuddyCount(cSent + cReceived);
      setMe(current);
      setBuddy(b);
      const raterIds = [...new Set(ratings.map((r) => r.rater_id))];
      const names = {};
      await Promise.all(raterIds.slice(-8).map(async (rid) => {
        try { names[rid] = (await base44.entities.User.get(rid)).full_name; } catch { names[rid] = 'Buddy'; }
      }));
      setReviews(ratings.slice(-8).reverse().map((r) => ({ ...r, by: names[r.rater_id] || 'Buddy' })));
      const [sent, received] = await Promise.all([
        base44.entities.Friendship.filter({ requester_id: current.id, addressee_id: id }),
        base44.entities.Friendship.filter({ requester_id: id, addressee_id: current.id }),
      ]);
      setFriendStatus(sent[0]?.status || received[0]?.status || null);
    })();
  }, [id]);

  const avg = reviews.length ? reviews.reduce((s, r) => s + (r.stars || 0), 0) / reviews.length : 0;

  const addFriend = async () => {
    const res = await sendFriendRequest(me.id, id);
    setFriendStatus(res.ok ? 'pending' : res.status || 'pending');
    toast({
      title: res.ok ? 'Friend request sent!' : 'Already connected',
      description: res.ok ? `${buddy?.full_name || 'Your buddy'} will get your request.` : `You already have a ${res.status || 'pending'} request here.`,
    });
  };

  const openChat = async () => {
    const convo = await findOrCreateDirectConversation(me.id, id, buddy?.full_name);
    navigate(`/chat/${convo.id}`);
  };

  if (!buddy) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  const shared = (buddy.modules || []).filter((m) => (me?.modules || []).includes(m));
  const dist = me && typeof buddy.lat === 'number'
    ? null : null; // distance shown on Discover; profile focuses on the person

  return (
    <div className="space-y-5 pb-6">
      <header className="flex items-center gap-2">
        <Link to="/" className="rounded-full p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-heading text-lg font-extrabold">Buddy profile</h1>
      </header>

      <Card className="rounded-3xl border-border shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <BuddyAvatar name={buddy.full_name} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-lg font-extrabold">{buddy.full_name}</p>
              <Stars value={avg} size="md" />
              <p className="mt-0.5 text-xs text-muted-foreground">
                {avg ? `${avg.toFixed(1)} from ${reviews.length} buddies` : 'No ratings yet'}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-muted/60 p-3">
              <MapPin className="mx-auto h-4 w-4 text-primary" />
              <p className="mt-1 text-xs text-muted-foreground">{buddy.university || 'University not set'}</p>
            </div>
            <div className="rounded-2xl bg-muted/60 p-3">
              <GraduationCap className="mx-auto h-4 w-4 text-secondary" />
              <p className="mt-1 text-xs text-muted-foreground">Year {buddy.year || '?'} · {buddy.gender || 'Not set'}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-center gap-1.5 rounded-2xl bg-muted/60 p-2.5">
            <Users className="h-4 w-4 text-accent" />
            <p className="text-xs text-muted-foreground">
              {buddyCount ?? '…'} StudyBuddies{buddy.hide_social ? ' · list is private' : ''}
            </p>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{buddy.course || 'Course not set'}</p>
          {buddy.bio && <p className="mt-3 text-sm italic text-muted-foreground">“{buddy.bio}”</p>}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {(buddy.modules || []).map((m) => (
              <Badge
                key={m}
                variant="outline"
                className={`rounded-full text-[11px] ${shared.includes(m) ? 'border-primary/40 bg-primary/5 text-primary' : 'text-muted-foreground'}`}
              >
                {m}
              </Badge>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {friendStatus === 'accepted' ? (
              <Button size="sm" className="rounded-full" disabled>Friends ✓</Button>
            ) : (
              <Button size="sm" className="rounded-full" onClick={addFriend}>
                <UserPlus className="h-3.5 w-3.5" />
                {friendStatus === 'pending' ? 'Sent' : 'Add friend'}
              </Button>
            )}
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => setInviting(true)}>
              <CalendarPlus className="h-3.5 w-3.5" /> Invite
            </Button>
            <Button size="sm" variant="outline" className="rounded-full" onClick={openChat}>
              <MessageCircle className="h-3.5 w-3.5" /> Chat
            </Button>
          </div>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Recent reviews</h2>
        <div className="space-y-2">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-3xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">{r.by}</p>
                <Stars value={r.stars} />
              </div>
              {r.comment && <p className="mt-1.5 text-sm text-muted-foreground">{r.comment}</p>}
            </div>
          ))}
          {reviews.length === 0 && (
            <p className="rounded-3xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No reviews yet — be the first to study together!
            </p>
          )}
        </div>
      </section>

      {inviting && (
        <StudyInviteDialog open={inviting} onOpenChange={setInviting} me={me} buddy={buddy} />
      )}
    </div>
  );
}