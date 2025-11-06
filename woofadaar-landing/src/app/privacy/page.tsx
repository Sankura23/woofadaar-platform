'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-neutral-milkWhite">
      {/* Header */}
      <div className="bg-primary-mint py-12 sm:py-16">
        <div className="max-width-container mx-auto section-padding px-6 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white hover:text-neutral-milkWhite transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </Link>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white">
            Privacy Policy
          </h1>
          <p className="text-lg sm:text-xl text-white/90 mt-4">
            Last Updated: November 7, 2025
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-width-container mx-auto section-padding px-6 sm:px-8 py-12 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto prose prose-lg"
        >
          <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-12 space-y-8">
            {/* Introduction */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-primary-mutedPurple mb-4">
                1. Introduction
              </h2>
              <p className="text-ui-textSecondary leading-relaxed">
                Welcome to Woofadaar. We respect your privacy and are committed to protecting your personal data.
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you
                join our waitlist through our website.
              </p>
              <p className="text-ui-textSecondary leading-relaxed mt-4">
                By joining our waitlist, you agree to the collection and use of information in accordance with this policy.
              </p>
            </section>

            {/* Information We Collect */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-primary-mutedPurple mb-4">
                2. Information We Collect
              </h2>
              <p className="text-ui-textSecondary leading-relaxed mb-4">
                When you join our waitlist, we collect the following information:
              </p>
              <div className="bg-primary-mint/5 rounded-xl p-6 space-y-3">
                <div>
                  <h3 className="font-semibold text-primary-mutedPurple mb-2">Required Information:</h3>
                  <ul className="list-disc list-inside space-y-1 text-ui-textSecondary">
                    <li>Your full name</li>
                    <li>Email address</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-primary-mutedPurple mb-2">Optional Information:</h3>
                  <ul className="list-disc list-inside space-y-1 text-ui-textSecondary">
                    <li>Mobile phone number</li>
                    <li>Location (city/country)</li>
                    <li>Your dog's name</li>
                    <li>Your dog's breed</li>
                    <li>Your dog's age range</li>
                    <li>Your interests and preferences regarding our features</li>
                    <li>Email communication preferences (weekly tips opt-in)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* How We Use Your Information */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-primary-mutedPurple mb-4">
                3. How We Use Your Information
              </h2>
              <p className="text-ui-textSecondary leading-relaxed mb-4">
                We use the collected information for the following purposes:
              </p>
              <ul className="list-disc list-inside space-y-2 text-ui-textSecondary">
                <li>To maintain your position on our waitlist</li>
                <li>To notify you when Woofadaar launches</li>
                <li>To provide you with early access to our platform</li>
                <li>To send you updates about features, events, and news (if you opted in)</li>
                <li>To send you weekly dog care tips (if you opted in)</li>
                <li>To understand your interests and tailor our platform to user needs</li>
                <li>To analyze user preferences and improve our services</li>
                <li>To communicate with you about your waitlist status</li>
              </ul>
            </section>

            {/* Legal Basis for Processing */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-primary-mutedPurple mb-4">
                4. Legal Basis for Processing (GDPR)
              </h2>
              <p className="text-ui-textSecondary leading-relaxed mb-4">
                If you are from the European Economic Area (EEA), our legal basis for collecting and using
                your personal information depends on the data collected:
              </p>
              <ul className="list-disc list-inside space-y-2 text-ui-textSecondary">
                <li><strong>Consent:</strong> By joining our waitlist, you consent to us processing your data for the purposes described</li>
                <li><strong>Legitimate Interests:</strong> We process your data to operate and improve our services</li>
                <li><strong>Contract:</strong> Processing is necessary to fulfill our agreement to notify you when we launch</li>
              </ul>
            </section>

            {/* Data Storage and Security */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-primary-mutedPurple mb-4">
                5. Data Storage and Security
              </h2>
              <p className="text-ui-textSecondary leading-relaxed mb-4">
                We take the security of your data seriously:
              </p>
              <ul className="list-disc list-inside space-y-2 text-ui-textSecondary">
                <li>Your data is stored securely in an encrypted database with a trusted cloud provider</li>
                <li>All data transmission is encrypted using industry-standard SSL/TLS protocols</li>
                <li>Access to your data is restricted to authorized personnel only</li>
                <li>We implement appropriate technical and organizational measures to protect your data</li>
                <li>Regular security assessments are performed to maintain data integrity</li>
              </ul>
              <p className="text-ui-textSecondary leading-relaxed mt-4">
                However, no method of transmission over the Internet or electronic storage is 100% secure.
                While we strive to use commercially acceptable means to protect your data, we cannot guarantee absolute security.
              </p>
            </section>

            {/* Third-Party Services */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-primary-mutedPurple mb-4">
                6. Third-Party Services
              </h2>
              <p className="text-ui-textSecondary leading-relaxed mb-4">
                We use trusted third-party service providers to operate our waitlist:
              </p>
              <div className="bg-primary-mint/5 rounded-xl p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-primary-mutedPurple mb-2">Cloud Database Provider:</h3>
                  <p className="text-ui-textSecondary text-sm">
                    Your waitlist data is stored securely with a reputable cloud database provider that maintains
                    industry-standard security practices and complies with international data protection regulations.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-primary-mutedPurple mb-2">Website Hosting Service:</h3>
                  <p className="text-ui-textSecondary text-sm">
                    Our website is hosted on secure infrastructure that ensures high availability and data protection.
                  </p>
                </div>
              </div>
              <p className="text-ui-textSecondary text-sm mt-4">
                All third-party providers are carefully selected and required to maintain appropriate security measures
                and comply with applicable data protection laws.
              </p>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-primary-mutedPurple mb-4">
                7. Data Retention
              </h2>
              <p className="text-ui-textSecondary leading-relaxed">
                We will retain your waitlist information until:
              </p>
              <ul className="list-disc list-inside space-y-2 text-ui-textSecondary mt-4">
                <li>You request deletion of your data</li>
                <li>Woofadaar officially launches and you complete the onboarding process</li>
                <li>We determine the waitlist is no longer needed (we will notify you before deletion)</li>
              </ul>
              <p className="text-ui-textSecondary leading-relaxed mt-4">
                After launch, if you choose not to create an account, we may retain your email for up to 12 months
                for occasional updates, unless you opt out.
              </p>
            </section>

            {/* Your Rights */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-primary-mutedPurple mb-4">
                8. Your Privacy Rights
              </h2>
              <p className="text-ui-textSecondary leading-relaxed mb-4">
                Depending on your location, you have the following rights:
              </p>
              <div className="space-y-4">
                <div className="bg-primary-mint/5 rounded-xl p-6">
                  <h3 className="font-semibold text-primary-mutedPurple mb-3">All Users:</h3>
                  <ul className="list-disc list-inside space-y-2 text-ui-textSecondary">
                    <li><strong>Right to Access:</strong> Request a copy of your personal data</li>
                    <li><strong>Right to Correction:</strong> Request correction of inaccurate data</li>
                    <li><strong>Right to Deletion:</strong> Request deletion of your data</li>
                    <li><strong>Right to Opt-Out:</strong> Unsubscribe from marketing communications</li>
                  </ul>
                </div>
                <div className="bg-primary-mint/5 rounded-xl p-6">
                  <h3 className="font-semibold text-primary-mutedPurple mb-3">GDPR Rights (EEA Users):</h3>
                  <ul className="list-disc list-inside space-y-2 text-ui-textSecondary">
                    <li><strong>Right to Portability:</strong> Receive your data in a machine-readable format</li>
                    <li><strong>Right to Restriction:</strong> Request restriction of processing</li>
                    <li><strong>Right to Object:</strong> Object to processing of your data</li>
                    <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time</li>
                  </ul>
                </div>
                <div className="bg-primary-mint/5 rounded-xl p-6">
                  <h3 className="font-semibold text-primary-mutedPurple mb-3">CCPA Rights (California Residents):</h3>
                  <ul className="list-disc list-inside space-y-2 text-ui-textSecondary">
                    <li><strong>Right to Know:</strong> Know what personal information is collected</li>
                    <li><strong>Right to Delete:</strong> Request deletion of your information</li>
                    <li><strong>Right to Opt-Out:</strong> Opt-out of sale of personal information (we do not sell your data)</li>
                    <li><strong>Right to Non-Discrimination:</strong> Not be discriminated against for exercising your rights</li>
                  </ul>
                </div>
              </div>
              <p className="text-ui-textSecondary leading-relaxed mt-6">
                To exercise any of these rights, please contact us at{' '}
                <a href="mailto:hello@woofadaar.com" className="text-primary-mint hover:underline font-medium">
                  hello@woofadaar.com
                </a>
                . We will respond to your request within 30 days.
              </p>
            </section>

            {/* Cookies and Tracking */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-primary-mutedPurple mb-4">
                9. Cookies and Tracking Technologies
              </h2>
              <p className="text-ui-textSecondary leading-relaxed">
                Our website currently uses minimal cookies for essential functionality only. We do not use tracking
                cookies or third-party analytics at this time. If this changes in the future, we will update this
                policy and notify you accordingly.
              </p>
            </section>

            {/* Marketing Communications */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-primary-mutedPurple mb-4">
                10. Marketing Communications
              </h2>
              <p className="text-ui-textSecondary leading-relaxed">
                If you opted in to receive weekly tips or updates, you may unsubscribe at any time by:
              </p>
              <ul className="list-disc list-inside space-y-2 text-ui-textSecondary mt-4">
                <li>Clicking the "unsubscribe" link in any email we send</li>
                <li>Contacting us at hello@woofadaar.com</li>
              </ul>
              <p className="text-ui-textSecondary leading-relaxed mt-4">
                Note: We will still send you essential emails about your waitlist status and account, even if you
                opt out of marketing communications.
              </p>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-primary-mutedPurple mb-4">
                11. Children's Privacy
              </h2>
              <p className="text-ui-textSecondary leading-relaxed">
                Woofadaar is not intended for children under 13 years of age. We do not knowingly collect personal
                information from children under 13. If you are a parent or guardian and believe your child has
                provided us with personal information, please contact us immediately at hello@woofadaar.com, and
                we will delete such information.
              </p>
            </section>

            {/* International Data Transfers */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-primary-mutedPurple mb-4">
                12. International Data Transfers
              </h2>
              <p className="text-ui-textSecondary leading-relaxed">
                Your information may be transferred to and processed in countries other than your country of residence.
                These countries may have data protection laws that are different from the laws of your country. We ensure
                that appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
              </p>
            </section>

            {/* Do Not Sell */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-primary-mutedPurple mb-4">
                13. We Do Not Sell Your Data
              </h2>
              <p className="text-ui-textSecondary leading-relaxed">
                We do not sell, rent, or trade your personal information to third parties for monetary or other valuable
                consideration. Your data is used solely for the purposes described in this Privacy Policy.
              </p>
            </section>

            {/* Changes to Privacy Policy */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-primary-mutedPurple mb-4">
                14. Changes to This Privacy Policy
              </h2>
              <p className="text-ui-textSecondary leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by:
              </p>
              <ul className="list-disc list-inside space-y-2 text-ui-textSecondary mt-4">
                <li>Updating the "Last Updated" date at the top of this policy</li>
                <li>Sending you an email notification (for material changes)</li>
                <li>Displaying a prominent notice on our website</li>
              </ul>
              <p className="text-ui-textSecondary leading-relaxed mt-4">
                We encourage you to review this Privacy Policy periodically to stay informed about how we protect your information.
              </p>
            </section>

            {/* Contact Us */}
            <section>
              <h2 className="text-2xl sm:text-3xl font-bold text-primary-mutedPurple mb-4">
                15. Contact Us
              </h2>
              <p className="text-ui-textSecondary leading-relaxed mb-4">
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices,
                please contact us:
              </p>
              <div className="bg-primary-mint/10 border-2 border-primary-mint rounded-xl p-6">
                <p className="text-ui-textPrimary font-semibold mb-2">Woofadaar</p>
                <p className="text-ui-textSecondary">
                  Email: <a href="mailto:hello@woofadaar.com" className="text-primary-mint hover:underline font-medium">hello@woofadaar.com</a>
                </p>
                <p className="text-ui-textSecondary mt-4 text-sm">
                  We aim to respond to all privacy-related inquiries within 30 days.
                </p>
              </div>
            </section>

            {/* Consent */}
            <section className="border-t-2 border-primary-mint/20 pt-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-primary-mutedPurple mb-4">
                16. Your Consent
              </h2>
              <p className="text-ui-textSecondary leading-relaxed">
                By joining our waitlist, you acknowledge that you have read and understood this Privacy Policy and
                agree to our collection, use, and disclosure of your personal information as described herein.
              </p>
            </section>
          </div>

          {/* Back to Home Button */}
          <div className="text-center mt-12">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary-mint text-white rounded-full font-semibold hover:bg-primary-coral transition-all duration-300 hover:scale-105"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
