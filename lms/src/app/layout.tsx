import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted variable fonts (from the fontsource npm packages — no CDN).
const inter = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
      weight: "100 900",
    },
  ],
  variable: "--font-sans",
  display: "swap",
});

const sora = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource-variable/sora/files/sora-latin-wght-normal.woff2",
      weight: "100 800",
    },
  ],
  variable: "--font-display",
  display: "swap",
});

const jetbrains = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
      weight: "100 800",
    },
  ],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Learnly — Learn programming by building",
    template: "%s · Learnly",
  },
  description:
    "Structured, code-first courses for HTML, CSS, JavaScript, Python, Node.js, SQL and more. Learn, practice and track your progress.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
};

export const viewport: Viewport = {
  themeColor: "#fafaf8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
