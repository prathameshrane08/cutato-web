import type { Metadata } from "next";
import LegalPage, { LegalSection, Placeholder } from "@/app/Components/LegalPage";

export const metadata: Metadata = {
  title: "Impressum",
};

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum" updated="October 2026">
      <LegalSection title="Angaben gemäß § 5 DDG">
        <p>
          <Placeholder>Company or full legal name</Placeholder>
          <br />
          <Placeholder>Street and house number</Placeholder>
          <br />
          <Placeholder>Postcode</Placeholder> Dresden, Germany
        </p>
        <p>
          Represented by: <Placeholder>Managing director / owner</Placeholder>
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Email: <Placeholder>contact email</Placeholder>
          <br />
          Phone: <Placeholder>phone number</Placeholder>
        </p>
      </LegalSection>

      <LegalSection title="Register and VAT">
        <p>
          Commercial register:{" "}
          <Placeholder>court and registration number, if registered</Placeholder>
          <br />
          VAT ID according to § 27a UStG: <Placeholder>VAT ID, if applicable</Placeholder>
        </p>
      </LegalSection>

      <LegalSection title="Responsible for content according to § 18 (2) MStV">
        <p>
          <Placeholder>Name and address</Placeholder>
        </p>
      </LegalSection>

      <LegalSection title="Consumer dispute resolution">
        <p>
          We are neither willing nor obliged to participate in dispute resolution proceedings before
          a consumer arbitration board.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
