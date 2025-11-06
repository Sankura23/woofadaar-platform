import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Woofadaar - Every Bark Counts | Premium Dog Care App',
  description: 'Join the waitlist for Woofadaar - The ultimate dog care companion app. Track health, connect with vets, find services, and join a community of pet parents.',
  keywords: 'dog care app, pet health tracking, veterinary services, dog community, pet parent app',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes',
  openGraph: {
    title: 'Woofadaar - Every Bark Counts',
    description: 'The ultimate dog care companion app coming soon. Join our waitlist!',
    images: ['/og-image.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Woofadaar - Every Bark Counts',
    description: 'The ultimate dog care companion app coming soon. Join our waitlist!',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-neutral-milkWhite`}>{children}</body>
    </html>
  )
}