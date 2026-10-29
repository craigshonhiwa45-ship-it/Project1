import { Link } from 'react-router-dom';
import LegalPage from '@/components/LegalPage';

export default function Terms() {
  return (
    <LegalPage title="Terms of service" updated="October 2026">
      <p>
        By creating a Studybuddy account you agree to these terms and to our{' '}
        <Link to="/privacy" className="font-semibold text-primary hover:underline">privacy policy</Link> and{' '}
        <Link to="/safety" className="font-semibold text-primary hover:underline">community guidelines</Link>.
      </p>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-foreground">Who can use Studybuddy</h2>
        <p>
          You must be at least 13 years old and a student or prospective student. You need one account, in your own name, with
          accurate study details. You are responsible for keeping your login secure and for activity on your account.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-foreground">Your content</h2>
        <p>
          You keep ownership of the posts, messages and photos you create. You grant us permission to store and display that content
          inside the app so other members can see it as you chose, and to review it for safety. Only post content you have the right to share.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-foreground">Acceptable use</h2>
        <p>You agree not to post or send content that is harassing, hateful, threatening, sexually explicit, spam, or illegal; not to impersonate anyone; not to share another person&apos;s private information; and not to use the app to contact minors inappropriately.</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-foreground">Moderation and enforcement</h2>
        <p>
          We screen messages and posts for banned words, review every report within 24 hours, and may remove content or suspend or
          delete accounts that break these terms. There is zero tolerance for objectionable content and abusive users. You can block or
          restrict any member, and report any post, message or profile from inside the app.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-foreground">Meeting other students</h2>
        <p>
          Studybuddy introduces you to people; it does not verify their identity, background or intentions. Use your judgement, meet in
          public, and follow the safety tips in our{' '}
          <Link to="/safety" className="font-semibold text-primary hover:underline">community guidelines</Link>.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-foreground">Third-party sign-in</h2>
        <p>If you sign in with Google, that provider&apos;s terms apply to the sign-in process itself. We receive only your basic profile and email.</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-foreground">Availability and changes</h2>
        <p>
          The app is provided as-is, without guarantees of uninterrupted service or of finding a study partner. We may update these terms;
          continuing to use Studybuddy after an update means you accept the new version.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-foreground">Ending your account</h2>
        <p>
          You can delete your account at any time from{' '}
          <Link to="/delete-account" className="font-semibold text-primary hover:underline">Delete account</Link>. We may suspend or remove
          accounts that break these terms.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-foreground">Contact</h2>
        <p>
          Questions about these terms? Reach us through <Link to="/feedback" className="font-semibold text-primary hover:underline">Feedback</Link>.
        </p>
      </section>
    </LegalPage>
  );
}