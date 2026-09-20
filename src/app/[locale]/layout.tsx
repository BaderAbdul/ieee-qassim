import type { Metadata } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Cairo, Inter } from 'next/font/google';
import localFont from 'next/font/local';
import { routing } from '@/i18n/routing';
import { AuthProvider } from '@/context/AuthContext';
import ProfileGuard from '@/components/auth/ProfileGuard';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import IdeaFloatingButton from '@/components/ui/IdeaFloatingButton';
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "../globals.css";

const thmanyah = localFont({
  src: [
    { path: '../../fonts/thmanyah-serif-display-regular.woff2', weight: '400', style: 'normal' },
    { path: '../../fonts/thmanyah-serif-display-medium.woff2', weight: '500', style: 'normal' },
    { path: '../../fonts/thmanyah-serif-display-bold.woff2', weight: '700', style: 'normal' },
    { path: '../../fonts/thmanyah-serif-display-black.woff2', weight: '900', style: 'normal' }
  ],
  variable: '--font-thmanyah',
  display: 'swap',
});

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "IEEE Qassim Tech Community",
  description: "The Official IEEE Qassim Technology Community Platform",
  openGraph: {
    title: "IEEE Qassim Tech Community",
    description: "The Official IEEE Qassim Technology Community Platform",
    siteName: "IEEE Qassim",
  },
  twitter: {
    card: "summary_large_image",
    title: "IEEE Qassim Tech Community",
    description: "The Official IEEE Qassim Technology Community Platform",
  }
};

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}>) {
  // Await the params promise in Next.js 15
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }
 
  // Providing all messages to the client side
  const messages = await getMessages();

  // Determine direction based on locale
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body
        className={`${cairo.variable} ${inter.variable} ${thmanyah.variable} font-sans antialiased bg-gray-50 text-gray-900`}
      >
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <ProfileGuard>
              <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-grow">
                  {children}
                </main>
                <Footer />
                <IdeaFloatingButton />
              </div>
            </ProfileGuard>
          </AuthProvider>
        </NextIntlClientProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
