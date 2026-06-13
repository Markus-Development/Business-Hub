import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n";
import { TopNav } from "@/components/TopNav";
import { Sidebar } from "@/components/Sidebar";
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
          <div className="flex flex-1">
            {/* Left sidebar on >= sm. Below sm it lives inside the TopNav
                hamburger Sheet. Sticky below the 3.5rem-tall header so it
                scrolls independently of the main content. */}
            <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 border-r border-border sm:block">
              <Sidebar />
            </aside>
            <main className="min-w-0 flex-1">
              <div className="mx-auto w-full max-w-screen-2xl px-4 py-4 sm:px-6 sm:py-6">
                {children}
              </div>
            </main>
          </div>
          <Toaster richColors closeButton position="top-right" />
        </LocaleProvider>
      </body>
    </html>
  );
}
