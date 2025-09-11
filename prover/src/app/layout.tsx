import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider, HeaderLangSwitcher } from "./components/LanguageProvider";

export const metadata: Metadata = {
  title: "Scholar Prover - Tri-CertFramework",
  description: "PDF Zero-Knowledge Proof and Digital Signature Generator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`antialiased h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100`}>
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
