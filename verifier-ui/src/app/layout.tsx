import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "./components/LanguageProvider";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
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
    <html lang="ja" className="h-full">
      <body className={`${notoSansJP.className} antialiased h-full bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-100`}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
