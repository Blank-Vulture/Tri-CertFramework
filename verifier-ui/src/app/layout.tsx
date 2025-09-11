import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider, HeaderLangSwitcher } from "./components/LanguageProvider";

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
      <body className={`antialiased h-full bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-100`}>
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
