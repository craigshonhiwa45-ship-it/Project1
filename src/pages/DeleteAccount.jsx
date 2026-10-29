import { useState } from 'react';
import { Loader2, Trash2, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import LegalPage from '@/components/LegalPage';
import { Button } from '@/components/ui/button';

export default function DeleteAccount() {
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [requested, setRequested] = useState(false);

  const removeAccount = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await base44.functions.invoke('deleteAccount', {});
      const data = res.data || {};
      if (data.error) throw new Error(data.error);
      if (data.accountRemoved) {
        await base44.auth.logout('/login');
        return;
      }
      // Data is gone; the login itself is removed by the study team.
      setRequested(true);
      setBusy(false);
    } catch (e) {
      setError(e.message || 'Could not delete your account. Please try again.');
      setBusy(false);
    }
  };

  if (requested) {
    return (
      <LegalPage title="Account deleted">
        <p className="flex items-start gap-2 rounded-2xl bg-primary/10 p-4 text-sm font-semibold text-foreground">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          Your profile, posts, messages, ratings and reports have been deleted and your location has been cleared.
        </p>
        <p>Your sign-in will be removed within 24 hours, and you will not appear in discovery again.</p>
        <Button variant="outline" className="w-full rounded-full" onClick={() => base44.auth.logout('/login')}>
          Sign out
        </Button>
      </LegalPage>
    );
  }

  return (
    <LegalPage title="Delete account">
      <p>
        Deleting your account is permanent. We remove your profile, posts, comments, messages, study invites, session records,
        ratings, reports and blocks. Your membership is removed from chats and study rooms; chats that become empty are deleted.
      </p>
      <p>Reports other members filed about you are kept for safety records and are not shown to anyone else.</p>

      {error && (
        <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p>
      )}

      <label className="flex items-start gap-2 rounded-2xl bg-muted/50 p-3 text-sm text-foreground">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-destructive"
        />
        <span>I understand this permanently deletes my Studybuddy account and content.</span>
      </label>

      <Button
        variant="destructive"
        className="w-full rounded-full"
        disabled={!confirmed || busy}
        onClick={removeAccount}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        {busy ? 'Deleting your account…' : 'Delete my account'}
      </Button>
    </LegalPage>
  );
}