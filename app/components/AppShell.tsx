"use client";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sidebar, SidebarToggle } from "@/components/sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideShell = pathname === "/login";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  if (hideShell) return <>{children}</>;

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 lg:px-6 lg:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <SidebarToggle onToggle={() => setSidebarOpen(!sidebarOpen)} />
              <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">
                Claim Track Pro
              </h1>
            </div>
            {/* User Avatar */}
            <div className="flex items-center space-x-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">
                  Sarah Johnson
                </p>
                <p className="text-xs text-gray-600">Senior Adjuster</p>
              </div>
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#92C4D5] rounded-full flex items-center justify-center">
                <span className="text-white text-sm lg:text-base font-medium">
                  SJ
                </span>
              </div>
            </div>
          </div>
        </header>
        {/* Main Content Area */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
