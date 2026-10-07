

// export type ApiResult<T = any> = T;

// export type ApiAction =
//   | "getInitialData"
//   | "checkOEQuality"
//   | "uploadImageToDrive"
//   | "submitOE"
//   | "getApprovedOEsByPID"
//   | "getMyResults"
//   | "getOEPerformance"
//   | "getSurveyPerformance"
//   | "getNotifications"
//   | "markNotificationRead"
//   | "markAllNotificationsRead";

// export async function api<T = any>(
//   action: ApiAction | string,
//   data?: Record<string, any>
// ): Promise<T> {
//   const res = await fetch("/api/apps-script", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       action,
//       data: data ?? {},
//     }),
//   });

//   let json: any;

//   try {
//     json = await res.json();
//   } catch {
//     throw new Error(`Invalid server response (${res.status})`);
//   }

//   if (!res.ok) {
//     throw new Error(
//       json?.error ||
//         json?.message ||
//         `Request failed (${res.status})`
//     );
//   }

//   if (json?.error) {
//     throw new Error(json.error);
//   }

//   return json?.data as T;
// }

export type ApiResult<T = any> = T;

export type ApiAction =
  | "getInitialData"
  | "checkOEQuality"
  | "uploadImageToDrive"
  | "submitOE"
  | "getApprovedOEsByPID"
  | "getMyResults"
  | "getOEPerformance"
  | "getSurveyPerformance"
  | "getNotifications"
  | "markNotificationRead"
  | "markAllNotificationsRead"
  | "rewriteOEAsHuman";

export async function api<T = any>(
  action: ApiAction | string,
  data?: Record<string, any>
): Promise<T> {
  const res = await fetch(`/api/apps-script?t=${Date.now()}`, {
    method: "POST",

    // IMPORTANT:
    // Prevent browser/Next request caching.
    cache: "no-store",

    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
    },

    body: JSON.stringify({
      action,
      data: data ?? {},
    }),
  });

  let json: any;

  try {
    json = await res.json();
  } catch {
    throw new Error(
      `Invalid server response (${res.status})`
    );
  }

  if (!res.ok) {
    throw new Error(
      json?.error ||
        json?.message ||
        `Request failed (${res.status})`
    );
  }

  if (json?.success === false) {
    throw new Error(
      json?.error ||
        json?.message ||
        `Request "${action}" failed.`
    );
  }

  if (json?.error) {
    throw new Error(json.error);
  }

  const result = json?.data;

  if (
    result &&
    typeof result === "object" &&
    !Array.isArray(result) &&
    result.success === false
  ) {
    throw new Error(
      result?.error ||
        result?.message ||
        `Request "${action}" failed.`
    );
  }

  return result as T;
}