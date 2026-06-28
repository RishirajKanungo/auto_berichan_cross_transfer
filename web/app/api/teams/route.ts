import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  dbConfigured, deleteUserTeam, getUserTeam, listUserTeams, saveUserTeam,
} from "@/lib/db";

async function userId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET(req: Request) {
  const uid = await userId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "no-db" }, { status: 503 });

  const name = new URL(req.url).searchParams.get("name");
  if (name) return NextResponse.json({ showdown: await getUserTeam(uid, name) });
  return NextResponse.json({ teams: await listUserTeams(uid) });
}

export async function POST(req: Request) {
  const uid = await userId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "no-db" }, { status: 503 });

  const { name, showdown } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name-required" }, { status: 400 });
  await saveUserTeam(uid, name.trim(), String(showdown ?? ""));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const uid = await userId();
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!dbConfigured) return NextResponse.json({ error: "no-db" }, { status: 503 });

  const name = new URL(req.url).searchParams.get("name");
  if (name) await deleteUserTeam(uid, name);
  return NextResponse.json({ ok: true });
}
