import { NextRequest, NextResponse } from "next/server";

function getClientIp(
  request: NextRequest
): string {
  const forwarded =
    request.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded
      .split(",")[0]
      .trim();
  }

  return (
    request.headers.get("x-real-ip") ||
    ""
  );
}

export async function GET(
  request: NextRequest
) {
  try {
    const ip = getClientIp(request);

    return NextResponse.json({
      success: true,
      ip,
    });
  } catch (error) {
    console.error(
      "GET CURRENT IP ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to determine IP",
      },
      { status: 500 }
    );
  }
}