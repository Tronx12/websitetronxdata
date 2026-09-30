// import Auth from "@/models/Auth";

// export const escapeRegex = (s: string) =>
//   s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// /**
//  * Returns ONE clause ({ $or: [...] }) to be AND-ed into the filter.
//  * Used by BOTH /api/survey (screen) and /api/survey/export (Excel),
//  * so search results and the downloaded file always match.
//  */
// export async function buildSurveySearchClause(
//   rawSearch: string
// ): Promise<Record<string, any> | null> {
//   const text = (rawSearch || "").trim();
//   if (!text) return null;

//   const escaped = escapeRegex(text);
//   const regex = new RegExp(escaped, "i");

//   const users = await Auth.find(
//     {
//       $or: [
//         { name: regex },
//         { fullName: regex },
//         { username: regex },
//         { email: regex },
//         { firstName: regex },
//         { lastName: regex },
//         { displayName: regex },
//       ],
//       isDeleted: { $ne: true },
//     },
//     { _id: 1 }
//   )
//     .limit(500)
//     .lean();

//   const or: any[] = [
//     { rawPaste: regex },
//     { pid: regex },
//     { projectNo: regex },
//     { supplierId: regex },
//     { country: regex },
//     { accountType: regex },
//     { panelCode: regex },
//     { description: regex },
//     { ip: regex },
//     { status: regex },
//     { tnxProjectId: regex },
//     { tnxId: regex },
//     { parentId: regex },
//     { childId: regex },
//     { respondentId: regex },
//     { respondent_id: regex },
//   ];

//   if (users.length) {
//     or.push({ createdBy: { $in: users.map((u: any) => u._id) } });
//   }

//   // dynamic survey fields (key OR value)
//   const match = (path: string) => ({
//     $regexMatch: {
//       input: {
//         $convert: { input: path, to: "string", onError: "", onNull: "" },
//       },
//       regex: escaped,
//       options: "i",
//     },
//   });

//   or.push({
//     $expr: {
//       $gt: [
//         {
//           $size: {
//             $filter: {
//               input: { $objectToArray: { $ifNull: ["$data", {}] } },
//               as: "field",
//               cond: { $or: [match("$$field.k"), match("$$field.v")] },
//             },
//           },
//         },
//         0,
//       ],
//     },
//   });

//   return { $or: or };
// }

import Auth from "@/models/Auth";
import SurveyData from "@/models/SurveyData";

export const escapeRegex = (s: string) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Keep only the field names that exist in the model's schema. */
function existingFields(model: any, fields: string[]): string[] {
  return fields.filter((f) => !!model.schema.path(f));
}

/**
 * Returns ONE clause ({ $or: [...] }) to be AND-ed into the filter.
 * Used by BOTH /api/survey (screen) and /api/survey/export (Excel).
 */
export async function buildSurveySearchClause(
  rawSearch: string
): Promise<Record<string, any> | null> {
  const text = (rawSearch || "").trim();
  if (!text) return null;

  const escaped = escapeRegex(text);
  const regex = new RegExp(escaped, "i");

  // ---------- 1. users (name / email ...) ----------
  const userFields = existingFields(Auth, [
    "name",
    "fullName",
    "username",
    "email",
    "firstName",
    "lastName",
    "displayName",
  ]);

  let matchingUserIds: any[] = [];

  if (userFields.length > 0) {
    const userQuery: any = {
      $or: userFields.map((f) => ({ [f]: regex })),
    };
    if (Auth.schema.path("isDeleted")) {
      userQuery.isDeleted = { $ne: true };
    }

    const users = await Auth.find(userQuery, { _id: 1 }).limit(500).lean();
    matchingUserIds = users.map((u: any) => u._id);
  }

  // ---------- 2. survey fields that really exist ----------
  const surveyFields = existingFields(SurveyData, [
    "pid",
    "projectNo",
    "supplierId",
    "country",
    "accountType",
    "panelCode",
    "description",
    "ip",
    "status",
    "tnxProjectId",
    "tnxId",
    "parentId",
    "childId",
    "respondentId",
    "respondent_id",
  ]);

  const or: any[] = surveyFields.map((f) => ({ [f]: regex }));

  if (matchingUserIds.length > 0) {
    or.push({ createdBy: { $in: matchingUserIds } });
  }

  // ---------- 3. dynamic survey fields (key OR value) ----------
  const match = (path: string) => ({
    $regexMatch: {
      input: {
        $convert: { input: path, to: "string", onError: "", onNull: "" },
      },
      regex: escaped,
      options: "i",
    },
  });

  or.push({
    $expr: {
      $gt: [
        {
          $size: {
            $filter: {
              input: { $objectToArray: { $ifNull: ["$data", {}] } },
              as: "field",
              cond: { $or: [match("$$field.k"), match("$$field.v")] },
            },
          },
        },
        0,
      ],
    },
  });

  console.log("SEARCH FIELDS USED:", {
    text,
    userFields,
    surveyFields,
    matchingUsers: matchingUserIds.length,
  });

  return { $or: or };
}