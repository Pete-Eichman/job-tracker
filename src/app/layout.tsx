import type { Metadata } from "next";
import { Sora, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Job Tracker",
  description: "Personal job application tracker with AI match scoring.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // headers() is a dynamic API — calling it opts every route under this
  // layout into per-request rendering, which is required for Next to read
  // the per-request CSP nonce (set in middleware.ts) and stamp it onto its
  // own bootstrap scripts. Without this, routes with no other dynamic data
  // (e.g. /login) get statically prerendered at build time with no nonce,
  // and 'strict-dynamic' blocks every script.
  await headers();

  return (
    <html
      lang="en"
      className={`${sora.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
