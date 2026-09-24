import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { CastProvider } from '../context/CastContext';
import { Navbar } from '../components/Navbar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Dhaka Tesla Pool | Share a seat. Split the fare.',
  description:
    'Dhaka Tesla Pool MVP: Ride-pooling and fare splitting for Dhaka rush-hour traffic in zero-emission electric vehicles.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950" suppressHydrationWarning>
        <CastProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">{children}</main>
        </CastProvider>
      </body>
    </html>
  );
}
