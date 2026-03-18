import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SMB Security Quick-Check",
    template: "%s | SMB Security Quick-Check",
  },
  description: "A practical security baseline checklist for small and medium-sized businesses. Find your biggest cyber risks in 30 minutes.",
  openGraph: {
    title: "SMB Security Quick-Check",
    description: "A practical security checklist for small businesses. No enterprise complexity. Just the highest-impact steps.",
    type: "website",
    locale: "en_US",
    siteName: "SMB Security Quick-Check",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
