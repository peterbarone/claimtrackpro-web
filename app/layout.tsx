// app/layout.tsx
import type { Metadata } from "next";
import AppShell from "./components/AppShell";
import { HeaderWrapper } from "./components/HeaderWrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClaimTrackPro",
  description: "Insurance claim tracking system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Next.js App Router doesn't give pathname here directly,
  // so we’ll use a client component wrapper for the conditional header.
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <HeaderWrapper>{children}</HeaderWrapper>
      </body>
    </html>
  );
}
