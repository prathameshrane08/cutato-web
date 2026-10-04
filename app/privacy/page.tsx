import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { LegalSection, Placeholder } from "@/app/Components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy policy",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="October 2026">
      <LegalSection title="1. Controller">
        <p>
          The controller responsible for data processing on this website is{" "}
          <Placeholder>company name, address, contact email</Placeholder>. Full details are in our{" "}
          <Link href="/impressum" className="font-bold text-[#ff355d]">
            Impressum
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Data we process">
        <p>
          <strong>Accounts:</strong> email address, name and role (customer, barber or salon) when
          you create an account or apply as a partner.
        </p>
        <p>
          <strong>Bookings:</strong> selected salon, barber, service, date, time, price and payment
          status. Optional reference photos and haircut notes you add to a booking.
        </p>
        <p>
          <strong>AI features:</strong> chat messages, photos you upload to the hairstyle advisor
          and voice recordings you dictate, which are sent for processing only to answer your
          request.
        </p>
        <p>
          <strong>Technical data:</strong> IP address and browser information needed to deliver the
          site securely, plus privacy-friendly, cookieless usage statistics.
        </p>
      </LegalSection>

      <LegalSection title="3. Purposes and legal bases">
        <p>
          We process data to provide accounts and bookings (Art. 6(1)(b) GDPR), to meet legal
          obligations such as tax record keeping (Art. 6(1)(c) GDPR), and to keep the service secure
          and improve it (Art. 6(1)(f) GDPR).
        </p>
      </LegalSection>

      <LegalSection title="4. Service providers">
        <p>We use the following processors, bound by data processing agreements:</p>
        <ul className="list-disc pl-5">
          <li>Supabase: database and authentication</li>
          <li>Stripe: online card payments (Stripe handles card details; we never see them)</li>
          <li>Resend: transactional emails such as booking confirmations</li>
          <li>OpenAI: AI chat, hairstyle recommendations and voice transcription</li>
          <li>Vercel: hosting, web analytics and performance monitoring</li>
        </ul>
        <p>
          Some providers process data outside the EU. Where that happens, transfers rely on the
          EU-US Data Privacy Framework or standard contractual clauses.{" "}
          <Placeholder>confirm hosting regions and DPAs for each provider</Placeholder>
        </p>
      </LegalSection>

      <LegalSection title="5. Retention">
        <p>
          We keep account data while your account exists and booking records for as long as tax and
          commercial law require. <Placeholder>state concrete retention periods</Placeholder>
        </p>
      </LegalSection>

      <LegalSection title="6. Your rights">
        <p>
          You have the right to access, rectification, erasure, restriction, data portability and to
          object to processing (Art. 15–21 GDPR), and to lodge a complaint with a supervisory
          authority, for example the Saxon Data Protection Commissioner. Contact us at{" "}
          <Placeholder>privacy contact email</Placeholder>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
