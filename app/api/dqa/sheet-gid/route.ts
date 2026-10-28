import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

const SHEET_ID =
  process.env.DQA_SHEET_ID ||
  process.env.NEXT_PUBLIC_DQA_SHEET_ID ||
  "154f6pemEnid-mgnv3CGEuC4pAv0XjlNIdcRpONb3KAo";

export async function GET(req: NextRequest) {
  try {
    const pid = req.nextUrl.searchParams.get("pid")?.trim();

    if (!pid) {
      return NextResponse.json(
        {
          success: false,
          message: "PID is required",
        },
        { status: 400 }
      );
    }

    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;

    if (!clientEmail) {
      return NextResponse.json(
        {
          success: false,
          message: "GOOGLE_CLIENT_EMAIL is missing",
        },
        { status: 500 }
      );
    }

    if (!privateKeyRaw) {
      return NextResponse.json(
        {
          success: false,
          message: "GOOGLE_PRIVATE_KEY is missing",
        },
        { status: 500 }
      );
    }

    const privateKey = privateKeyRaw
      .replace(/^"|"$/g, "")
      .replace(/\\n/g, "\n");

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
      ],
    });

    const sheets = google.sheets({
      version: "v4",
      auth,
    });

    const response = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
      fields:
        "spreadsheetId,properties(title),sheets(properties(sheetId,title))",
    });

    const sheetTabs = response.data.sheets || [];

    console.log(
      "Available tabs:",
      sheetTabs.map((sheet) => ({
        title: sheet.properties?.title,
        gid: sheet.properties?.sheetId,
      }))
    );

    const sheet = sheetTabs.find((sheet) => {
      const title = String(
        sheet.properties?.title || ""
      ).trim();

      return title.toLowerCase() === pid.toLowerCase();
    });

    if (!sheet?.properties?.sheetId) {
      return NextResponse.json(
        {
          success: false,
          message: `No Google Sheet tab found for PID: ${pid}`,
          spreadsheetId: SHEET_ID,
          availableTabs: sheetTabs.map((s) => ({
            title: s.properties?.title,
            gid: s.properties?.sheetId,
          })),
        },
        { status: 404 }
      );
    }

    const gid = sheet.properties.sheetId;

    return NextResponse.json({
      success: true,
      pid,
      gid,
      sheetTitle: sheet.properties.title,
      spreadsheetId: SHEET_ID,
    });
  } catch (error: any) {
    console.error("Google Sheet GID lookup error:", error);

    let message = "Failed to find Google Sheet tab";

    if (error?.code === 403) {
      message =
        "Google service account does not have permission to access this spreadsheet";
    }

    if (error?.code === 404) {
      message =
        "Google spreadsheet was not found. Check the Spreadsheet ID";
    }

    if (
      error?.message?.includes("DECODER") ||
      error?.message?.includes("private key")
    ) {
      message =
        "Invalid GOOGLE_PRIVATE_KEY. Check the service account private key";
    }

    return NextResponse.json(
      {
        success: false,
        message,
        error:
          process.env.NODE_ENV === "development"
            ? error?.message
            : undefined,
      },
      { status: 500 }
    );
  }
}