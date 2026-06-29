import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import { HeaderActions } from "@/components/HeaderActions";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CRediT Generator",
  description: "Generate CRediT author contribution statements for scholarly publications.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable} ${newsreader.variable}`}>
      <body className="min-h-screen bg-surface text-on-surface">
        <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-outline-variant/20">
          <div className="flex justify-between items-center h-16 px-8 max-w-screen-xl mx-auto">
            {/* Brand */}
            <div className="flex items-center gap-8">
              <span
                className="font-headline italic font-semibold text-primary text-xl tracking-tight"
                style={{ fontFamily: "var(--font-headline)" }}
              >
                CRediT Generator
              </span>
              <nav className="hidden md:flex gap-6 items-center">
                <a
                  href="https://credit.niso.org/implementing-credit/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  Taxonomy
                  <ExternalLink className="size-3" aria-hidden="true" />
                  <span className="sr-only">(opens in new tab)</span>
                </a>
                <a
                  href="https://github.com/IPHYS-Bioinformatics/CRediT-Generator"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  Source
                  <ExternalLink className="size-3" aria-hidden="true" />
                  <span className="sr-only">(opens in new tab)</span>
                </a>
              </nav>
            </div>

            {/* Actions */}
            <HeaderActions />
          </div>
        </header>

        <main className="pt-16 max-w-screen-xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
