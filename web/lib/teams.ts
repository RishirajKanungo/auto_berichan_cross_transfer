// Unified team storage: cloud (signed-in, via /api/teams) or localStorage.
// The `cloud` flag is decided by the caller from auth state.

import * as local from "./teamStore";
import { parseTeam, teamToShowdown } from "./teamParser";
import type { Pokemon } from "./types";

export async function listTeams(cloud: boolean): Promise<string[]> {
  if (!cloud) return local.listTeams();
  const res = await fetch("/api/teams");
  if (!res.ok) throw new Error("Could not load your saved teams.");
  return (await res.json()).teams ?? [];
}

export async function saveTeam(cloud: boolean, name: string, team: Pokemon[]): Promise<void> {
  if (!cloud) return local.saveTeam(name, team);
  const res = await fetch("/api/teams", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, showdown: teamToShowdown(team) }),
  });
  if (!res.ok) throw new Error("Could not save to your account.");
}

export async function loadTeam(cloud: boolean, name: string): Promise<Pokemon[]> {
  if (!cloud) return local.loadTeam(name);
  const res = await fetch(`/api/teams?name=${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error("Could not load that team.");
  return parseTeam((await res.json()).showdown ?? "");
}

export async function deleteTeam(cloud: boolean, name: string): Promise<void> {
  if (!cloud) return local.deleteTeam(name);
  await fetch(`/api/teams?name=${encodeURIComponent(name)}`, { method: "DELETE" });
}
