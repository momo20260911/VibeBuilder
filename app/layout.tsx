import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/header";
import { SettingsDialog } from "@/components/settings-dialog";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Vibe Builder · AI 应用原型生成器",
  description:
    "用自然语言描述需求，AI 即刻生成可运行的单文件 HTML 应用，并实时预览。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header />
            {children}
            <SettingsDialog />
          </div>
        </Providers>
      </body>
    </html>
  );
}
