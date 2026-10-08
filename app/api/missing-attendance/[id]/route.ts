// import { NextRequest, NextResponse } from "next/server";
// import mongoose from "mongoose";
// import MissingAttendanceRequest from "@/models/missing-attendance";
// import Attendance from "@/models/Attendance";
// import Auth from "@/models/Auth";
// import { connectDB } from "@/config/db";
// import { createAuditLog } from "@/lib/auditLog";

// type Params = {
//   params: Promise<{ id: string }>;
// };

// // GET /api/missing-attendance/[id]
// export async function GET(request: NextRequest, { params }: Params) {
//   try {
//     await connectDB();
//     const { id } = await params;

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return NextResponse.json({ error: "Invalid id" }, { status: 400 });
//     }

//     const record = await MissingAttendanceRequest.findById(id)
//       .populate("userId", "name email workingShift role")
//       .populate("reviewedBy", "name email")
//       .populate("attendanceId");

//     if (!record) {
//       return NextResponse.json({ error: "Request not found" }, { status: 404 });
//     }

//     return NextResponse.json(record);
//   } catch (error) {
//     console.error("GET /api/missing-attendance/[id] error:", error);
//     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
//   }
// }

// // PUT /api/missing-attendance/[id]  → Approve / Reject
// export async function PUT(request: NextRequest, { params }: Params) {
//   try {
//     await connectDB();
//     const { id } = await params;
//     const body = await request.json();

//     const { action, reviewedBy, reviewComment } = body; // action = "approve" | "reject"

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return NextResponse.json({ error: "Invalid id" }, { status: 400 });
//     }

//     if (!["approve", "reject"].includes(action)) {
//       return NextResponse.json(
//         { error: "action must be 'approve' or 'reject'" },
//         { status: 400 }
//       );
//     }

//     if (!reviewedBy || !mongoose.Types.ObjectId.isValid(reviewedBy)) {
//       return NextResponse.json(
//         { error: "Valid reviewedBy (TL/HR/Admin) is required" },
//         { status: 400 }
//       );
//     }

//     const requestDoc = await MissingAttendanceRequest.findById(id);
//     if (!requestDoc) {
//       return NextResponse.json({ error: "Request not found" }, { status: 404 });
//     }

//     if (requestDoc.status !== "pending") {
//       return NextResponse.json(
//         { error: `Request is already ${requestDoc.status}` },
//         { status: 400 }
//       );
//     }

//     // ────────────── REJECT ──────────────
//     if (action === "reject") {
//       requestDoc.status = "rejected";
//       requestDoc.reviewedBy = reviewedBy;
//       requestDoc.reviewComment = reviewComment || null;
//       requestDoc.reviewedAt = new Date();
//       await requestDoc.save();

//       await createAuditLog({
//         userId: reviewedBy,
//         action: "UPDATE",
//         module: "Missing Attendance",
//         description: `Rejected missing attendance request for user ${requestDoc.userId}`,
//         entityType: "MissingAttendanceRequest",
//         entityId: id,
//         metadata: { status: "rejected", reviewComment },
//       });

//       const populated = await MissingAttendanceRequest.findById(id)
//         .populate("userId", "name email")
//         .populate("reviewedBy", "name email");

//       return NextResponse.json(populated);
//     }

//     // ────────────── APPROVE ──────────────
//     // Create / Update Attendance record
//     const targetDate = new Date(requestDoc.date);
//     targetDate.setHours(0, 0, 0, 0);

//     let attendance = await Attendance.findOne({
//       userId: requestDoc.userId,
//       date: targetDate,
//     });

//     if (!attendance) {
//       attendance = new Attendance({
//         userId: requestDoc.userId,
//         date: targetDate,
//       });
//     }

//     // Apply requested times
//     if (requestDoc.requestedLoggingTime) {
//       attendance.loggingTime = requestDoc.requestedLoggingTime;
//     }
//     if (requestDoc.requestedLogoutTime) {
//       attendance.logoutTime = requestDoc.requestedLogoutTime;
//     }
//     if (requestDoc.requestedLunchStart) {
//       attendance.lunchStart = requestDoc.requestedLunchStart;
//     }
//     if (requestDoc.requestedLunchEnd) {
//       attendance.lunchEnd = requestDoc.requestedLunchEnd;
//     }

//     attendance.isManual = true;
//     attendance.updatedBy = reviewedBy;

//     // Optional: Calculate late based on requested login time
//     if (requestDoc.requestedLoggingTime) {
//       const user = await Auth.findById(requestDoc.userId).select("workingShift");
//       if (user) {
//         const login = new Date(requestDoc.requestedLoggingTime);
//         let allowedHour = 10;
//         let allowedMinute = 15;

//         if (user.workingShift === "night") {
//           allowedHour = 21;
//           allowedMinute = 45;
//         }

