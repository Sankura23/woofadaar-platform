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
              // DISABLE SERVICE WORKER - Force fresh content
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  // Immediately unregister any existing service workers
                  navigator.serviceWorker.getRegistrations().then(registrations => {
                    registrations.forEach(registration => {
                      console.log('Unregistering service worker:', registration);
                      registration.unregister();
                    });
                  });
                  
                  // Clear all caches
                  if ('caches' in window) {
                    caches.keys().then(cacheNames => {
                      cacheNames.forEach(cacheName => {
                        console.log('Deleting cache:', cacheName);
                        caches.delete(cacheName);
                      });
                    });
                  }
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
