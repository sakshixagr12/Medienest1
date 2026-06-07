import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClinicProvider } from "@/context/ClinicContext";
import ServiceWorkerKiller from "@/components/ServiceWorkerKiller";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#170337",
};

export const metadata: Metadata = {
  title: "Jirova Care — Clinic Management Platform",
  description:
    "Jirova Care: The all-in-one digital clinic management system for modern healthcare providers. AI-powered prescriptions, billing, and patient records.",
  openGraph: {
    title: "Jirova Care — Digital Clinic Platform",
    description: "Modern healthcare management with AI patient summaries.",
    type: "website",
    url: "https://jirovacarev1.vercel.app",
    siteName: "Jirova Care",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jirova Care — AI Clinic Hub",
    description: "Transforming healthcare with digital clinic solutions.",
  },
  icons: {
    icon: "/favicon.png",
  },
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
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ServiceWorkerKiller />
        <ClinicProvider>{children}</ClinicProvider>
      </body>
    </html>
  );
}
