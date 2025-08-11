import { Inter } from 'next/font/google'
import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from '@/contexts/LanguageContext';
import Navigation from '@/components/ui/Navigation';
import MobileTabBar from '@/components/ui/MobileTabBar';
import ResponsiveViewToggle, { ResponsiveWrapper } from '@/components/ui/ResponsiveViewToggle';

const inter = Inter({ subsets: ['latin'] })
export const metadata: Metadata = {
  title: "Woofadaar - India's Dog Parent Community",
  description: "Join India's largest community of dog parents. Share experiences, get expert advice, and connect with fellow dog lovers.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Woofadaar'
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#3bbca8',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <LanguageProvider>
          <ResponsiveViewToggle />
          <Navigation />
          <ResponsiveWrapper>
            {children}
          </ResponsiveWrapper>
          <MobileTabBar />
        </LanguageProvider>
      </body>
    </html>
  );
}
