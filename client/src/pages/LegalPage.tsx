import { useEffect } from 'react';

interface Section {
  heading: string;
  body: string[];
}

const DOCS: Record<string, { title: string; updated: string; sections: Section[] }> = {
  'responsible-use': {
    title: 'Responsible Use Policy',
    updated: 'Last updated: November 2026',
    sections: [
      {
        heading: 'Your responsibility',
        body: [
          'Fetchly is a tool for saving media that you own, that is in the public domain, or that you have explicit permission to download. You are solely responsible for ensuring your use of the service complies with applicable laws and the terms of the platform the media comes from.',
        ],
      },
      {
        heading: 'What Fetchly will not do',
        body: [
          'Fetchly is intended for publicly accessible media. Private, password-protected, members-only, age-restricted or DRM-protected content may not be available.',
          'Fetchly is not intended to bypass authentication, paywalls, regional locks or any other access control.',
          'Do not use Fetchly in ways that violate a platform’s terms of service.',
        ],
      },
      {
        heading: 'Copyright',
        body: [
          'Downloading copyrighted content without the rights holder’s permission may be unlawful in your jurisdiction. If you are unsure whether you may download a piece of media, do not download it.',
        ],
      },
      {
        heading: 'Abuse',
        body: [
          'Attempts to abuse the service — including excessive automated requests, attempts to reach internal systems, or attempts to download prohibited content — may result in rate limiting or blocking.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    updated: 'Last updated: November 2026',
    sections: [
      {
        heading: 'Acceptance',
        body: ['By using Fetchly you agree to these terms and to our Responsible Use Policy.'],
      },
      {
        heading: 'The service',
        body: [
          'Fetchly provides tools to analyze and download publicly accessible media from supported platforms. The service is provided "as is" without warranties of any kind. Files are stored temporarily and deleted automatically; we do not guarantee availability of any download.',
        ],
      },
      {
        heading: 'Acceptable use',
        body: [
          'You may only use Fetchly for media you have the right to download. You must not use the service to infringe copyright, violate third-party rights, or circumvent access controls.',
        ],
      },
      {
        heading: 'Liability',
        body: [
          'To the maximum extent permitted by law, Fetchly is not liable for any damages arising from your use of the service or from content you download with it.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    updated: 'Last updated: November 2026',
    sections: [
      {
        heading: 'What we collect',
        body: [
          'Fetchly is designed to collect as little as possible. Basic downloads do not require an account.',
          'We process the URLs you submit to analyze and download media. IP addresses and request information may be processed for rate limiting. Server and hosting-provider logs may contain request metadata and error details; the hosting provider controls its log retention.',
          'Media thumbnails may load from third-party platforms or their CDNs. Your browser stores your theme and download history locally, and admin sign-in uses an HTTP-only cookie.',
        ],
      },
      {
        heading: 'What we do not collect',
        body: [
          'We do not require names, email addresses or payment details for basic use. We do not build advertising profiles.',
        ],
      },
      {
        heading: 'Retention',
        body: [
          'Generated files are deleted after a short expiration window or when the beta instance restarts. Job records and analytics are held in memory until they are deleted or the instance restarts; hosting-provider logs may be retained separately.',
        ],
      },
      {
        heading: 'Contact',
        body: ['A privacy contact has not yet been configured for this beta.'],
      },
    ],
  },
  dmca: {
    title: 'DMCA Policy',
    updated: 'Last updated: November 2026',
    sections: [
      {
        heading: 'We respect intellectual property',
        body: [
          'Fetchly generates temporary files at a user’s request from third-party sources and deletes them automatically. Users are responsible for ensuring they have the right to download any content.',
        ],
      },
      {
        heading: 'Takedown requests',
        body: [
          'If you believe Fetchly is being used to infringe your copyright, a notice should identify the work, the URL involved, and your contact details.',
        ],
      },
      {
        heading: 'Contact',
        body: ['A copyright contact has not yet been configured for this beta.'],
      },
    ],
  },
};

export default function LegalPage({ doc }: { doc: string }) {
  const content = DOCS[doc];

  useEffect(() => {
    if (content) document.title = `${content.title} — Fetchly`;
  }, [content]);

  if (!content) return null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{content.title}</h1>
      <p className="mt-2 text-sm text-ink-soft">{content.updated}</p>
      <div className="mt-8 space-y-8">
        {content.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-lg font-bold text-ink">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
