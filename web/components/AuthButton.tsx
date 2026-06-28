"use client";

import { useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { AUTH_ENABLED, useAuth } from "./auth";

/** Sidebar sign-in / account control. Renders nothing unless auth is enabled. */
export function AuthButton() {
  const { signedIn, user } = useAuth();
  const [providers, setProviders] = useState<string[]>([]);

  useEffect(() => {
    if (!AUTH_ENABLED) return;
    fetch("/api/auth/providers")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => setProviders(Object.keys(d || {})))
      .catch(() => {});
  }, []);

  if (!AUTH_ENABLED || providers.length === 0) return null;

  if (signedIn) {
    return (
      <div className="flex items-center gap-2">
        {user?.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" width={28} height={28} className="rounded-full" />
        )}
        <span className="muted min-w-0 flex-1 truncate text-xs">{user?.name}</span>
        <button className="btn btn-icon" title="Sign out" onClick={() => signOut()}>
          <LogOut size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {providers.includes("twitch") && (
        <button className="btn btn-primary w-full" onClick={() => signIn("twitch")}>
          Sign in with Twitch
        </button>
      )}
      {providers.includes("google") && (
        <button className="btn w-full" onClick={() => signIn("google")}>
          Sign in with Google
        </button>
      )}
    </div>
  );
}
