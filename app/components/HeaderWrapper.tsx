// components/HeaderWrapper.tsx
"use client";

import { usePathname } from "next/navigation";
import { HeaderUser } from "./HeaderUser";

export function HeaderWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const showHeader = false; // Remove top-most header; AppShell provides the page header

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top-most header removed to avoid duplication. */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
