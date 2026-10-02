import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hippocrates AI — Clinical Intelligence Platform",
  description: "AI-powered clinical intelligence for patients and doctors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-full antialiased bg-[#fcfdfe] text-slate-900" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
