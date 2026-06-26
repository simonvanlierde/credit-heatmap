import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import { HeaderActions } from "@/components/HeaderActions";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,300,0,0&display=swap"
          rel="stylesheet"
        />
      </head>
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
                  href="https://credit.niso.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  Taxonomy
                </a>
                <a
                  href="https://credit.niso.org/implementing-credit/guidelines/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  Guidelines
                </a>
              </nav>
            </div>

            {/* Actions */}
            <HeaderActions />
          </div>
        </header>

        <main className="pt-16 max-w-screen-xl mx-auto">{children}</main>

        <footer className="bg-surface-container-low border-t border-outline-variant/20 py-6 mt-8">
          <div className="flex flex-col md:flex-row justify-between items-center px-8 gap-3 max-w-screen-xl mx-auto">
            <p className="text-xs uppercase tracking-widest text-on-surface-variant">CRediT Generator</p>
            <div className="flex gap-6">
              <a
                href="https://credit.niso.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors underline decoration-1 underline-offset-4"
              >
                NISO Standard
              </a>
              <a
                href="https://github.com/IPHYS-Bioinformatics/CRediT-Generator"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors underline decoration-1 underline-offset-4"
              >
                Source
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
