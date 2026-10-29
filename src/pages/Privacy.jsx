import { Link } from 'react-router-dom';
import LegalPage from '@/components/LegalPage';

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" updated="October 2026">
      <p>
        Studybuddy helps students find study partners nearby, chat, and share updates with their study community. This policy explains
        what we collect, why, and the choices you have.
      </p>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-foreground">What we collect</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong className="text-foreground">Account:</strong> your name, email address, password (stored encrypted by our auth provider), and whether you signed in with Google.</li>
          <li><strong className="text-foreground">Study profile:</strong> university, course, year of study, modules, gender, bio and avatar.</li>
          <li><strong className="text-foreground">Location:</strong> the approximate coordinates of your device, used only to rank students near you and to show distance.</li>
          <li><strong className="text-foreground">Content you create:</strong> posts, comments, likes, messages (including images, files, voice notes and video messages), study invites, sessions, ratings and reports.</li>
          <li><strong className="text-foreground">Usage:</strong> a simple record of app visits so the admin dashboard can show activity.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-foreground">Device permissions</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong className="text-foreground">Location</strong> is optional. Decline it and you can still browse; only distance-based ranking is affected.</li>
          <li><strong className="text-foreground">Camera and microphone</strong> are used only while you are on a study room call, and only after the browser asks you.</li>
          <li><strong className="text-foreground">Files and photos</strong> are read only when you choose to attach something.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-foreground">How we use it</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>To match you with study partners and show distance.</li>
          <li>To deliver your messages, posts and study invites.</li>
          <li>To keep the community safe: screening messages and posts for banned words, reviewing reports, and acting on abuse.</li>
          <li>To show you your own study statistics.</li>
        </ul>
        <p>We do not sell your data, and we do not use it for advertising.</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-foreground">Who can see your information</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Your profile and study details are visible to other signed-in students so they can find you.</li>
          <li>Your StudyBuddies list can be hidden in Edit profile; only the count is then shown.</li>
          <li>Posts marked &ldquo;Friends only&rdquo; reach only your accepted study buddies; &ldquo;Everyone&rdquo; posts reach signed-in students.</li>
          <li>Messages are visible only to members of that conversation.</li>
          <li>Reports are visible to you and to app administrators.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-foreground">Storage and retention</h2>
        <p>
          Data is stored on our hosting provider for as long as your account exists. Content you delete is removed from the app.
          When you delete your account, your profile, posts, messages, ratings, invites, session records and reports are deleted
          or detached from shared chats and rooms.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-foreground">Your choices</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Edit or clear your study details at any time from your profile.</li>
          <li>Hide your buddy list, block or restrict members, and report content.</li>
          <li>Delete your account from <Link to="/delete-account" className="font-semibold text-primary hover:underline">Delete account</Link> — this is permanent.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-foreground">Children</h2>
        <p>Studybuddy is not intended for anyone under 13. Accounts we identify as belonging to a child are removed.</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-foreground">Contact</h2>
        <p>
          For any privacy question or data request, contact us through <Link to="/feedback" className="font-semibold text-primary hover:underline">Feedback</Link>.
          We respond within 24 hours.
        </p>
      </section>
    </LegalPage>
  );
}