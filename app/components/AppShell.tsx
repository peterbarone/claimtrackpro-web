"use client";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { Sidebar, SidebarToggle } from "@/components/sidebar";
import { useUser } from "@/lib/use-user";
import { LogoutButton } from "./LogoutButton";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideShell = pathname === "/login";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (hideShell) return <>{children}</>;

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggleAction={() => setSidebarOpen(!sidebarOpen)}
        isCollapsed={isCollapsed}
        onToggleCollapseAction={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 lg:px-6 lg:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <SidebarToggle
                onToggleAction={() => setSidebarOpen(!sidebarOpen)}
              />
              <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">
                Claim Track Pro
              </h1>
            </div>
            {/* User Section (dynamic) */}
            <HeaderUserSection />
          </div>
        </header>
        {/* Main Content Area */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

function HeaderUserSection() {
  const { user, loading } = useUser();

  const initials = useMemo(() => {
    const first = user?.first_name?.trim() || "";
    const last = user?.last_name?.trim() || "";
    const fromEmail = () =>
      user?.email ? user.email.charAt(0).toUpperCase() : "U";
    const fi = first ? first.charAt(0).toUpperCase() : "";
    const li = last ? last.charAt(0).toUpperCase() : "";
    const val = `${fi}${li}` || fromEmail();
    return val.slice(0, 2);
  }, [user]);

  const fullName = useMemo(() => {
    const first = user?.first_name?.trim();
    const last = user?.last_name?.trim();
    if (first || last) return `${first ?? ""} ${last ?? ""}`.trim();
    return user?.email ?? "";
  }, [user]);

  return (
    <div className="flex items-center space-x-3">
      <div className="hidden sm:block text-right">
        <p className="text-sm font-medium text-gray-900">
          {loading ? "Loading..." : fullName || "User"}
        </p>
        {/* Role/title if available */}
        {typeof (user as any)?.role === "object" &&
          (user as any)?.role?.name && (
            <p className="text-xs text-gray-600">{(user as any).role.name}</p>
          )}
      </div>
      <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#92C4D5] rounded-full flex items-center justify-center">
        <span className="text-white text-sm lg:text-base font-medium">
          {initials}
        </span>
      </div>
      {/* Keep logout functionality */}
      {!loading && user && <LogoutButton />}
    </div>
  );
}
