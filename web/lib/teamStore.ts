// Named teams persisted in the browser's localStorage.
// Ported from berichan/team_store.py (which used a teams.json file).

import { parseTeam, teamToShowdown } from "./teamParser";
import type { Pokemon, SavedTeam } from "./types";

const KEY = "berichan.teams";

function readAll(): SavedTeam[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeAll(teams: SavedTeam[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(teams));
}

export function listTeams(): string[] {
  return readAll().map((t) => t.name).filter(Boolean);
}

export function saveTeam(name: string, team: Pokemon[]): void {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Team name cannot be empty.");
  const teams = readAll();
  const entry: SavedTeam = { name: trimmed, showdown: teamToShowdown(team) };
  const idx = teams.findIndex((t) => t.name === trimmed);
  if (idx >= 0) teams[idx] = entry;
  else teams.push(entry);
  writeAll(teams);
}

export function loadTeam(name: string): Pokemon[] {
  const entry = readAll().find((t) => t.name === name);
  return entry ? parseTeam(entry.showdown) : [];
}

export function deleteTeam(name: string): void {
  writeAll(readAll().filter((t) => t.name !== name));
}
