import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import { AboutPopover } from "@/components/AboutPopover";
import { HeaderActions } from "@/components/HeaderActions";
import { HowItWorks } from "@/components/HowItWorks";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Announcer } from "@/lib/announce";
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
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} ${newsreader.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-surface text-on-surface">
        <ThemeProvider>
          {/* First focusable element: lets keyboard users bypass the header nav. */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-on-primary focus:shadow-lg"
          >
            Skip to content
          </a>
          {/* pr compensates the scrollbar width modal primitives remove on open; the fixed
              header escapes the body padding that keeps <main> from reflowing. */}
          <header className="fixed top-0 w-full z-50 bg-surface-bright/80 backdrop-blur-md border-b border-outline-variant/20 pr-[var(--removed-body-scroll-bar-size,0px)]">
            <div className="flex justify-between items-center h-16 px-8 max-w-screen-xl 2xl:max-w-[100rem] mx-auto">
              {/* Brand */}
              <div className="flex items-center gap-8">
                <h1
                  className="font-headline italic font-semibold text-primary text-xl tracking-tight"
                  style={{ fontFamily: "var(--font-headline)" }}
                >
                  CRediT Generator
                </h1>
                <nav className="hidden md:flex gap-6 items-center">
                  <HowItWorks />
                  <AboutPopover />
                </nav>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <LanguageSelector />
                <ThemeToggle />
                <HeaderActions />
              </div>
            </div>
          </header>

          <main id="main-content" className="pt-16 max-w-screen-xl 2xl:max-w-[100rem] mx-auto">
            {children}
          </main>
          <Announcer />
        </ThemeProvider>
      </body>
    </html>
  );
}
