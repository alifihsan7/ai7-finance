import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ai7.finance — Deep Sea Financial System",
  description: "Bi-weekly paycheck allocation & financial dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="bg-abyss text-foam antialiased selection:bg-sodium selection:text-abyss">
        {children}
      </body>
    </html>
  );
}
