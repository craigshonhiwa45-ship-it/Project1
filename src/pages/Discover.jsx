import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, GraduationCap, Sparkles, CalendarPlus, UserPlus, RadioTower, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import BuddyAvatar from '@/components/BuddyAvatar';
import Stars from '@/components/Stars';
import StudyInviteDialog from '@/components/StudyInviteDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SelectSheet from '@/components/SelectSheet';
import { distanceKm, matchScore, sendFriendRequest, updateMyLocation, timeAgo, fetchFriendships } from '@/lib/studybuddy';
import { useToast } from '@/components/ui/use-toast';

export default function Discover() {
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [friendState, setFriendState] = useState({});
  const [moduleFilter, setModuleFilter] = useState('All');
  const [radius, setRadius] = useState(10);
  const [yearFilter, setYearFilter] = useState('any');
  const [genderFilter, setGenderFilter] = useState('any');
  const [inviteBuddy, setInviteBuddy] = useState(null);
  const [locating, setLocating] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    const current = await base44.auth.me();
    setMe(current);
    const [page, ratings, friendships] = await Promise.all([
      base44.entities.User.filter({}),
      base44.entities.Rating.filter({}),
      fetchFriendships(current.id),
    ]);
    const rated = {};
    ratings.forEach((r) => {
      rated[r.rated_id] = rated[r.rated_id] || { sum: 0, n: 0 };
      rated[r.rated_id].sum += r.stars || 0;
      rated[r.rated_id].n += 1;
    });
    const withRatings = (Array.isArray(page) ? page : page.items || [])
      .filter((u) => u.id !== current.id)
      .map((u) => ({ ...u, avg_rating: rated[u.id] ? rated[u.id].sum / rated[u.id].n : 0 }));
    setUsers(withRatings);
    const map = {};
    friendships.forEach((f) => {
      map[f.requester_id === current.id ? f.addressee_id : f.requester_id] = f.status;
    });
    setFriendState(map);
  }, []);

  useEffect(() => { load(); }, [load]);

  const shareLocation = async () => {
    setLocating(true);
    const loc = await updateMyLocation();
    setLocating(false);
    if (loc) toast({ title: 'Location updated', description: 'Buddies nearby can now find you.' });
    else toast({ title: 'Location unavailable', description: 'Allow location access in your browser to be found nearby.' });
    await load();
  };

  const addFriend = async (buddy) => {
    const res = await sendFriendRequest(me.id, buddy.id);
    setFriendState((s) => ({ ...s, [buddy.id]: res.ok ? 'sent' : res.status || 'sent' }));
    toast({
      title: res.ok ? 'Friend request sent!' : 'Already connected',
      description: res.ok ? `${buddy.full_name} will get your request.` : `You already have a ${res.status || 'pending'} request with this buddy.`,
    });
  };

  const list = users
    .filter((u) => u.university || u.course) // only students who finished onboarding
    .map((u) => {
      const shared = (u.modules || []).filter((m) => (me?.modules || []).includes(m));
      const dist = distanceKm(me?.lat, me?.lng, u.lat, u.lng);
      return { u, shared, dist, score: matchScore(me, u) };
    })
    .filter((b) => (moduleFilter === 'All' ? true : b.shared.includes(moduleFilter)))
    .filter((b) => (yearFilter === 'any' ? true : String(b.u.year) === yearFilter))
    .filter((b) => (genderFilter === 'any' ? true : b.u.gender === genderFilter))
    .filter((b) => b.dist == null || b.dist <= radius)
    .sort((a, b) => b.score - a.score);

  const modules = (me?.modules || []);
  const locationKnown = typeof me?.lat === 'number';

  return (
    <div className="space-y-5 pb-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">Discover buddies</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {locationKnown ? 'Students near you, same course or modules.' : 'Turn on your location to see who is nearby.'}
          </p>
        </div>
        <button
          onClick={shareLocation}
          className="flex min-h-[44px] items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-primary shadow-sm transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <MapPin className="h-3.5 w-3.5" />
          {locating ? 'Locating…' : locationKnown ? `Updated ${timeAgo(me.location_updated)}` : 'Use my location'}
        </button>
      </header>

      <div className="flex items-center gap-2 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-xs text-primary">
        <RadioTower className="h-4 w-4 shrink-0" />
        <span>
          Buddies stay findable with their <strong>last-known location</strong> — even when their phone is off.
        </span>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Shared modules</p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Within {radius} km</span>
            <input
              type="range" min="1" max="50" value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="h-1.5 w-24 accent-[hsl(var(--primary))]"
            />
          </div>
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {['All', ...modules].map((m) => (
            <button
              key={m}
              onClick={() => setModuleFilter(m)}
              aria-pressed={moduleFilter === m}
              className={`inline-flex min-h-[44px] shrink-0 items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                moduleFilter === m
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <SelectSheet
            value={yearFilter}
            onValueChange={setYearFilter}
            title="Year of study"
            options={[{ value: 'any', label: 'Any year' }, ...[1, 2, 3, 4, 5, 6].map((y) => ({ value: String(y), label: `Year ${y}` }))]}
            className="min-h-[44px] flex-1 rounded-full"
          />
          <SelectSheet
            value={genderFilter}
            onValueChange={setGenderFilter}
            title="Gender"
            options={[
              { value: 'any', label: 'Any gender' },
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'other', label: 'Other' },
            ]}
            className="min-h-[44px] flex-1 rounded-full"
          />
        </div>
      </div>

      <div className="space-y-3">
        {list.map(({ u, shared, dist, score }) => (
          <div key={u.id} className="rounded-3xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md">
            <div className="flex items-start gap-3">
              <BuddyAvatar name={u.full_name} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link to={`/buddy/${u.id}`} className="truncate rounded-lg py-1.5 font-heading font-bold transition hover:text-primary active:text-primary">
                    {u.full_name}
                  </Link>
                  {score >= 55 && (
                    <Badge className="rounded-full bg-accent/20 text-accent-foreground hover:bg-accent/20">
                      <Sparkles className="mr-1 h-3 w-3" /> Great match
                    </Badge>
                  )}
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {u.university || 'University not set'} · Year {u.year || '?'}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-primary" /> {dist == null ? 'Location off' : `${dist} km away`}
                  </span>
                  <span className="inline-flex items-center gap-1 truncate">
                    <GraduationCap className="h-3 w-3 text-secondary" /> {u.course || 'Course not set'}
                  </span>
                </div>
              </div>
              <Stars value={u.avg_rating || 0} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(u.modules || []).map((m) => (
                <Badge
                  key={m}
                  variant="outline"
                  className={`rounded-full text-xs ${
                    shared.includes(m) ? 'border-primary/40 bg-primary/5 text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {m}
                </Badge>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Match {score}%</span>
              <div className="flex gap-2">
                {friendState[u.id] === 'accepted' ? (
                  <Button variant="outline" size="sm" className="h-8 min-h-[44px] rounded-full" disabled>Friends ✓</Button>
                ) : (
                  <Button variant="outline" size="sm" className="h-8 min-h-[44px] rounded-full" onClick={() => addFriend(u)}>
                    <UserPlus className="h-3.5 w-3.5" />
                    {friendState[u.id] === 'pending' ? 'Request sent' : 'Add friend'}
                  </Button>
                )}
                <Button size="sm" className="h-8 min-h-[44px] rounded-full" onClick={() => setInviteBuddy(u)}>
                  <CalendarPlus className="h-3.5 w-3.5" /> Study invite
                </Button>
              </div>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            <Search className="mx-auto mb-2 h-6 w-6 text-primary" />
            No buddies match yet. Widen the radius, try another module, or check back soon.
          </div>
        )}
      </div>

      {inviteBuddy && (
        <StudyInviteDialog
          open={!!inviteBuddy}
          onOpenChange={(o) => !o && setInviteBuddy(null)}
          me={me}
          buddy={inviteBuddy}
        />
      )}
    </div>
  );
}