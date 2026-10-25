import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, Activity as ActivityIcon, Star, Flag, ShieldAlert, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Stars from '@/components/Stars';

const dayKey = (iso) => new Date(iso).toLocaleDateString('en-CA'); // YYYY-MM-DD local

function last7() {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({ day: dayKey(d.toISOString()), label: d.toLocaleDateString([], { weekday: 'short' }) });
  }
  return out;
}

export default function Admin() {
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      if (!me || me.role !== 'admin') return;
      const [users, activity, ratings, feedback, reports] = await Promise.all([
        base44.entities.User.filter({}),
        base44.entities.Activity.filter({}),
        base44.entities.AppRating.filter({}),
        base44.entities.Feedback.filter({}),
        base44.entities.Report.filter({}),
      ]);
      setData({ me, users: users.items || users, activity: activity.items || activity, ratings: ratings.items || ratings, feedback: feedback.items || feedback, reports: reports.items || reports });
    })();
  }, []);

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (data.me.role !== 'admin') {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
        <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-bold">Admins only</p>
        <p className="mt-1 text-xs text-muted-foreground">This dashboard is available to the Studybuddy team.</p>
      </div>
    );
  }

  const days = last7();
  const perDay = (records, field) => {
    const counts = {};
    records.forEach((r) => {
      const key = dayKey(field === 'created_date' ? r.created_date : r);
      counts[key] = (counts[key] || 0) + 1;
    });
    return days.map((d) => ({ ...d, count: counts[d.day] || 0 }));
  };

  const signupTrend = perDay(data.users, 'created_date');
  const visitTrend = perDay(data.activity, 'created_date');
  const activeUsersToday = new Set(
    data.activity.filter((a) => dayKey(a.created_date) === days[6].day).map((a) => a.created_by_id)
  ).size;
  const avgStars = data.ratings.length
    ? data.ratings.reduce((s, r) => s + (r.stars || 0), 0) / data.ratings.length
    : 0;
  const openReports = data.reports.filter((r) => r.status !== 'resolved');

  return (
    <div className="space-y-5 pb-6">
      <header>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">Admin dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Signups, usage and how students feel about Studybuddy.</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Card className="rounded-3xl border-border shadow-sm">
          <CardContent className="p-4">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><Users className="h-4 w-4" /></span>
            <p className="mt-2.5 font-heading text-2xl font-extrabold">{data.users.length}</p>
            <p className="text-xs text-muted-foreground">Total signups</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border shadow-sm">
          <CardContent className="p-4">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary/10 text-secondary"><ActivityIcon className="h-4 w-4" /></span>
            <p className="mt-2.5 font-heading text-2xl font-extrabold">{activeUsersToday}</p>
            <p className="text-xs text-muted-foreground">Active today</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border shadow-sm">
          <CardContent className="p-4">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-accent-foreground"><Star className="h-4 w-4" /></span>
            <p className="mt-2.5 font-heading text-2xl font-extrabold">{avgStars ? avgStars.toFixed(1) : '—'}</p>
            <p className="text-xs text-muted-foreground">Avg app rating ({data.ratings.length})</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-border shadow-sm">
          <CardContent className="p-4">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-500"><ShieldAlert className="h-4 w-4" /></span>
            <p className="mt-2.5 font-heading text-2xl font-extrabold">{openReports.length}</p>
            <p className="text-xs text-muted-foreground">Open reports</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-border shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="font-heading text-base font-bold">Visits — last 7 days</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visitTrend}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tickLine={false} axisLine={false} width={24} allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted) / 0.4)' }} />
                <Bar dataKey="count" fill="hsl(var(--secondary))" radius={[8, 8, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="font-heading text-base font-bold">New signups — last 7 days</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={signupTrend}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tickLine={false} axisLine={false} width={24} allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {openReports.length > 0 && (
        <Card className="rounded-3xl border-border shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 font-heading text-base font-bold"><Flag className="h-4 w-4 text-rose-500" /> Reports to review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4">
            {openReports.map((r) => (
              <div key={r.id} className="rounded-2xl bg-muted/40 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-bold capitalize">{r.reason}</p>
                  <Badge variant="outline" className="rounded-full text-[10px]">{r.status}</Badge>
                </div>
                {r.details && <p className="mt-1 text-xs text-muted-foreground">{r.details}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="rounded-3xl border-border shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="font-heading text-base font-bold">Latest app ratings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-4">
          {data.ratings.slice(-6).reverse().map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-2xl bg-muted/40 p-3 text-sm">
              <Stars value={r.stars} />
              {r.comment && <p className="ml-3 min-w-0 flex-1 truncate text-xs text-muted-foreground">{r.comment}</p>}
            </div>
          ))}
          {data.ratings.length === 0 && <p className="text-xs text-muted-foreground">No app ratings collected yet.</p>}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="font-heading text-base font-bold">Recent feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-4">
          {data.feedback.slice(-5).reverse().map((f) => (
            <div key={f.id} className="rounded-2xl bg-muted/40 p-3 text-sm">
              <p className="font-bold capitalize">{f.type} · {f.subject}</p>
              <p className="mt-1 text-xs text-muted-foreground">{f.message}</p>
            </div>
          ))}
          {data.feedback.length === 0 && <p className="text-xs text-muted-foreground">No feedback submitted yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}