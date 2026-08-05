import type { Metadata, Viewport } from "next";
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

/**
 * `<meta name="color-scheme" content="light dark">` を出す。
 * レンダリング開始前にブラウザへ対応テーマを伝えることで、ダークテーマ利用時の
 * 初期表示の白フラッシュ (FOUC) を抑える。
 */
export const viewport: Viewport = {
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      <body className="bg-bg text-fg flex min-h-full flex-col">{children}</body>
    </html>
  );
}
