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

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="bg-white rounded-xl shadow p-6">
        <p className="text-lg">
          Welcome, <span className="font-semibold">{user.email}</span>!
        </p>
        {/* Add more user info or dashboard widgets here */}
      </div>
    </div>
  );
}
