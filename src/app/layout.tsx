import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/auth-provider';
import { DateProvider } from '@/components/providers/date-provider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Coach - Your AI Health & Fitness Companion',
  description:
    'A conversational AI coach that helps you track your health, fitness, and wellness journey through natural conversation.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <DateProvider>
            {children}
          </DateProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
