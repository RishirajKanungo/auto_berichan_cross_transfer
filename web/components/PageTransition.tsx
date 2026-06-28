"use client";

import { usePathname } from "next/navigation";

/**
 * Plays a brief fade-and-rise whenever the route changes, so moving between tabs
 * feels fluid instead of an instant swap. Keyed by pathname so the animation
 * replays on every navigation. Pure opacity/transform — cheap, and disabled
 * under prefers-reduced-motion via globals.css.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div key={pathname} className="anim-page">{children}</div>;
}
