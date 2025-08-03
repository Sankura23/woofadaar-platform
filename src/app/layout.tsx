import { Inter } from 'next/font/google'
import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from '@/contexts/LanguageContext';

const inter = Inter({ subsets: ['latin'] })
export const metadata: Metadata = {
  title: "Woofadaar - India's Dog Parent Community",
  description: "Join India's largest community of dog parents. Share experiences, get expert advice, and connect with fellow dog lovers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
