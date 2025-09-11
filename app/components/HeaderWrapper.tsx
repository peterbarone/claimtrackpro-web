// components/HeaderWrapper.tsx
"use client";

import { usePathname } from "next/navigation";
import { HeaderUser } from "./HeaderUser";

export function HeaderWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const showHeader = pathname !== "/login";

  return (
    <div className="flex flex-col min-h-screen">
      {showHeader && (
        <header className="flex justify-between items-center px-4 py-2 border-b">
          <h1 className="text-lg font-semibold">ClaimTrackPro</h1>
          <HeaderUser />
        </header>
      )}
      <main className="flex-1">{children}</main>
    </div>
  );
}
