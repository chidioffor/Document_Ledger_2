import React from 'react';

function Card({ children, className = '' }: any) {
  return <section className={`card ${className}`}>{children}</section>;
}

export default function TermsPage() {
  return (
    <Card>
      <h2>Terms & Conditions</h2>

      <p className="muted">
        Last updated: 21 May 2026. By connecting a wallet to, or otherwise using,
        the Sayari Document Ledger (the &quot;Platform&quot;) you confirm that you have
        read, understood, and agree to be bound by these Terms.
      </p>

      <div className="terms-content">
        <h3>1. The Service</h3>
        <p>
          The Platform is an institutional document-certification service
          operated by Sayari Global Holding. It allows authorised users to
          record a cryptographic fingerprint (SHA-256 hash) of a document, plus
          a limited set of metadata (title, version, optional IPFS CID, optional
          expiry, certifier wallet address and block timestamp), to a smart
          contract registry deployed on the Ethereum blockchain.
        </p>
        <p>
          The Platform does <b>not</b> upload, store, transmit, or otherwise
          process the contents of any document on-chain. Hashing is performed
          locally in your browser and only the resulting hash and metadata are
          submitted to the registry.
        </p>

        <h3>2. Eligibility and Institutional Use</h3>
        <p>
          The Platform is intended for Private individual and Institutional use only. By using it you represent and warrant that you are at least 18 years of age, that you
          are authorised to act on behalf of yourself or the entity you purport to
          represent, and that your use of the Platform complies with all laws
          applicable to you and that entity, including sanctions, anti-money
          laundering, counter-terrorism financing, export control, data
          protection, and securities laws.
        </p>
        <p>
          You may not use the Platform if you are located in, ordinarily
          resident in, or organised under the laws of any jurisdiction subject
          to comprehensive sanctions, or if you are listed on any applicable
          sanctions list.
        </p>

        <h3>3. Wallet, Keys, and Authentication</h3>
        <p>
          The Platform authenticates users via WalletConnect. You are solely
          responsible for the security of your wallet, recovery phrases,
          private keys, and any device used to access them. Sayari Global
          Holding never receives, stores, or has the ability to recover your
          private keys, and cannot reverse, cancel, or modify any transaction
          that you have signed.
        </p>
        <p>
          Any action taken on the Platform by a wallet you have authorised will
          be treated as taken by you. Loss of access to a wallet may result in
          permanent loss of the ability to revoke or otherwise manage documents
          previously certified from that wallet.
        </p>

        <h3>4. Fees and Payment</h3>
        <p>
          Each certification requires payment of a service fee of USD 5,
          payable in USDT or its equivalent in ETH at the prevailing exchange
          rate displayed at the time of transaction, plus all applicable
          blockchain network fees ("gas"). The service fee is paid to the
          Sayari treasury wallet specified by the Platform at the time of
          signature.
        </p>
        <p>
          Because blockchain transactions are final and irreversible, all fees
          (including service fees, gas, and any failed-transaction gas
          consumed before revert) are <b>non-refundable</b> once the
          corresponding transaction has been broadcast or signed. You are
          responsible for reviewing every wallet confirmation carefully before
          approval, including the receiving address, fee amount, gas limit, and
          selected network.
        </p>

        <h3>5. Your Content and Representations</h3>
        <p>
          You represent and warrant that, for every document you submit for
          certification:
        </p>
        <p>
          (a) you own all rights necessary to certify the document or have been
          duly authorised to do so;
          (b) certification of the document does not infringe any intellectual
          property, privacy, confidentiality, contractual, or other right of
          any third party;
          (c) the document does not contain unlawful content, sanctioned-party
          information, malware, or material that you are legally prohibited
          from disclosing or recording; and
          (d) any IPFS CID, title, or metadata you supply is accurate and not
          misleading.
        </p>
        <p>
          You acknowledge that title, version, IPFS CID, certifier address, and
          timestamp are written to a public blockchain, will be visible to any
          third party indefinitely, and cannot be edited or deleted.
        </p>

        <h3>6. Nature and Effect of Certification</h3>
        <p>
          A successful certification creates an evidentiary record that a
          document with the recorded hash existed in the recorded form at the
          recorded block timestamp and was submitted by the recorded wallet.
          It does <b>not</b>, by itself:
        </p>
        <p>
          (a) prove the identity of the natural or legal person controlling the
          certifying wallet;
          (b) prove the authenticity, legality, accuracy, ownership, or
          validity of the underlying document;
          (c) constitute a notarisation, apostille, attestation, qualified
          electronic signature, witnessing, or any other formality recognised
          under any specific legal system; or
          (d) create, transfer, or evidence title to any asset, security, or
          right.
        </p>
        <p>
          The Platform is not a substitute for qualified legal, financial,
          regulatory, or notarial advice. You should consult appropriate
          professionals before relying on certification for any specific
          purpose.
        </p>

        <h3>7. Revocation</h3>
        <p>
          The certifier of a document may mark that document as "revoked"
          through the Registry. Revocation is itself an on-chain transaction
          and incurs gas. Revocation flags the record as revoked but does
          <b> not</b> delete the original certification, the document hash, the
          metadata, or any historical state from the blockchain, all of which
          remain permanently and publicly accessible.
        </p>

        <h3>8. Blockchain and Third-Party Risks</h3>
        <p>
          You acknowledge and accept the inherent risks of using public
          blockchains and connected services, including but not limited to:
          network congestion and gas price volatility; chain reorganisations,
          forks, and downtime; smart-contract bugs and exploits; price
          volatility of ETH and USDT; failure or compromise of wallets,
          WalletConnect relays, RPC providers, IPFS pinning services, or other
          third-party infrastructure; and the possibility that supporting
          services may change, become unavailable, or be deprecated.
        </p>
        <p>
          Sayari Global Holding does not control these networks or services and
          is not responsible for their performance, security, or continued
          availability.
        </p>

        <h3>9. Privacy</h3>
        <p>
          Because document content is hashed client-side and never transmitted
          to Sayari Global Holding, the Platform does not have access to your
          documents. However, all on-chain data is publicly visible. Do not
          submit metadata (titles, version strings, IPFS CIDs) that you do not
          wish to be permanently public. Where you provide an IPFS CID, the
          content addressed by that CID may be publicly retrievable, and you
          are responsible for any disclosure that results.
        </p>

        <h3>10. Prohibited Use</h3>
        <p>
          You must not use the Platform to certify, reference, or facilitate:
          unlawful content; child sexual abuse material; material that
          infringes any third-party right; fraudulent or misleading documents;
          documents used in furtherance of money laundering, terrorist
          financing, sanctions evasion, or market abuse; or any activity that
          could subject Sayari Global Holding to regulatory enforcement or
          reputational harm.
        </p>

        <h3>11. Intellectual Property</h3>
        <p>
          The Platform interface, branding, smart contract code (other than
          your data), documentation, and related materials are owned by, or
          licensed to, Sayari Global Holding and are protected by intellectual
          property laws. Nothing in these Terms transfers any ownership in the
          Platform to you. You retain all rights in the underlying documents
          you certify.
        </p>

        <h3>12. Disclaimers</h3>
        <p>
          The Platform is provided on an "as is" and "as available" basis. To
          the maximum extent permitted by law, Sayari Global Holding disclaims
          all warranties, express or implied, including warranties of
          merchantability, fitness for a particular purpose, non-infringement,
          uninterrupted operation, and freedom from error or defect.
        </p>

        <h3>13. Limitation of Liability</h3>
        <p>
          To the maximum extent permitted by law, Sayari Global Holding, its
          affiliates, directors, officers, employees, and agents will not be
          liable for any indirect, incidental, consequential, special,
          exemplary, or punitive damages, or for any loss of profits, revenue,
          data, goodwill, or business opportunity, arising out of or in
          connection with your use of the Platform, even if advised of the
          possibility of such damages.
        </p>
        <p>
          The aggregate liability of Sayari Global Holding to you for any and
          all claims arising out of or relating to the Platform shall not
          exceed the total service fees you actually paid to Sayari Global
          Holding for use of the Platform in the twelve (12) months immediately
          preceding the event giving rise to the claim.
        </p>

        <h3>14. Indemnity</h3>
        <p>
          You agree to indemnify and hold harmless Sayari Global Holding and
          its affiliates from and against any claim, loss, liability, cost, or
          expense (including reasonable legal fees) arising out of (a) your
          breach of these Terms, (b) your violation of any law or third-party
          right, or (c) any document or metadata you submit through the
          Platform.
        </p>

        <h3>15. Changes to the Terms</h3>
        <p>
          Sayari Global Holding may update these Terms from time to time. The
          revised Terms will be effective when posted within the Platform. Your
          continued use of the Platform after a revision takes effect
          constitutes acceptance of the revised Terms.
        </p>

        <h3>16. Governing Law and Disputes</h3>
        <p>
          These Terms and any dispute arising out of or in connection with them
          are governed by the laws of England and Wales, and the parties submit
          to the exclusive jurisdiction of the courts of England and Wales,
          save where mandatory consumer-protection law in your jurisdiction
          requires otherwise.
        </p>

        <h3>17. Contact</h3>
        <p>
          Questions about these Terms may be directed to Sayari Global Holding
          at the contact address listed in the Configuration page.
        </p>
      </div>
    </Card>
  );
}