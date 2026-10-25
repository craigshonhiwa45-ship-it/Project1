import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { CalendarCheck, Clock, TrendingUp, Flame, Star, FileQuestion } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Stars from '@/components/Stars';
import RatingPrompt from '@/components/RatingPrompt';

function weekKey(iso) {
  const d = new Date(iso);
  const day = (d.getDay() + 6) % 7; // Monday start
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function Dashboard() {
  const [me, setMe] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [ratings, setRatings] = useState([]);

  useEffect(() => {
    (async () => {
      const current = await base44.auth.me();
      setMe(current);
      const [sess, r] = await Promise.all([
        base44.entities.StudySession.filter({ participant_ids: current.id }),
        base44.entities.Rating.filter({ rated_id: current.id }),
      ]);
      setSessions(sess);
      setRatings(r);
    })();
  }, []);

  const total = sessions.length;
  const totalMinutes = sessions.reduce((s, x) => s + (x.duration_minutes || 0), 0);
  const avgMinutes = total ? Math.round(totalMinutes / total) : 0;

  // last 8 weeks of sessions
  const now = weekKey(new Date());
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(start.getDate() - i * 7);
    weeks.push({ start, label: `W-${i}` });
  }
  const weekly = weeks.map(({ start, label }, i) => {
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const count = sessions.filter((s) => {
      const t = new Date(s.happened_on || s.created_date);
      return t >= start && t < end;
    }).length;
    return { week: i === 7 ? 'This wk' : label, sessions: count };
  });

  const activeWeeks = weekly.filter((w) => w.sessions > 0).length;
  const avgPerWeek = activeWeeks ? total / activeWeeks : 0;

  const fmt = (mins) => (mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`);

  const avgRating = ratings.length ? ratings.reduce((s, r) => s + (r.stars || 0), 0) / ratings.length : 0;

  const stats = [
    { label: 'Total sessions', value: String(total), icon: CalendarCheck, tone: 'text-primary bg-primary/10' },
    { label: 'Avg / active week', value: avgPerWeek ? avgPerWeek.toFixed(1) : '0', icon: TrendingUp, tone: 'text-secondary bg-secondary/10' },
    { label: 'Total time', value: total ? fmt(totalMinutes) : '0m', icon: Clock, tone: 'text-accent bg-accent/20' },
    { label: 'Avg length', value: total ? fmt(avgMinutes) : '0m', icon: Flame, tone: 'text-rose-500 bg-rose-50' },
  ];

  return (
    <div className="space-y-5 pb-6">
      <header>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">Your study dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track your sessions and keep the streak alive.</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="rounded-3xl border-border shadow-sm">
            <CardContent className="p-4">
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${s.tone}`}>
                <s.icon className="h-4 w-4" />
              </span>
              <p className="mt-2.5 font-heading text-2xl font-extrabold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-3xl border-border shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="font-heading text-base font-bold">Sessions per week</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly}>
                <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tickLine={false} axisLine={false} width={24} allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted) / 0.4)' }} />
                <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border bg-gradient-to-br from-primary/5 to-secondary/5 shadow-sm">
        <CardContent className="flex items-center gap-3 p-4">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-accent-foreground">
            <Star className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold">Buddy rating</p>
            <Stars value={avgRating} size="md" />
          </div>
          <p className="font-heading text-2xl font-extrabold">{avgRating ? avgRating.toFixed(1) : '—'}</p>
        </CardContent>
      </Card>

      <Link
        to="/feedback"
        className="flex items-center gap-3 rounded-3xl border border-border bg-card p-4 text-sm shadow-sm transition hover:border-primary/40"
      >
        <FileQuestion className="h-5 w-5 text-secondary" />
        <span>Something not right? Send the Studybuddy team feedback</span>
      </Link>

      {me && <RatingPrompt me={me} />}
    </div>
  );
}