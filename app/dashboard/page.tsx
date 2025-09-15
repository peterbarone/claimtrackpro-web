"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) throw new Error("Not authenticated");
        const data = await res.json();
        setUser(data.user);
      } catch (err) {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [router]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!user) return null;

  const displayName =
    user.first_name || user.last_name
      ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
      : user.email;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="bg-white rounded-xl shadow p-6">
        <p className="text-lg">
          Welcome, <span className="font-semibold">{displayName}</span>!
        </p>
        <p className="mt-2 text-sm text-gray-600">This is your dashboard.</p>
      </div>
      <div className="mt-6 bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-2">Your Claims</h2>
        <p className="text-sm text-gray-600">
          You can view and manage your claims here.
        </p>
        <button
          onClick={() => router.push("/claims")}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          View Claims
        </button>
      </div>
      <div className="mt-6 bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-2">Account Settings</h2>
        <p className="text-sm text-gray-600">
          Manage your account settings and preferences.
        </p>
        <button
          onClick={() => router.push("/settings")}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Account Settings
        </button>
      </div>
    </div>
  );
}
