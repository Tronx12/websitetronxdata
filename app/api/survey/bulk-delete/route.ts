import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/config/db";
import SurveyData from "@/models/SurveyData";
import Team from "@/models/Team";
import { getCurrentUser } from "@/lib/getuser";
import { createAuditLog } from "@/lib/auditLog";

function normalizeRole(role: unknown): string {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

async function handleBulkDelete(req: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();

    if (!currentUser?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(currentUser.userId)) {
      return NextResponse.json(
        { success: false, message: "Invalid authenticated user ID" },
        { status: 401 }
      );
    }

    let ids: string[] = [];

    try {
      const body = await req.json();
      if (Array.isArray(body?.ids)) {
        ids = body.ids;
      } else if (typeof body?.id === "string") {
        ids = [body.id];
      }
    } catch {
      // Body may be empty, attempt to read query parameters
    }

    if (ids.length === 0) {
      const { searchParams } = new URL(req.url);
      const queryIds = searchParams.get("ids");
      if (queryIds) {
        ids = queryIds.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { success: false, message: "No survey record IDs provided for deletion" },
        { status: 400 }
      );
    }

    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid survey record IDs provided" },
        { status: 400 }
      );
    }

    const userObjectId = new mongoose.Types.ObjectId(currentUser.userId);
    const role = normalizeRole(currentUser.role);

    const canDeleteAny =
      role === "admin" ||
      role === "hr" ||
      role === "seniorteamlead";

    const objectIds = validIds.map((id) => new mongoose.Types.ObjectId(id));
    const filter: any = { _id: { $in: objectIds } };

    if (!canDeleteAny) {
      if (role === "teamlead") {
        // Team lead can delete records created by themselves or by members of their teams
        const teams = await Team.find({
          teamLead: userObjectId,
          isActive: true,
        })
          .select("members")
          .lean();

        const allowedMemberIds = [
          ...new Set(
            teams.flatMap((t: any) =>
              (t.members || []).map((m: any) => String(m))
            )
          ),
          String(currentUser.userId),
        ].filter((id) => mongoose.Types.ObjectId.isValid(id));

        filter.createdBy = {
          $in: allowedMemberIds.map((id) => new mongoose.Types.ObjectId(id)),
        };
      } else {
        // Other users may only delete records they personally created
        filter.createdBy = userObjectId;
      }
    }

    const surveysToDelete = await SurveyData.find(filter)
      .select("_id createdBy")
      .lean();

    if (surveysToDelete.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No matching survey records found or you do not have permission to delete them",
        },
        { status: 404 }
      );
    }

    const idsToDelete = surveysToDelete.map((s: any) => s._id);
    const deleteResult = await SurveyData.deleteMany({
      _id: { $in: idsToDelete },
    });

    try {
      await createAuditLog({
        userId: currentUser.userId,
        action: "DELETE",
        module: "Survey",
        description: `Bulk deleted ${deleteResult.deletedCount} survey record(s)`,
        entityType: "SurveyData",
        metadata: {
          requestedCount: ids.length,
          deletedCount: deleteResult.deletedCount,
          deletedIds: idsToDelete.map((id: any) => String(id)),
          deletedBy: currentUser.userId,
          role: currentUser.role,
        },
      });
    } catch (auditError) {
      console.error("Survey bulk DELETE audit log error:", auditError);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deleteResult.deletedCount} record${deleteResult.deletedCount === 1 ? "" : "s"}`,
      deletedCount: deleteResult.deletedCount,
      deletedIds: idsToDelete.map((id: any) => String(id)),
    });
  } catch (error: any) {
    console.error("Survey bulk DELETE error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete survey records",
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return handleBulkDelete(req);
}

export async function DELETE(req: NextRequest) {
  return handleBulkDelete(req);
}