//         const allowedTime = new Date(login);
//         allowedTime.setHours(allowedHour, allowedMinute, 0, 0);

//         if (login > allowedTime) {
//           const diffMs = login.getTime() - allowedTime.getTime();
//           attendance.isLate = true;
//           attendance.lateByMinutes = Math.ceil(diffMs / (1000 * 60));
//         } else {
//           attendance.isLate = false;
//           attendance.lateByMinutes = 0;
//         }
//       }
//     }

//     await attendance.save();

//     // Update request
//     requestDoc.status = "approved";
//     requestDoc.reviewedBy = reviewedBy;
//     requestDoc.reviewComment = reviewComment || null;
//     requestDoc.reviewedAt = new Date();
//     requestDoc.attendanceId = attendance._id;
//     await requestDoc.save();

//     await createAuditLog({
//       userId: reviewedBy,
//       action: "UPDATE",
//       module: "Missing Attendance",
//       description: `Approved missing attendance request for user ${requestDoc.userId}`,
//       entityType: "MissingAttendanceRequest",
//       entityId: id,
//       metadata: { status: "approved", attendanceId: String(attendance._id) },
//     });

//     const populated = await MissingAttendanceRequest.findById(id)
//       .populate("userId", "name email")
//       .populate("reviewedBy", "name email")
//       .populate("attendanceId");

//     return NextResponse.json(populated);
//   } catch (error) {
//     console.error("PUT /api/missing-attendance/[id] error:", error);
//     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
//   }
// }

// // DELETE /api/missing-attendance/[id]
// export async function DELETE(request: NextRequest, { params }: Params) {
//   try {
//     await connectDB();
//     const { id } = await params;

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return NextResponse.json({ error: "Invalid id" }, { status: 400 });
//     }

//     const deleted = await MissingAttendanceRequest.findByIdAndDelete(id);

//     if (!deleted) {
//       return NextResponse.json({ error: "Request not found" }, { status: 404 });
//     }

//     await createAuditLog({
//       userId: (deleted as any).userId || null,
//       action: "DELETE",
//       module: "Missing Attendance",
//       description: `Deleted missing attendance request ${id}`,
//       entityType: "MissingAttendanceRequest",
//       entityId: id,
//     });

//     return NextResponse.json({ message: "Request deleted successfully" });
//   } catch (error) {
//     console.error("DELETE /api/missing-attendance/[id] error:", error);
//     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
//   }
// }


import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import MissingAttendanceRequest from "@/models/missing-attendance";
import Attendance from "@/models/Attendance";
import Auth from "@/models/Auth";

import { connectDB } from "@/config/db";
import { createAuditLog } from "@/lib/auditLog";

type Params = {
  params: Promise<{ id: string }>;
};

