"use client";

import useSWR from "swr";

type User = {
  id: string;
  email: string | null;
  first_name?: string | null;
  last_name?: string | null;
  role?: { id: string; name: string } | string | null;
};

type MeResponse = { ok: boolean; user: User | null };

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then(async (r) => {
    const data = (await r.json()) as MeResponse;
    if (!r.ok) throw Object.assign(new Error("Failed to load user"), { data });
    return data;
  });

/** Returns { user, loading, error, refresh } */
export function useUser() {
  const { data, error, isLoading, mutate } = useSWR<MeResponse>(
    "/api/auth/me",
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    user: data?.user ?? null,
    loading: isLoading,
    error: error as Error | undefined,
    refresh: () => mutate(),
  };
}
