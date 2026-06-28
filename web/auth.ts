// Auth.js (NextAuth v5) configuration.
//
// Twitch is the primary sign-in (it's a Twitch trading tool); Google is offered
// too. Providers are only enabled when their credentials are present, so the app
// builds and runs with no auth configured (it just falls back to localStorage).
//
// Required env when enabling auth:
//   AUTH_SECRET            (run: npx auth secret)
//   AUTH_TWITCH_ID / AUTH_TWITCH_SECRET   (Twitch dev console app)
//   AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET   (optional; Google Cloud OAuth client)

import NextAuth, { type NextAuthConfig } from "next-auth";
import Twitch from "next-auth/providers/twitch";
import Google from "next-auth/providers/google";

const providers: NextAuthConfig["providers"] = [];
if (process.env.AUTH_TWITCH_ID && process.env.AUTH_TWITCH_SECRET) providers.push(Twitch);
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) providers.push(Google);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  trustHost: true,
  callbacks: {
    session({ session, token }) {
      // Expose a stable per-user id (provider account id) on the session.
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