// ============================================================
// GET /api/missing-attendance/[id]
// ============================================================
export async function GET(
  request: NextRequest,
  { params }: Params
) {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid id" },
        { status: 400 }
      );
    }

    const record = await MissingAttendanceRequest.findById(id)
      .populate(
        "userId",
        "name email workingShift role"
      )
      .populate(
        "reviewedBy",
        "name email role"
      )
      .populate("attendanceId");

    if (!record) {
      return NextResponse.json(
        {
          success: false,
          error: "Request not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: record,
    });
  } catch (error: any) {
    console.error(
      "GET /api/missing-attendance/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT /api/missing-attendance/[id]
// Approve / Reject
// ============================================================
export async function PUT(
  request: NextRequest,
  { params }: Params
) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await request.json();

    const {
      action,
      reviewedBy,
      reviewComment,
    } = body;

    // --------------------------------------------------------
    // Validate request ID
    // --------------------------------------------------------
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid id",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // Validate action
    // --------------------------------------------------------
    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: "action must be 'approve' or 'reject'",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // Validate reviewer ID
    // --------------------------------------------------------
    if (
      !reviewedBy ||
      !mongoose.Types.ObjectId.isValid(reviewedBy)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid reviewedBy is required",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // Get reviewer
    // --------------------------------------------------------
    const reviewer = await Auth.findById(reviewedBy).select(
      "name email role workingShift"
    );

    if (!reviewer) {
      return NextResponse.json(
        {
          success: false,
          error: "Reviewer not found",
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------------
    // Normalize reviewer role
    // --------------------------------------------------------
    const reviewerRole = String(
      reviewer.role || ""
    )
      .trim()
      .toLowerCase()
      .replace(/_/g, "-")
      .replace(/\s+/g, "-");

    // --------------------------------------------------------
    // Allowed approval roles
    // --------------------------------------------------------
    const allowedReviewerRoles = [
      "team-lead",
      "senior-teamlead",
      "senior-team-lead",
      "hr",
      "admin",
    ];

    if (!allowedReviewerRoles.includes(reviewerRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "You are not authorized to review attendance requests",
          role: reviewer.role,
        },
        { status: 403 }
      );
    }

    // --------------------------------------------------------
    // Find missing attendance request
    // --------------------------------------------------------
    const requestDoc =
      await MissingAttendanceRequest.findById(id);

    if (!requestDoc) {
      return NextResponse.json(
        {
          success: false,
          error: "Request not found",
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------------
    // Prevent double approval/rejection
    // --------------------------------------------------------
    if (requestDoc.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          error: `Request is already ${requestDoc.status}`,
        },
        { status: 400 }
      );
    }

    // ========================================================
    // REJECT
    // ========================================================
    if (action === "reject") {
      requestDoc.status = "rejected";
      requestDoc.reviewedBy = reviewer._id;
      requestDoc.reviewComment =
        reviewComment?.trim() || null;
      requestDoc.reviewedAt = new Date();

      await requestDoc.save();

      // Audit log should not block rejection
      try {
        await createAuditLog({
          userId: reviewer._id,
          action: "UPDATE",
          module: "Missing Attendance",
          description: `Rejected missing attendance request for user ${requestDoc.userId}`,
          entityType: "MissingAttendanceRequest",
          entityId: id,
          metadata: {
            status: "rejected",
            reviewComment:
              reviewComment?.trim() || null,
            reviewerRole,
          },
        });
      } catch (auditError) {
        console.error(
          "Missing Attendance rejection audit error:",
          auditError
        );
      }

      const populated =
        await MissingAttendanceRequest.findById(id)
          .populate(
            "userId",
            "name email workingShift role"
          )
          .populate(
            "reviewedBy",
            "name email role"
          )
          .populate("attendanceId");

      return NextResponse.json({
        success: true,
        message: "Missing attendance request rejected",
        data: populated,
      });
    }

    // ========================================================
    // APPROVE
    // ========================================================

    // --------------------------------------------------------
    // Validate target employee
    // --------------------------------------------------------
    const employee = await Auth.findById(
      requestDoc.userId
    ).select(
      "name email workingShift role"
    );

    if (!employee) {
      return NextResponse.json(
        {
          success: false,
          error: "Employee associated with this request was not found",
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------------
    // Normalize attendance date
    //
    // IMPORTANT:
    // Use local calendar date instead of accidentally changing
    // the requested date because of UTC conversion.
    // --------------------------------------------------------
    const requestedDate = new Date(
      requestDoc.date
    );

    if (Number.isNaN(requestedDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid attendance date",
        },
        { status: 400 }
      );
    }

    const targetDate = new Date(requestedDate);

    targetDate.setHours(
      0,
      0,
      0,
      0
    );

    // --------------------------------------------------------
    // Find existing attendance
    // --------------------------------------------------------
    let attendance =
      await Attendance.findOne({
        userId: requestDoc.userId,
        date: targetDate,
      });

    // --------------------------------------------------------
    // Create attendance if it doesn't exist
    // --------------------------------------------------------
    if (!attendance) {
      attendance = new Attendance({
        userId: requestDoc.userId,
        date: targetDate,
      });
    }

    // --------------------------------------------------------
    // Apply requested login time
    // --------------------------------------------------------
    if (requestDoc.requestedLoggingTime) {
      const loginTime = new Date(
        requestDoc.requestedLoggingTime
      );

      if (!Number.isNaN(loginTime.getTime())) {
        attendance.loggingTime = loginTime;
      }
    }

    // --------------------------------------------------------
    // Apply requested logout time
    // --------------------------------------------------------
    if (requestDoc.requestedLogoutTime) {
      const logoutTime = new Date(
        requestDoc.requestedLogoutTime
      );

      if (!Number.isNaN(logoutTime.getTime())) {
        attendance.logoutTime = logoutTime;
      }
    }

    // --------------------------------------------------------
    // Apply lunch start
    // --------------------------------------------------------
    if (requestDoc.requestedLunchStart) {
      const lunchStart = new Date(
        requestDoc.requestedLunchStart
      );

      if (!Number.isNaN(lunchStart.getTime())) {
        attendance.lunchStart = lunchStart;
      }
    }

    // --------------------------------------------------------
    // Apply lunch end
    // --------------------------------------------------------
    if (requestDoc.requestedLunchEnd) {
      const lunchEnd = new Date(
        requestDoc.requestedLunchEnd
      );

      if (!Number.isNaN(lunchEnd.getTime())) {
        attendance.lunchEnd = lunchEnd;
      }
    }

    // --------------------------------------------------------
    // Mark attendance as manually created/updated
    // --------------------------------------------------------
    attendance.isManual = true;
    attendance.updatedBy = reviewer._id;

    // ========================================================
    // Calculate late status
    // ========================================================
    if (attendance.loggingTime) {
      const login = new Date(
        attendance.loggingTime
      );

      if (!Number.isNaN(login.getTime())) {
        let allowedHour = 10;
        let allowedMinute = 15;

        // Night shift
        if (
          String(employee.workingShift || "")
            .trim()
            .toLowerCase() === "night"
        ) {
          allowedHour = 21;
          allowedMinute = 45;
        }

        const allowedTime = new Date(login);

        allowedTime.setHours(
          allowedHour,
          allowedMinute,
          0,
          0
        );

        if (
          login.getTime() >
          allowedTime.getTime()
        ) {
          const diffMs =
            login.getTime() -
            allowedTime.getTime();

          attendance.isLate = true;

          attendance.lateByMinutes =
            Math.ceil(
              diffMs /
                (1000 * 60)
            );
        } else {
          attendance.isLate = false;
          attendance.lateByMinutes = 0;
        }
      }
    }

    // --------------------------------------------------------
    // SAVE ATTENDANCE FIRST
    //
    // If Attendance fails, MissingAttendanceRequest remains
    // pending. This prevents an approved request without
    // attendance.
    // --------------------------------------------------------
    try {
      await attendance.validate();
      await attendance.save();
    } catch (attendanceError: any) {
      console.error(
        "Attendance save error:",
        attendanceError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Failed to create/update attendance",
          message:
            attendanceError?.message ||
            "Attendance validation failed",
          details:
            attendanceError?.errors
              ? Object.fromEntries(
                  Object.entries(
                    attendanceError.errors
                  ).map(
                    ([
                      key,
                      value,
                    ]: any) => [
                      key,
                      value?.message ||
                        String(value),
                    ]
                  )
                )
              : undefined,
        },
        { status: 500 }
      );
    }

    // ========================================================
    // Attendance successfully saved
    // Now mark request as approved
    // ========================================================
    requestDoc.status = "approved";
    requestDoc.reviewedBy = reviewer._id;
    requestDoc.reviewComment =
      reviewComment?.trim() || null;
    requestDoc.reviewedAt = new Date();
    requestDoc.attendanceId = attendance._id;

    await requestDoc.save();

    // --------------------------------------------------------
    // Audit log
    //
    // Audit failure should NOT undo successful approval.
    // --------------------------------------------------------
    try {
      await createAuditLog({
        userId: reviewer._id,
        action: "UPDATE",
        module: "Missing Attendance",
        description: `Approved missing attendance request for user ${requestDoc.userId}`,
        entityType: "MissingAttendanceRequest",
        entityId: id,
        metadata: {
          status: "approved",
          attendanceId:
            String(attendance._id),
          reviewerRole,
          employeeRole: employee.role,
          attendanceDate:
            targetDate.toISOString(),
        },
      });
    } catch (auditError) {
      console.error(
        "Missing Attendance approval audit error:",
        auditError
      );
    }

    // --------------------------------------------------------
    // Return populated request
    // --------------------------------------------------------
    const populated =
      await MissingAttendanceRequest.findById(id)
        .populate(
          "userId",
          "name email workingShift role"
        )
        .populate(
          "reviewedBy",
          "name email role"
        )
        .populate("attendanceId");

    return NextResponse.json({
      success: true,
      message:
        "Missing attendance request approved successfully",
      data: populated,
    });
  } catch (error: any) {
    console.error(
      "PUT /api/missing-attendance/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message:
          error?.message ||
          "Unknown error",
        details:
          error?.errors
            ? Object.fromEntries(
                Object.entries(
                  error.errors
                ).map(
                  ([
                    key,
                    value,
                  ]: any) => [
                    key,
                    value?.message ||
                      String(value),
                  ]
                )
              )
            : undefined,
      },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE /api/missing-attendance/[id]
// ============================================================
export async function DELETE(
  request: NextRequest,
  { params }: Params
) {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid id",
        },
        { status: 400 }
      );
    }

    const deleted =
      await MissingAttendanceRequest.findByIdAndDelete(
        id
      );

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: "Request not found",
        },
        { status: 404 }
      );
    }

    // Audit failure should not block delete
    try {
      await createAuditLog({
        userId: (deleted as any).userId || null,
        action: "DELETE",
        module: "Missing Attendance",
        description: `Deleted missing attendance request ${id}`,
        entityType: "MissingAttendanceRequest",
        entityId: id,
      });
    } catch (auditError) {
      console.error(
        "Missing Attendance delete audit error:",
        auditError
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Request deleted successfully",
    });
  } catch (error: any) {
    console.error(
      "DELETE /api/missing-attendance/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message:
          error?.message ||
          "Unknown error",
      },
      { status: 500 }
    );
  }
}