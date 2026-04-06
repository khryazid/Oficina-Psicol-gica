import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";

const inter = Inter({ 
  subsets: ["latin"],
  display: "swap", 
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Oficina Digital - Práctica Psicológica",
  description: "Atención psicológica profesional y gestión de citas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans antialiased min-h-screen selection:bg-primary/20 flex flex-col">
        <Navbar />
        <main className="flex-grow flex flex-col w-full">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
