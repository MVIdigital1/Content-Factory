export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-400 mb-10">Last updated: May 25, 2026</p>

      <div className="space-y-8 text-sm text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            1. Introduction
          </h2>
          <p>
            PostCentro ("we", "our", or "us") operates the PostCentro platform —
            an AI-powered content generation and social media publishing tool.
            This Privacy Policy explains how we collect, use, and protect your
            information when you use our service at{" "}
            <strong>content-factory-khaki.vercel.app</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            2. Information We Collect
          </h2>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Account information:</strong> email address and password
              when you register
            </li>
            <li>
              <strong>Profile information:</strong> name and preferences you
              provide
            </li>
            <li>
              <strong>Social media tokens:</strong> OAuth access tokens for
              connected platforms (Instagram, Telegram, etc.) — stored encrypted
            </li>
            <li>
              <strong>Content data:</strong> posts, captions, hashtags and
              images you create or upload
            </li>
            <li>
              <strong>Usage data:</strong> pages visited, features used,
              timestamps
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            3. How We Use Your Information
          </h2>
          <ul className="list-disc list-inside space-y-2">
            <li>To provide and operate the PostCentro service</li>
            <li>
              To publish content to your connected social media accounts on your
              behalf
            </li>
            <li>To generate AI-powered content using Anthropic Claude API</li>
            <li>To send service-related notifications</li>
            <li>To improve our platform and fix issues</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            4. Instagram and Meta Data
          </h2>
          <p className="mb-2">
            When you connect your Instagram account, we request the following
            permissions:
          </p>
          <ul className="list-disc list-inside space-y-2 mb-3">
            <li>
              <strong>instagram_basic</strong> — to read your profile
              information
            </li>
            <li>
              <strong>instagram_content_publish</strong> — to publish posts on
              your behalf
            </li>
            <li>
              <strong>pages_read_engagement</strong> — to read engagement data
            </li>
          </ul>
          <p>
            We use these permissions solely to publish content you create in
            PostCentro. We do not sell your Instagram data to third parties. You
            can disconnect your Instagram account at any time from the
            Integrations page.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            5. Data Storage and Security
          </h2>
          <p>
            Your data is stored securely using Supabase (PostgreSQL). Access
            tokens for social media platforms are stored encrypted. We implement
            industry-standard security measures to protect your information.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            6. Third-Party Services
          </h2>
          <p className="mb-2">We use the following third-party services:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Anthropic Claude</strong> — AI content generation
            </li>
            <li>
              <strong>Supabase</strong> — database and authentication
            </li>
            <li>
              <strong>Vercel</strong> — hosting
            </li>
            <li>
              <strong>Meta (Facebook/Instagram)</strong> — social media
              publishing
            </li>
            <li>
              <strong>Telegram</strong> — channel publishing via Bot API
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            7. Your Rights
          </h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Access your personal data</li>
            <li>Delete your account and all associated data</li>
            <li>Disconnect any social media integration at any time</li>
            <li>Export your content data</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            8. Data Deletion
          </h2>
          <p>
            You can delete your account and all data at any time from Settings.
            For Instagram data deletion requests, please contact us at{" "}
            <strong>mvi.digit@gmail.com</strong>. We will process deletion
            requests within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            9. Contact Us
          </h2>
          <p>If you have questions about this Privacy Policy, contact us at:</p>
          <p className="mt-2">
            <strong>Email:</strong> mvi.digit@gmail.com
          </p>
          <p>
            <strong>Website:</strong> content-factory-khaki.vercel.app
          </p>
        </section>
      </div>
    </div>
  );
}
