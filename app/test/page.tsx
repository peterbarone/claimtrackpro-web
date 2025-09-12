"use client";

import { useState } from "react";
import { useUser } from "../lib/use-user"; // or wherever you placed your useUser hook

export default function TestPage() {
  const { user, loading, error, refresh } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [claims, setClaims] = useState<any[] | null>(null);
  const [claimsMsg, setClaimsMsg] = useState("");

  async function handleLogin() {
    setMsg("Logging in...");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      setMsg("Login success. Refreshing user...");
      await refresh();
    } else {
      const data = await res.json();
      setMsg(`Login failed: ${data?.error || res.statusText}`);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    await refresh();
  }

  // Fetch claims for the logged-in user
  async function loadClaims() {
    setClaimsMsg("Loading claims...");
    setClaims(null);
    const r = await fetch("/api/auth/claims", { credentials: "include" });
    const data = await r.json();
    if (!r.ok || !data?.ok) {
      setClaimsMsg(`Failed: ${data?.error || r.statusText}`);
      return;
    }
    setClaimsMsg(`Loaded ${data.data.length} item(s)`);
    setClaims(data.data);
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Directus API Test Page</h1>

      <section>
        <h2>Status</h2>
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: "red" }}>Error: {error.message}</p>}
        {user ? (
          <pre>{JSON.stringify(user, null, 2)}</pre>
        ) : (
          <p>No user logged in.</p>
        )}
      </section>

      <section>
        <h2>Login</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ marginRight: "0.5rem" }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginRight: "0.5rem" }}
        />
        <button onClick={handleLogin}>Login</button>
        <p>{msg}</p>
      </section>

      <section>
        <h2>Actions</h2>
        <button onClick={refresh} style={{ marginRight: "0.5rem" }}>
          Refresh User
        </button>
        <button onClick={handleLogout}>Logout</button>
      </section>

      <section>
        <h2>Claims</h2>
        <button onClick={loadClaims}>Load Claims</button>
        <p>{claimsMsg}</p>
        {claims && <pre>{JSON.stringify(claims, null, 2)}</pre>}
      </section>
    </div>
  );
}
