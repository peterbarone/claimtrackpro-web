"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const search = useSearchParams();
  const router = useRouter();
  const next = search.get("next") || "/dashboard";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // simple client validation
    if (!email || !email.includes("@"))
      return setError("Please enter a valid email.");
    if (!password || password.length < 6)
      return setError("Password must be at least 6 characters.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Login failed");
      router.replace(next);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white shadow-lg rounded-2xl p-6 space-y-4"
      >
        <h1 className="text-2xl font-semibold">Sign in</h1>
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="w-full rounded-xl border p-2 outline-none focus:ring"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="w-full rounded-xl border p-2 outline-none focus:ring"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <button
          disabled={submitting}
          className="w-full rounded-xl bg-gray-900 text-white py-2 disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
