"use client";

import { useState, useEffect } from "react";

export type AppUser = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
};

let cachedUser: AppUser | null | undefined = undefined;
const listeners = new Set<(u: AppUser | null) => void>();

export function useUser() {
  const [user, setUser] = useState<AppUser | null | undefined>(cachedUser);

  useEffect(() => {
    const handler = (u: AppUser | null) => setUser(u);
    listeners.add(handler);

    if (cachedUser === undefined) {
      fetch("/api/auth/me")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          const u = data?.user ?? null;
          cachedUser = u;
          listeners.forEach((l) => l(u));
        })
        .catch(() => {
          cachedUser = null;
          listeners.forEach((l) => l(null));
        });
    }

    return () => { listeners.delete(handler); };
  }, []);

  return { user, loading: user === undefined };
}

export function clearUserCache() {
  cachedUser = undefined;
}
