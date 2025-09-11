"use client";

import { useUser } from "../lib/use-user";
import { LogoutButton } from "./LogoutButton";

export function HeaderUser() {
  const { user, loading } = useUser();

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-700">
        {loading
          ? "Loading…"
          : user
          ? `Welcome, ${user.first_name ?? user.email ?? "User"}`
          : "Not signed in"}
      </span>
      {user && <LogoutButton />}
    </div>
  );
}
