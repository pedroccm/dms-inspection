import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DMS Inspection",
  description:
    "Sistema de inspeção de campo para DMS Manutenção - Inspeção de religadores para Copel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
