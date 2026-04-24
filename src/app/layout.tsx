import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PostHogProvider } from "@/components/posthog-provider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1B2B5E",
};

export const metadata: Metadata = {
  title: "DMS Inspection",
  description:
    "Sistema de inspeção de campo para DMS Manutenção - Inspeção de religadores para Copel",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DMS Inspection",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased">
        <PostHogProvider />
        {children}
      </body>
    </html>
  );
}
