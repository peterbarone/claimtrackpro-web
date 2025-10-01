"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Menu as MenuIcon,
  X as XIcon,
  CheckSquare as CheckSquareIcon,
  LayoutDashboard as LayoutDashboardIcon,
  FileText as FileTextIcon,
  Settings as SettingsIcon,
  User as UserIcon,
  Users as UsersIcon,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onToggleAction: () => void;
  isCollapsed?: boolean;
  onToggleCollapseAction?: () => void;
}

const navigationItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
  { name: "Claims", href: "/claims", icon: FileTextIcon },
  { name: "Carriers", href: "/carriers", icon: FileTextIcon },
  { name: "Address Book", href: "/address-book", icon: UsersIcon },
  { name: "Tasks", href: "/tasks", icon: CheckSquareIcon },
  { name: "Staff", href: "/staff", icon: UsersIcon },
  { name: "Settings", href: "/settings", icon: SettingsIcon },
];

const bottomNavigationItems = [
  { name: "Profile/Account", href: "/profile", icon: UserIcon },
];

export function Sidebar({
  isOpen,
  onToggleAction,
  isCollapsed = false,
  onToggleCollapseAction,
}: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggleAction}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50",
          "transition-all duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:static lg:z-auto",
          isCollapsed ? "lg:w-16" : "lg:w-60",
          "w-60",
        ].join(" ")}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b border-gray-200"
          style={{ padding: "20px 16px" }}
        >
          {!isCollapsed && (
            <h2 className="text-lg font-semibold text-gray-900">
              Claims Manager
            </h2>
          )}
          <div className="flex items-center space-x-2">
            {onToggleCollapseAction && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleCollapseAction}
                className="hidden lg:flex"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <MenuIcon className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleAction}
              className="lg:hidden"
              aria-label="Close sidebar"
            >
              <XIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Main Navigation */}
        <nav
          className="p-4 flex-1"
          style={{ padding: "20px 5px" }}
          aria-label="Primary"
        >
          <ul className="space-y-2">
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={[
                      "flex items-center px-3 py-2 text-sm font-medium",
                      "text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900",
                      "transition-colors duration-200 group",
                      isCollapsed ? "justify-center" : "",
                    ].join(" ")}
                    onClick={() => {
                      if (
                        typeof window !== "undefined" &&
                        window.innerWidth < 1024
                      ) {
                        onToggleAction();
                      }
                    }}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <IconComponent
                      className={[
                        isCollapsed ? "h-6 w-6" : "h-5 w-5",
                        "text-gray-500 group-hover:text-gray-700",
                        isCollapsed ? "" : "mr-3",
                      ].join(" ")}
                    />
                    {!isCollapsed && item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Navigation */}
        <div
          className="p-4 border-t border-gray-200"
          style={{ padding: "20px 5px" }}
        >
          <ul className="space-y-2">
            {bottomNavigationItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={[
                      "flex items-center px-3 py-2 text-sm font-medium",
                      "text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900",
                      "transition-colors duration-200 group",
                      isCollapsed ? "justify-center" : "",
                    ].join(" ")}
                    onClick={() => {
                      if (
                        typeof window !== "undefined" &&
                        window.innerWidth < 1024
                      ) {
                        onToggleAction();
                      }
                    }}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <IconComponent
                      className={[
                        isCollapsed ? "h-6 w-6" : "h-5 w-5",
                        "text-gray-500 group-hover:text-gray-700",
                        isCollapsed ? "" : "mr-3",
                      ].join(" ")}
                    />
                    {!isCollapsed && item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </>
  );
}

export function SidebarToggle({
  onToggleAction,
}: {
  onToggleAction: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggleAction}
      className="lg:hidden"
      aria-label="Open sidebar"
    >
      <MenuIcon className="h-5 w-5" />
    </Button>
  );
}
