import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import Link from "next/link";
import { Scatter, Strawberry, Squiggle } from "@/components/Doodles";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700", "900"],
});

const body = Hanken_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Digital Movie/TV Commune",
  description: "Your own self-hosted media server.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="relative min-h-full font-sans">
        <Scatter />
        <header className="sticky top-0 z-30 border-b border-line/70 bg-background/55 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-7">
            <Link href="/" className="group flex items-center gap-2">
              <Strawberry className="h-7 w-7 shrink-0 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110" />
              <span className="relative flex items-baseline whitespace-nowrap">
                <span className="font-display text-lg font-semibold tracking-tight sm:text-2xl">
                  Digital Movie/TV
                </span>
                <span className="font-display text-lg font-semibold italic text-accent transition-colors group-hover:text-citrus sm:text-2xl">
                  &nbsp;Commune
                </span>
                <Squiggle className="absolute -bottom-1.5 left-0 h-2 w-full opacity-70" />
              </span>
            </Link>
          </div>
        </header>
        <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-7">
          {children}
        </main>
      </body>
    </html>
  );
}
