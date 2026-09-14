import { useEffect } from 'react';

interface Section {
  heading: string;
  body: string[];
}

/**
 * Public takedown contact. Set VITE_CONTACT_EMAIL at build time; otherwise it
 * is derived from the domain the app is actually served from, so no
 * placeholder address ever ships to production.
 */
const CONTACT_EMAIL: string =
  import.meta.env.VITE_CONTACT_EMAIL ??
  (typeof window !== 'undefined' && window.location.hostname.includes('.')
    ? `dmca@${window.location.hostname.replace(/^www\./, '')}`
    : 'dmca@fetchly.local');

const DOCS: Record<string, { title: string; updated: string; sections: Section[] }> = {
  'responsible-use': {
    title: 'Responsible Use Policy',
    updated: 'Last updated: August 2026',
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
          'Fetchly does not access private, password-protected, members-only, age-restricted or DRM-protected content.',
          'Fetchly does not bypass authentication, paywalls, regional locks or any other access control.',
          'Fetchly does not support downloading content in ways that violate a platform’s terms of service.',
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
    updated: 'Last updated: August 2026',
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
    updated: 'Last updated: August 2026',
    sections: [
      {
        heading: 'What we collect',
        body: [
          'Fetchly is designed to collect as little as possible. Basic downloads do not require an account.',
          'We process the URLs you submit in order to analyze and download media. Technical data such as anonymized request metadata may be kept briefly for rate limiting and abuse prevention.',
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
          'Generated files are deleted automatically after a short expiration window. Job records are kept only as long as needed to operate and secure the service.',
        ],
      },
      {
        heading: 'Contact',
        body: ['For privacy questions, contact the address listed on the DMCA page.'],
      },
    ],
  },
  dmca: {
    title: 'DMCA Policy',
    updated: 'Last updated: August 2026',
    sections: [
      {
        heading: 'We respect intellectual property',
        body: [
          'Fetchly does not host media. Files are generated temporarily at a user’s request from third-party sources and deleted automatically. Users are responsible for ensuring they have the right to download any content.',
        ],
      },
      {
        heading: 'Takedown requests',
        body: [
          'If you believe Fetchly is being used to infringe your copyright, send a notice identifying the work, the URL involved, and your contact details to the designated agent listed below. We will review and act on valid notices promptly.',
        ],
      },
      {
        heading: 'Designated agent',
        body: [CONTACT_EMAIL],
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
