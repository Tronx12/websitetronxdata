import { NextRequest, NextResponse } from "next/server";

export async function POST(req:NextRequest) {
  const body = await req.json();
  const url = process.env.APPS_SCRIPT_URL;
  if (!url) return NextResponse.json({error:"APPS_SCRIPT_URL is not configured"}, {status:500});

  try {
    const upstream = await fetch(url, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(body),
      cache:"no-store",
    });
    const text = await upstream.text();
    let json:any;
    try { json = JSON.parse(text); } catch { json = {data:text}; }
    if (!upstream.ok) return NextResponse.json({error:json?.error || `Apps Script returned ${upstream.status}`},{status:502});
    return NextResponse.json(json);
  } catch (e:any) {
    return NextResponse.json({error:e?.message || "Unable to reach Apps Script"},{status:502});
  }
}
