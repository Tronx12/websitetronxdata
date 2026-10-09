// import { NextRequest, NextResponse } from "next/server";

// export const dynamic = "force-dynamic";
// export const revalidate = 0;

// export async function POST(req: NextRequest) {
//   const body = await req.json();
//   const url = process.env.APPS_SCRIPT_URL;
//   if (!url) return NextResponse.json({ error: "APPS_SCRIPT_URL is not configured" }, { status: 500 });

//   try {
//     const upstream = await fetch(url, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "Cache-Control": "no-cache, no-store, must-revalidate",
//         "Pragma": "no-cache",
//       },
//       body: JSON.stringify(body),
//       cache: "no-store",
//     });
//     const text = await upstream.text();
//     let json: any;
//     try { json = JSON.parse(text); } catch { json = { data: text }; }
//     if (!upstream.ok) return NextResponse.json({ error: json?.error || `Apps Script returned ${upstream.status}` }, { status: 502 });
    
//     return NextResponse.json(json, {
//       headers: {
//         "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
//         "Pragma": "no-cache",
//         "Expires": "0",
//       },
//     });
//   } catch (e: any) {
//     return NextResponse.json({ error: e?.message || "Unable to reach Apps Script" }, { status: 502 });
//   }
// }



import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noCacheHeaders = {
  "Cache-Control":
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const url = process.env.APPS_SCRIPT_URL;

    if (!url) {
      return NextResponse.json(
        {
          success: false,
          error: "APPS_SCRIPT_URL is not configured",
        },
        {
          status: 500,
          headers: noCacheHeaders,
        }
      );
    }

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await upstream.text();

    let json: any;

    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = {
        success: false,
        error: text || "Invalid response from Apps Script",
      };
    }

    /*
     * Preserve the actual Apps Script status code.
     *
     * Example:
     * Apps Script 403 -> Next.js 403
     * Apps Script 400 -> Next.js 400
     * Apps Script 500 -> Next.js 500
     *
     * Only a failure to reach Apps Script is returned as 502.
     */
    if (!upstream.ok) {
      return NextResponse.json(json, {
        status: upstream.status,
        headers: noCacheHeaders,
      });
    }

    return NextResponse.json(json, {
      status: 200,
      headers: noCacheHeaders,
    });
  } catch (error: any) {
    console.error("Apps Script proxy error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unable to reach Apps Script",
      },
      {
        status: 502,
        headers: noCacheHeaders,
      }
    );
  }
}
