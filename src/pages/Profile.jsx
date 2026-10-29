import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Settings2, FileQuestion, LogOut, MapPin, GraduationCap, Users, Inbox, CalendarCheck, CheckCheck, Star, Shield, ShieldCheck, FileText, Lock, Trash2, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import BuddyAvatar from '@/components/BuddyAvatar';
import Stars from '@/components/Stars';
import EditProfileDialog from '@/components/EditProfileDialog';
import RateBuddyCard from '@/components/RateBuddyCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { updateMyLocation, timeAgo, findOrCreateDirectConversation, fetchFriendships, buddyIdsFrom, fetchUserMap } from '@/lib/studybuddy';
import { useToast } from '@/components/ui/use-toast';

export default function Profile() {
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState({});
  const [friendRequests, setFriendRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [invitesIn, setInvitesIn] = useState([]);
  const [invitesOut, setInvitesOut] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [ratingsIn, setRatingsIn] = useState([]);
  const [ratingsGiven, setRatingsGiven] = useState([]);
  const [buddies, setBuddies] = useState([]);
  const [editing, setEditing] = useState(false);
  const [logFor, setLogFor] = useState(null);
  const [duration, setDuration] = useState('60');
  const { toast } = useToast();

  const load = useCallback(async () => {
    const current = await base44.auth.me();
    setMe(current);
    const [userMap, friendships, invites, sess, ratings] = await Promise.all([
      fetchUserMap(),
      fetchFriendships(current.id),
      base44.entities.StudyInvite.filter({ $or: [{ to_id: current.id }, { from_id: current.id }] }),
      base44.entities.StudySession.filter({ participant_ids: current.id }),
      base44.entities.Rating.filter({ $or: [{ rated_id: current.id }, { rater_id: current.id }] }),
    ]);
    setUsers(userMap);
    setBuddies(buddyIdsFrom(friendships, current.id));
    setFriendRequests(friendships.filter((f) => f.status === 'pending' && f.addressee_id === current.id));
    setSentRequests(friendships.filter((f) => f.status === 'pending' && f.requester_id === current.id));
    setInvitesIn(invites.filter((i) => i.to_id === current.id));
    setInvitesOut(invites.filter((i) => i.from_id === current.id && i.status === 'pending'));
    setSessions(sess.sort((a, b) => (b.created_date || '').localeCompare(a.created_date || '')));
    setRatingsIn(ratings.filter((r) => r.rated_id === current.id));
    setRatingsGiven(ratings.filter((r) => r.rater_id === current.id));
  }, []);

  useEffect(() => {
    load();
    // Refresh location in place instead of reloading every list again.
    updateMyLocation().then((loc) => {
      if (loc) setMe((m) => (m ? { ...m, lat: loc.lat, lng: loc.lng, location_updated: new Date().toISOString() } : m));
    });
  }, [load]);

  const avgRating = ratingsIn.length
    ? ratingsIn.reduce((s, r) => s + (r.stars || 0), 0) / ratingsIn.length
    : 0;

  const acceptFriend = async (req) => {
    // Optimistic: show the new buddy before the server answers.
    setFriendRequests((rs) => rs.filter((r) => r.id !== req.id));
    setBuddies((bs) => (bs.includes(req.requester_id) ? bs : [...bs, req.requester_id]));
    await base44.entities.Friendship.update(req.id, { status: 'accepted' });
    toast({ title: 'Friend added!', description: `${users[req.requester_id]?.full_name || 'Your buddy'} is now a study buddy.` });
    load();
  };

  const declineFriend = async (req) => {
    setFriendRequests((rs) => rs.filter((r) => r.id !== req.id));
    await base44.entities.Friendship.delete(req.id);
    load();
  };

  const acceptInvite = async (inv) => {
    setInvitesIn((list) => list.map((i) => (i.id === inv.id ? { ...i, status: 'accepted' } : i)));
    await base44.entities.StudyInvite.update(inv.id, { status: 'accepted' });
    const otherName = users[inv.from_id]?.full_name || 'your buddy';
    await findOrCreateDirectConversation(me.id, inv.from_id, otherName);
    toast({ title: 'Invite accepted!', description: `A chat with ${otherName} is open — arrange your session there.` });
    load();
  };

  const declineInvite = async (inv) => {
    setInvitesIn((list) => list.map((i) => (i.id === inv.id ? { ...i, status: 'declined' } : i)));
    await base44.entities.StudyInvite.update(inv.id, { status: 'declined' });
    load();
  };

  const logSession = async (inv) => {
    const mins = Math.max(1, Number(duration) || 60);
    await base44.entities.StudySession.create({
      invite_id: inv.id,
      participant_ids: [inv.from_id, inv.to_id],
      duration_minutes: mins,
      happened_on: new Date().toISOString().slice(0, 10),
      confirmed_by: [me.id],
      notes: '',
    });
    setLogFor(null);
    toast({ title: 'Session logged!', description: `Nice work — ${mins} minutes added to your dashboard.` });
    load();
  };

  const confirmSession = async (sess) => {
    const confirmed = Array.isArray(sess.confirmed_by) ? sess.confirmed_by : [];
    if (confirmed.includes(me.id)) return;
    setSessions((list) => list.map((s) => (s.id === sess.id ? { ...s, confirmed_by: [...confirmed, me.id] } : s)));
    await base44.entities.StudySession.update(sess.id, { confirmed_by: [...confirmed, me.id] });
    toast({ title: 'Session confirmed!', description: 'Your study partner will see this on their dashboard too.' });
    load();
  };

  if (!me) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  const nameOf = (id) => users[id]?.full_name || 'Study buddy';
  const incomingPending = invitesIn.filter((i) => i.status === 'pending');
  const acceptedInvites = [
    ...invitesIn.filter((i) => i.status === 'accepted').map((i) => ({ ...i, role: 'invitee' })),
    ...invitesOut.filter((i) => i.status === 'accepted').map((i) => ({ ...i, role: 'inviter' })),
  ];
  const loggedInviteIds = new Set(sessions.map((s) => s.invite_id).filter(Boolean));
  const openAccepted = acceptedInvites.filter((i) => !loggedInviteIds.has(i.id));

  const ratingPrompts = sessions
    .map((s) => {
      const other = (s.participant_ids || []).find((p) => p !== me.id);
      const already = ratingsGiven.some((r) => r.session_id === s.id);
      return other && !already ? { ...s, meId: me.id, otherId: other } : null;
    })
    .filter(Boolean);

  return (
    <div className="space-y-5 pb-6">
      <header className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">My profile</h1>
        <div className="flex items-center gap-1">
          {me.role === 'admin' && (
            <Link to="/admin" className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Admin dashboard">
              <Shield className="h-5 w-5" />
            </Link>
          )}
          <Link to="/feedback" aria-label="Send feedback" className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <FileQuestion className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <BuddyAvatar name={me.full_name} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-lg font-extrabold">{me.full_name}</p>
            <Stars value={avgRating} size="md" />
            <p className="mt-0.5 text-sm text-muted-foreground">
              {avgRating ? `${avgRating.toFixed(1)} from ${ratingsIn.length} buddies` : 'No ratings yet'} · {sessions.length} sessions
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <p className="flex items-center gap-2 text-muted-foreground">
            <GraduationCap className="h-4 w-4 text-secondary" /> {me.course || 'Course not set'} · Year {me.year || '?'}
          </p>
          <p className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" /> {me.university || 'University not set'}
            {me.location_updated && <span className="text-xs">· location {timeAgo(me.location_updated)}</span>}
          </p>
          <p className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4 text-accent" /> {me.gender || 'Not set'}
          </p>
        </div>
        {me.bio && <p className="mt-3 text-sm italic text-muted-foreground">“{me.bio}”</p>}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {(me.modules || []).map((m) => (
            <Badge key={m} variant="outline" className="rounded-full text-xs text-primary">{m}</Badge>
          ))}
          {(me.modules || []).length === 0 && (
            <p className="text-xs text-muted-foreground">Add your modules so buddies can find you.</p>
          )}
        </div>
        <Button variant="outline" size="sm" className="mt-4 w-full rounded-full" onClick={() => setEditing(true)}>
          <Settings2 className="h-4 w-4" /> Edit profile & modules
        </Button>
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <Users className="h-4 w-4" /> StudyBuddies ({buddies.length})
          {me.hide_social && <Badge variant="outline" className="ml-1 rounded-full text-xs">Private</Badge>}
        </h2>
        {me.hide_social && (
          <p className="mb-2 px-1 text-xs text-muted-foreground">
            Your list is private — other students only see your StudyBuddies count. Change this in edit profile.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          {buddies.map((id) => (
            <Link
              key={id}
              to={`/buddy/${id}`}
              className="flex items-center gap-2.5 rounded-3xl border border-border bg-card p-3 shadow-sm transition hover:border-primary/40 active:scale-[0.98] active:bg-muted/60"
            >
              <BuddyAvatar name={nameOf(id)} size="sm" />
              <p className="min-w-0 flex-1 truncate text-sm font-bold">{nameOf(id)}</p>
            </Link>
          ))}
          {buddies.length === 0 && (
            <p className="col-span-2 rounded-3xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No StudyBuddies yet — send some requests from Discover!
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <Inbox className="h-4 w-4" /> Pending invites
        </h2>
        <div className="space-y-2">
          {friendRequests.map((req) => (
            <div key={req.id} className="flex items-center gap-3 rounded-3xl border border-border bg-card p-3.5 shadow-sm">
              <BuddyAvatar name={nameOf(req.requester_id)} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">
                  {nameOf(req.requester_id)}{' '}
                  <Badge className="ml-1 rounded-full bg-secondary/10 text-xs text-secondary hover:bg-secondary/10">Friend request</Badge>
                </p>
                <p className="truncate text-xs text-muted-foreground">{users[req.requester_id]?.course || 'Wants to add you as a buddy'}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button size="sm" className="min-h-[44px] rounded-full px-3" onClick={() => acceptFriend(req)}>Accept</Button>
                <Button size="sm" variant="ghost" className="min-h-[44px] rounded-full px-3" onClick={() => declineFriend(req)}>Decline</Button>
              </div>
            </div>
          ))}
          {incomingPending.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 rounded-3xl border border-border bg-card p-3.5 shadow-sm">
              <BuddyAvatar name={nameOf(inv.from_id)} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">
                  {nameOf(inv.from_id)}{' '}
                  <Badge className="ml-1 rounded-full bg-primary/10 text-xs text-primary hover:bg-primary/10">Study invite</Badge>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {inv.when ? `${new Date(inv.when).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · ` : ''}
                  {inv.place ? `${inv.place} · ` : ''}{inv.group_size} people{inv.note ? ` · ${inv.note}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button size="sm" className="min-h-[44px] rounded-full px-3" onClick={() => acceptInvite(inv)}>Accept</Button>
                <Button size="sm" variant="ghost" className="min-h-[44px] rounded-full px-3" onClick={() => declineInvite(inv)}>Decline</Button>
              </div>
            </div>
          ))}
          {sentRequests.map((req) => (
            <div key={req.id} className="flex items-center gap-3 rounded-3xl border border-border bg-muted/40 p-3.5 text-sm text-muted-foreground">
              <BuddyAvatar name={nameOf(req.addressee_id)} size="sm" />
              <span>Waiting for <strong className="text-foreground">{nameOf(req.addressee_id)}</strong> to accept your friend request…</span>
            </div>
          ))}
          {invitesOut.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 rounded-3xl border border-border bg-muted/40 p-3.5 text-sm text-muted-foreground">
              <BuddyAvatar name={nameOf(inv.to_id)} size="sm" />
              <span>Study invite to <strong className="text-foreground">{nameOf(inv.to_id)}</strong> is pending…</span>
            </div>
          ))}
          {friendRequests.length + incomingPending.length + sentRequests.length + invitesOut.length === 0 && (
            <p className="rounded-3xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No pending invites. Send some from Discover!
            </p>
          )}
        </div>
      </section>

      {openAccepted.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <CalendarCheck className="h-4 w-4" /> Log a study session
          </h2>
          <div className="space-y-2">
            {openAccepted.map((inv) => {
              const otherId = inv.role === 'invitee' ? inv.from_id : inv.to_id;
              return logFor?.id === inv.id ? (
                <div key={inv.id} className="rounded-3xl border border-primary/30 bg-primary/5 p-4">
                  <p className="text-sm font-bold">With {nameOf(otherId)}</p>
                  <p className="text-xs text-muted-foreground">How long did you study together?</p>
                  <div className="mt-2 flex gap-2">
                    <Input type="number" min="5" value={duration} onChange={(e) => setDuration(e.target.value)} className="rounded-2xl" placeholder="Minutes" />
                    <Button size="sm" className="min-h-[44px] rounded-full" onClick={() => logSession(inv)}>Save</Button>
                    <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setLogFor(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div key={inv.id} className="flex items-center gap-3 rounded-3xl border border-border bg-card p-3.5 shadow-sm">
                  <BuddyAvatar name={nameOf(otherId)} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{nameOf(otherId)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Invite accepted{inv.place ? ` · ${inv.place}` : ''}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="min-h-[44px] shrink-0 rounded-full" onClick={() => setLogFor(inv)}>
                    <CalendarCheck className="h-3.5 w-3.5" /> Log session
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {sessions.filter((s) => !(s.confirmed_by || []).includes(me.id)).length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <CheckCheck className="h-4 w-4" /> Sessions to confirm
          </h2>
          <div className="space-y-2">
            {sessions.filter((s) => !(s.confirmed_by || []).includes(me.id)).map((s) => {
              const otherId = (s.participant_ids || []).find((p) => p !== me.id);
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-3xl border border-border bg-card p-3.5 shadow-sm">
                  <BuddyAvatar name={nameOf(otherId)} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{nameOf(otherId)}</p>
                    <p className="text-xs text-muted-foreground">{s.happened_on} · {s.duration_minutes} min</p>
                  </div>
                  <Button size="sm" className="min-h-[44px] shrink-0 rounded-full" onClick={() => confirmSession(s)}>Confirm</Button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {ratingPrompts.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <Star className="h-4 w-4" /> Rate your study buddies
          </h2>
          <div className="space-y-2">
            {ratingPrompts.map((s) => (
              <RateBuddyCard key={s.id} session={s} otherName={nameOf(s.otherId)} onRated={load} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <ShieldCheck className="h-4 w-4" /> Safety & legal
        </h2>
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <Link to="/safety" className="flex items-center gap-3 border-b border-border min-h-[44px] px-4 py-3 text-sm font-semibold transition hover:bg-muted/50 active:bg-muted">
            <ShieldCheck className="h-4 w-4 text-primary" /> Community guidelines
            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
          </Link>
          <Link to="/privacy" className="flex items-center gap-3 border-b border-border min-h-[44px] px-4 py-3 text-sm font-semibold transition hover:bg-muted/50 active:bg-muted">
            <Lock className="h-4 w-4 text-primary" /> Privacy policy
            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
          </Link>
          <Link to="/terms" className="flex items-center gap-3 border-b border-border min-h-[44px] px-4 py-3 text-sm font-semibold transition hover:bg-muted/50 active:bg-muted">
            <FileText className="h-4 w-4 text-primary" /> Terms of service
            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
          </Link>
          <Link to="/feedback" className="flex items-center gap-3 border-b border-border min-h-[44px] px-4 py-3 text-sm font-semibold transition hover:bg-muted/50 active:bg-muted">
            <FileQuestion className="h-4 w-4 text-primary" /> Contact & report a problem
            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
          </Link>
          <Link to="/delete-account" className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-destructive transition hover:bg-destructive/5">
            <Trash2 className="h-4 w-4" /> Delete my account
            <ChevronRight className="ml-auto h-4 w-4" />
          </Link>
        </div>
      </section>

      <Button
        variant="ghost"
        className="w-full rounded-2xl text-muted-foreground"
        onClick={async () => { await base44.auth.logout(); }}
      >
        <LogOut className="h-4 w-4" /> Log out
      </Button>

      <EditProfileDialog open={editing} onOpenChange={setEditing} me={me} onSaved={load} />
    </div>
  );
}