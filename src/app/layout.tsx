import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import NextTopLoader from 'nextjs-toploader';
import "./globals.css";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Make Place - Your Personal Board",
  description: "A permission-centric personal posting platform",
};

import { LayoutWrapper } from "@/components/layout/LayoutWrapper";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        <NextTopLoader color="#10b981" showSpinner={false} height={3} shadow="0 0 10px #10b981,0 0 5px #10b981" />
        <LayoutWrapper sidebar={<Sidebar />}>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  );
}
