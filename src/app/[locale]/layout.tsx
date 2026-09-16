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
import "../globals.css";

const thmanyah = localFont({
  src: [
    { path: '../../fonts/thmanyah-serif-display-light.otf', weight: '300', style: 'normal' },
    { path: '../../fonts/thmanyah-serif-display-regular.otf', weight: '400', style: 'normal' },
    { path: '../../fonts/thmanyah-serif-display-medium.otf', weight: '500', style: 'normal' },
    { path: '../../fonts/thmanyah-serif-display-bold.otf', weight: '700', style: 'normal' },
    { path: '../../fonts/thmanyah-serif-display-black.otf', weight: '900', style: 'normal' }
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
  title: "Tech Community Platform | IEEE Qassim University",
  description: "University Student Technology Community - College of Engineering",
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
      </body>
    </html>
  );
}
