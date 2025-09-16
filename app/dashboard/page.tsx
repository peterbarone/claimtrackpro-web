"use client";
import AppShell from "@/components/AppShell";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { MetricsContainer } from "@/components/metrics-container";
import { SearchBar } from "@/components/search-bar";
import { TasksContainer } from "@/components/task-container";
import { RecentClaims } from "@/components/recent-claims";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";

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

  function handleSearch(query: string): void {
    // For now, simply log the search query.
    // You can later implement filtering logic or update state as needed.
    console.log("Search query:", query);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header with New Claim Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">
              Overview of your claims management system
            </p>
          </div>
          <Link href="/claimintake">
            <Button className="bg-[#92C4D5] hover:bg-[#7BB3C7] text-white h-11 px-6">
              <PlusIcon className="h-4 w-4 mr-2" />
              New Claim
            </Button>
          </Link>
        </div>

        {/* Top Metrics Container */}
        <section>
          <MetricsContainer />
        </section>

        {/* Search Bar */}
        <section>
          <SearchBar onSearch={handleSearch} />
        </section>

        {/* Main Content Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Center Tasks Container - 1/3 width */}
          <div className="lg:col-span-1">
            <TasksContainer />
          </div>

          {/* Right Recent Claims List - 2/3 width */}
          <div className="lg:col-span-2">
            <div className="h-full min-h-[600px]">
              <RecentClaims />
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
