import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n";
import { TopNav } from "@/components/TopNav";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Business Hub",
  description: "Markus's operating dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <LocaleProvider>
          <TopNav />
          <main className="flex-1 mx-auto w-full max-w-screen-2xl px-4 py-4 sm:px-6 sm:py-6">
            {children}
          </main>
          <Toaster richColors closeButton position="top-right" />
        </LocaleProvider>
      </body>
    </html>
  );
}
