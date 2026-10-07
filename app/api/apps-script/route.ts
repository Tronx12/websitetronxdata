import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const url = process.env.APPS_SCRIPT_URL;
  if (!url) return NextResponse.json({ error: "APPS_SCRIPT_URL is not configured" }, { status: 500 });

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const text = await upstream.text();
    let json: any;
    try { json = JSON.parse(text); } catch { json = { data: text }; }
    if (!upstream.ok) return NextResponse.json({ error: json?.error || `Apps Script returned ${upstream.status}` }, { status: 502 });
    
    return NextResponse.json(json, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unable to reach Apps Script" }, { status: 502 });
  }
}

