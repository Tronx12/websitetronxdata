import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import Leave from "@/models/Leave";
import Auth from "@/models/Auth";

import { connectDB } from "@/config/db";
import { createAuditLog } from "@/lib/auditLog";
import { getCurrentUser } from "@/lib/getuser";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: NextRequest,
  { params }: Params
) {
  try {
    /*
     * =====================================================
     * AUTHENTICATION
     *
     * Never trust:
     * - x-user-id
     * - body.userId
     *
     * The authenticated employee comes from
     * getCurrentUser().
     * =====================================================
     */

    const currentUser =
      await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    await connectDB();

    /*
     * =====================================================
     * LEAVE ID
     * =====================================================
     */

    const { id } = await params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid leave id",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * LOAD CURRENT USER
     * =====================================================
     */

    const user =
      await Auth.findById(
        currentUser.userId
      )
        .select(
          "_id name email role isActive"
        )
        .lean();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    /*
     * Account must be active.
     */

    if (user.isActive !== true) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your account is inactive",
        },
        { status: 403 }
      );
    }

    /*
     * =====================================================
     * LOAD LEAVE
     * =====================================================
     */

    const leave =
      await Leave.findById(id);

    if (!leave) {
      return NextResponse.json(
        {
          success: false,
          message: "Leave not found",
        },
        { status: 404 }
      );
    }

    /*
     * =====================================================
     * OWNERSHIP CHECK
     *
     * User can cancel ONLY their own leave.
     * =====================================================
     */

    if (
      String(leave.employeeId) !==
      String(currentUser.userId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You can cancel only your own leave.",
        },
        { status: 403 }
      );
    }

    /*
     * =====================================================
     * FINALIZED REQUEST CHECK
     *
     * Approved, rejected and already cancelled
     * requests cannot be cancelled.
     * =====================================================
     */

    if (
      [
        "APPROVED",
        "REJECTED",
        "CANCELLED",
      ].includes(leave.status)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This leave can no longer be cancelled.",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * CANCEL LEAVE
     * =====================================================
     */

    leave.status = "CANCELLED";

    leave.currentApprovalLevel = null;

    await leave.save();

    /*
     * =====================================================
     * AUDIT LOG
     * =====================================================
     */

    await createAuditLog({
      userId:
        currentUser.userId,

      action: "UPDATE",

      module:
        "Leave Management",

      description:
        `Cancelled leave ${leave._id.toString()}`,

      entityType:
        "Leave",

      entityId:
        leave._id.toString(),

      metadata: {
        leaveId:
          leave._id.toString(),

        employeeId:
          currentUser.userId,

        employeeRole:
          user.role,

        previousStatus:
          leave.status,
      },
    });

    /*
     * =====================================================
     * RESPONSE
     * =====================================================
     */

    return NextResponse.json({
      success: true,
      message: "Leave cancelled.",
      data: leave,
    });
  } catch (error) {
    console.error(
      "POST /api/leaves/[id]/cancel error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Internal server error",
      },
      { status: 500 }
    );
  }
}