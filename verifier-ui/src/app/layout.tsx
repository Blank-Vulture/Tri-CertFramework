import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider, HeaderLangSwitcher } from "./components/LanguageProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TriCert Verifier - Tri-CertFramework",
  description: "PDF Zero-Knowledge Proof and Digital Signature Verifier",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-100`}
      >
        <LanguageProvider>
          <header className="w-full h-12 border-b border-gray-200 bg-white/80 backdrop-blur-sm flex items-center justify-end px-4">
            <HeaderLangSwitcher />
          </header>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
