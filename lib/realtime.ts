// export type RealtimeEvent =
//   | {
//       type: "oe-submitted";
//       oeId?: string;
//       memberName?: string;
//       pid?: string;
//       qNumber?: string;
//       timestamp?: string;
//     }
//   | {
//       type: "oe-status-changed";
//       oeId?: string;
//       status?: string;
//       memberName?: string;
//       approvedBy?: string;
//       approvedTime?: string;
//       rejectReason?: string;
//       dqaCorrection?: string;
//       timestamp?: string;
//     }
//   | {
//       type: "result-updated";
//       oeId?: string;
//       memberName?: string;
//       status?: string;
//       timestamp?: string;
//     }
//   | {
//       type: "oe-locked";
//       oeId: string;
//       dqaName: string;
//       startedAt: string;
//     }
//   | {
//       type: "oe-unlocked";
//       oeId: string;
//     }
//   | {
//       type: "current-locks";
//       locks: Array<{
//         oeId: string;
//         dqaName: string;
//         startedAt: string;
//         expiresAt: number;
//       }>;
//     }
//   | {
//       type: "oe-start-result";
//       success: boolean;
//       oeId?: string;
//       lockedBy?: string;
//       startedAt?: string;
//       message?: string;
//     };

// export function getRealtimeUrl() {
//   if (typeof window === "undefined") {
//     return "";
//   }

//   return (
//     process.env.NEXT_PUBLIC_DQA_WS_URL ||
//     "https://oe-websocket.onrender.com"
//   );
// }


export type RealtimeLock = {
  oeId: string;
  dqaName: string;
  startedAt: string;
  expiresAt: number;
};

export type RealtimeEvent =
  | {
      type: "oe-submitted";
      oeId?: string;
      memberName?: string;
      pid?: string;
      qNumber?: string;
      timestamp?: string;
    }

  | {
      type: "oe-status-changed";
      oeId?: string;
      status?: string;
      memberName?: string;
      approvedBy?: string;
      approvedTime?: string;
      rejectReason?: string;
      dqaCorrection?: string;
      timestamp?: string;
    }

  | {
      type: "result-updated";
      oeId?: string;
      memberName?: string;
      status?: string;
      timestamp?: string;
    }

  | {
      type: "oe-locked";
      oeId: string;
      dqaName: string;
      startedAt: string;
      expiresAt: number;
    }

  | {
      type: "oe-unlocked";
      oeId: string;
      dqaName?: string;
      reason?: string;
    }

  | {
      type: "current-locks";
      locks: RealtimeLock[];
    }

  | {
      type: "oe-start-result";
      success: boolean;
      oeId?: string;
      dqaName?: string;
      lockedBy?: string;
      startedAt?: string;
      expiresAt?: number;
      message?: string;
    }

  | {
      type: "oe-heartbeat-result";
      success: boolean;
      oeId?: string;
      expiresAt?: number;
      message?: string;
    }

  | {
      type: "oe-lock-expired";
      oeId: string;
    }

  | {
      type: "error";
      message?: string;
    };

export function getRealtimeUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const configured =
    process.env.NEXT_PUBLIC_DQA_WS_URL?.trim();

  if (configured) {
    return configured
      .replace(/^https:\/\//i, "wss://")
      .replace(/^http:\/\//i, "ws://");
  }

  return "wss://oe-websocket.onrender.com";
}