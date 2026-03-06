import { NextResponse } from "next/server";

export const runtime = "nodejs"; // keep it simple/consistent on Vercel

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "smbsec1",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
