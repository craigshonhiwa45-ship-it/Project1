import { Link } from 'react-router-dom';
import { Flag, Ban, Clock, ShieldCheck } from 'lucide-react';
import LegalPage from '@/components/LegalPage';

export default function Safety() {
  return (
    <LegalPage title="Community guidelines" updated="October 2026">
      <div className="rounded-2xl bg-primary/10 p-4 text-sm font-semibold text-foreground">
        <ShieldCheck className="mb-2 h-5 w-5 text-primary" />
        Studybuddy has zero tolerance for objectionable content and abusive behaviour. We remove it and suspend the accounts that post it.
      </div>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-foreground">What is not allowed</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Harassment, bullying, threats or hate speech about anyone&apos;s identity.</li>
          <li>Sexual content, nudity, or sexual attention towards other members.</li>
          <li>Spam, scams, advertising, or impersonating another student or the university.</li>
          <li>Sharing someone&apos;s private details, photos or contact information without consent.</li>
          <li>Anything illegal, or any attempt to contact minors inappropriately.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-foreground">How to report content or a member</h2>
        <p className="flex items-start gap-2">
          <Flag className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>Use the report button on any post, in any chat menu, or from a member&apos;s profile. You can also send details through <Link to="/feedback" className="font-semibold text-primary hover:underline">Feedback</Link>. Reports are confidential.</span>
        </p>
        <p className="flex items-start gap-2">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>Every report is reviewed by our team within 24 hours. Content that breaks these rules is removed, and repeat offenders lose access to Studybuddy.</span>
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-foreground">Block and restrict</h2>
        <p className="flex items-start gap-2">
          <Ban className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>Open a chat, tap the menu and choose <strong className="text-foreground">Block</strong> to stop all messages, or <strong className="text-foreground">Restrict</strong> to hide their messages. Blocked members cannot find or contact you, and the action is silent.</span>
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-foreground">Meeting in person</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Meet in public places on or near campus, and during daylight where possible.</li>
          <li>Tell a friend where you are going and who you are meeting.</li>
          <li>Keep conversations inside Studybuddy until you trust someone.</li>
          <li>Leave any meeting that feels unsafe, and report it afterwards.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-foreground">Age</h2>
        <p>Studybuddy is for students aged 13 and over. If we learn that an account belongs to someone younger, we remove it.</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-bold text-foreground">Contact</h2>
        <p>Questions about these guidelines, or a report you want to follow up? Reach us through <Link to="/feedback" className="font-semibold text-primary hover:underline">Feedback</Link> and we will respond within 24 hours.</p>
      </section>
    </LegalPage>
  );
}