import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import { AboutPopover } from "@/components/AboutPopover";
import { BrandMark } from "@/components/BrandMark";
import { HeaderActions } from "@/components/HeaderActions";
import { HowItWorks } from "@/components/HowItWorks";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { SkipLink } from "@/components/SkipLink";
import { StatusBanner } from "@/components/StatusBanner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Announcer } from "@/lib/announce";
import { AppIntlProvider } from "@/lib/intl";
// Server component: the manifest is read at build time and never bundled for the
// client: only the version string is passed down to AboutPopover.
import packageJson from "../../package.json";
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

const description = "Draft CRediT contribution statements for scholarly publications.";

export const metadata: Metadata = {
  // The social card needs absolute URLs; Next resolves them against this.
  metadataBase: new URL("https://credit.duinlab.nl"),
  title: "CRediT Matrix",
  description,
  // og/twitter title and description inherit from the top-level fields.
  openGraph: {
    type: "website",
    siteName: "CRediT Matrix",
  },
  twitter: {
    card: "summary_large_image",
  },
};

/** Colors the browser chrome to match the theme the page will actually paint. */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#16181c" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} ${newsreader.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-surface text-on-surface">
        <AppIntlProvider>
          <ThemeProvider>
            <SkipLink />
            {/* pr compensates the scrollbar width modal primitives remove on open; the fixed
              header escapes the body padding that keeps <main> from reflowing. */}
            <header className="fixed top-0 w-full z-50 bg-surface-bright/80 backdrop-blur-md border-b border-outline-variant/20 pr-[var(--removed-body-scroll-bar-size,0px)]">
              <div className="mx-auto flex h-13 items-center justify-between gap-2 px-3 sm:px-8">
                {/* Brand */}
                <div className="flex items-center gap-8">
                  <h1 className="flex items-center gap-2.5 text-primary">
                    {/* Lockup: the matrix mark reads at cap height beside the wordmark. */}
                    <BrandMark className="h-[1.15rem] w-[1.15rem] shrink-0 sm:h-[1.3rem] sm:w-[1.3rem]" />
                    <span
                      // The chrome needs 349px once every control is at its
                      // 44px touch size, so below 22rem the mark carries the
                      // brand alone rather than pushing Import off the edge.
                      className="hidden min-[22rem]:inline font-headline text-lg italic font-semibold tracking-tight sm:text-xl"
                      style={{ fontFamily: "var(--font-headline)" }}
                    >
                      CRediT Matrix
                    </span>
                  </h1>
                  <nav className="hidden md:flex gap-6 items-center">
                    <HowItWorks />
                    <AboutPopover version={packageJson.version} />
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

            {/* On a desktop-sized window the workspace is height-locked to the viewport
              (see the `desk` variant): the page itself never scrolls, and each of the
              three panes scrolls its own content. Narrow, short, or zoomed viewports
              keep ordinary document flow. */}
            {/* No page cap: the workflow row sizes itself to its content and
                centers, so a big monitor goes to the matrix when the roster
                needs it and to symmetric gutters when it does not. */}
            <main id="main-content" className="mx-auto pt-13 desk:h-dvh desk:overflow-hidden">
              {children}
            </main>
            <Announcer />
            <StatusBanner />
            <ServiceWorkerRegistrar />
          </ThemeProvider>
        </AppIntlProvider>
      </body>
    </html>
  );
}
