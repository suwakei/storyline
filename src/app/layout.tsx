import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "storyline",
  description: "シナリオの時系列とキャラクターのつながりを整理するツール",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      <body className="bg-bg text-fg flex min-h-full flex-col">{children}</body>
    </html>
  );
}
