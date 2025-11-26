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
  title: "Scholar Prover - Tri-CertFramework",
  description: "PDF Zero-Knowledge Proof and Digital Signature Generator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className={`${notoSansJP.className} antialiased h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100`}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
