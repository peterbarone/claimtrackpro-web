"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login"); // or router.push('/') if you want homepage
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="rounded-xl border px-3 py-1 hover:bg-gray-100 disabled:opacity-50"
    >
      {loading ? "Logging out…" : "Logout"}
    </button>
  );
}
