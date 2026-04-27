import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aura — Your Commander Journey Remembered",
  description: "Post-game review app for Magic: The Gathering Commander players",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
