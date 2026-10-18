import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ai7.finance — Obsidian Financial System",
  description: "Bi-weekly paycheck allocation & personal finance dashboard",
  icons: {
    icon: "/ai7-icon-rounded.svg",
    apple: "/ai7-icon-rounded.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-obsidian-bg text-slateText-primary font-sans antialiased selection:bg-amberGold selection:text-obsidian-bg min-h-screen">
        {children}
      </body>
    </html>
  );
}
