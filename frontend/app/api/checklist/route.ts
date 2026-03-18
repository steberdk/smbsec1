import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabaseFromAuth(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is required.");
  if (!anon) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is required.");

  const auth = req.headers.get("authorization") ?? "";
  // We rely on RLS + user JWT
  return createClient(url, anon, {
    global: { headers: { Authorization: auth } },
    db: { schema: "smbsec1" },
  });
}

export async function GET(req: Request) {
  try {
    const supabase = supabaseFromAuth(req);

    // Validate token and get user id
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user_id = userData.user.id;

    const { data, error } = await supabase
      .from("user_checklists")
      .select("data, updated_at")
      .eq("user_id", user_id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: data?.data ?? null,
      updated_at: data?.updated_at ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = supabaseFromAuth(req);

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user_id = userData.user.id;
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Upsert user row (works with RLS policies above)
    const { error } = await supabase
      .from("user_checklists")
      .upsert({ user_id, data: body }, { onConflict: "user_id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
