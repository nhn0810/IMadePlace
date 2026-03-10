import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import "./globals.css";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Make Place - Your Personal Board",
  description: "A permission-centric personal posting platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900 flex">
        <Sidebar />
        <main className="flex-1 min-w-0 max-w-4xl mx-auto w-full bg-white min-h-screen shadow-sm border-x border-slate-200">
          {children}
        </main>
      </body>
    </html>
  );
}
