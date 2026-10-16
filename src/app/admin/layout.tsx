import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { manrope, georgian } from '../fonts';
import '../globals.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: { default: 'ASPOR Admin', template: '%s · ASPOR Admin' }, robots: { index: false, follow: false } };

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka" className={`${manrope.variable} ${georgian.variable}`}>
      <body className="min-h-screen bg-studio antialiased">
        <NextIntlClientProvider locale="ka">{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
