import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ClinicProvider } from '@/context/ClinicContext';
import ServiceWorkerKiller from '@/components/ServiceWorkerKiller';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#170337',
};

export const metadata: Metadata = {
  title: 'MediNest — Clinic Management Platform',
  description: 'MediNest: The all-in-one digital clinic management system for modern healthcare providers. AI-powered prescriptions, billing, and patient records.',
  openGraph: {
    title: 'MediNest — Digital Clinic Platform',
    description: 'Modern healthcare management with AI patient summaries.',
    type: 'website',
    url: 'https://medinestv1.vercel.app',
    siteName: 'MediNest',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MediNest — AI Clinic Hub',
    description: 'Transforming healthcare with digital clinic solutions.',
  },
  icons: {
    icon: '/favicon.png',
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://integrate.api.nvidia.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <ServiceWorkerKiller />
        <ClinicProvider>
          {children}
        </ClinicProvider>
      </body>
    </html>
  );
}
