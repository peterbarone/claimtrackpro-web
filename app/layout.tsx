import type { Metadata } from "next";
import { HeaderUser } from "./components/HeaderUser";
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
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex justify-between items-center px-4 py-2 border-b">
          <h1 className="text-lg font-semibold">ClaimTrackPro</h1>
          <HeaderUser />
        </header>

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
