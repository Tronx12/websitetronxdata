// // lib/groqSurveyNormalizer.ts

// export interface NormalizedSurveyRecord {
//   category: "B2B" | "B2H" | "B2C";

//   accountType?: string;
//   projectNo?: string;
//   surveyName?: string;
//   description?: string;

//   pid?: string;
//   tnxId?: string;
//   supplierId?: string;

//   location?: string;
//   country?: string;
//   ip?: string;
//   status?: string;

//   age?: string;
//   gender?: string;
//   jobTitle?: string;
//   industry?: string;
//   zipCode?: string;
//   department?: string;
//   employees?: string;
//   brand?: string;
//   revenue?: string;
//   company?: string;
//   nationality?: string;
//   householdIncome?: string;
//   oppo?: string;
//   studyTopic?: string;
//   recordId?: string;

//   data: Record<string, string>;
// }

// export interface GroqNormalizationResult {
//   records: NormalizedSurveyRecord[];
//   normalizedText?: string;
//   /**
//    * Populated when the paste had to be split into multiple Groq calls and
//    * one or more of those calls failed. Records from the chunks that
//    * succeeded are still returned — this is a partial-success report, not a
//    * hard failure.
//    */
//   errors?: string[];
// }

// /* ======================================================
//    CHUNKING
//    ------------------------------------------------------
//    A single Groq completion asked to normalize a large
//    paste (many blocks, some with long free-text answers)
//    can exceed what the model can reliably emit as valid
//    JSON in one shot — that's what produced the
//    "json_validate_failed" / malformed-JSON error.

//    To make this robust we split the paste into the same
//    "=====" delimited blocks the UI already recognizes,
//    then group those blocks into chunks that stay under a
//    safe character budget before sending each chunk to
//    Groq separately. One bad/oversized chunk can then only
//    affect the records in that chunk, not the whole batch.
// ====================================================== */

// // Keep each Groq call small enough that even a few
// // long-answer blocks won't push the JSON completion past
// // what the model can reliably finish.
// const MAX_CHARS_PER_CHUNK = 6000;

// function splitIntoBlocks(paste: string): string[] {
//   const hasDelimiter = /^\s*=+\s*$/m.test(paste);

//   if (!hasDelimiter) {
//     return [paste.trim()].filter(Boolean);
//   }

//   return paste
//     .split(/^\s*=+\s*$/m)
//     .map((b) => b.trim())
//     .filter(Boolean);
// }

// function chunkBlocks(blocks: string[]): string[][] {
//   const chunks: string[][] = [];
//   let current: string[] = [];
//   let currentLen = 0;

//   for (const block of blocks) {
//     const blockLen = block.length;

//     // An oversized single block gets its own chunk rather
//     // than being force-merged with others.
//     if (blockLen > MAX_CHARS_PER_CHUNK) {
//       if (current.length) {
//         chunks.push(current);
//         current = [];
//         currentLen = 0;
//       }

//       chunks.push([block]);
//       continue;
//     }

//     if (
//       current.length &&
//       currentLen + blockLen > MAX_CHARS_PER_CHUNK
//     ) {
//       chunks.push(current);
//       current = [];
//       currentLen = 0;
//     }

//     current.push(block);
//     currentLen += blockLen;
//   }

//   if (current.length) {
//     chunks.push(current);
//   }

//   return chunks;
// }

// function cleanValue(
//   value: unknown
// ): string | undefined {
//   if (
//     value === undefined ||
//     value === null
//   ) {
//     return undefined;
//   }

//   const text = String(value).trim();

//   if (!text) {
//     return undefined;
//   }

//   return text;
// }

// function normalizeRecord(
//   record: any
// ): NormalizedSurveyRecord {
//   const data: Record<string, string> = {};

//   if (
//     record?.data &&
//     typeof record.data === "object"
//   ) {
//     for (
//       const [key, value] of Object.entries(
//         record.data
//       )
//     ) {
//       const cleaned = cleanValue(value);

//       if (cleaned) {
//         data[key] = cleaned;
//       }
//     }
//   }

//   const fields: Array<
//     [string, unknown]
//   > = [
//     ["Age", record?.age],
//     ["Gender", record?.gender],
//     ["Job Title", record?.jobTitle],
//     ["Industry", record?.industry],
//     ["Zip code", record?.zipCode],
//     ["Department", record?.department],
//     ["Employees", record?.employees],
//     ["Brand", record?.brand],
//     ["Revenue", record?.revenue],
//     ["Company", record?.company],
//     ["Country", record?.country],
//     ["Nationality", record?.nationality],
//     [
//       "Household Income",
//       record?.householdIncome,
//     ],
//     ["Oppo", record?.oppo],
//     ["Study Topic", record?.studyTopic],
//     ["Record ID", record?.recordId],
//     ["TNX-ID", record?.tnxId],
//     ["Location", record?.location],
//   ];

//   for (
//     const [key, value] of fields
//   ) {
//     const cleaned = cleanValue(value);

//     if (cleaned) {
//       data[key] = cleaned;
//     }
//   }

//   return {
//     category:
//       record?.category === "B2B" ||
//       record?.category === "B2H" ||
//       record?.category === "B2C"
//         ? record.category
//         : "B2C",

//     accountType:
//       cleanValue(record?.accountType),

//     projectNo:
//       cleanValue(record?.projectNo),

//     surveyName:
//       cleanValue(record?.surveyName),

//     description:
//       cleanValue(record?.description),

//     pid:
//       cleanValue(record?.pid),

//     tnxId:
//       cleanValue(record?.tnxId),

//     supplierId:
//       cleanValue(record?.supplierId),

//     location:
//       cleanValue(record?.location),

//     country:
//       cleanValue(record?.country),

//     ip:
//       cleanValue(record?.ip),

//     status:
//       cleanValue(record?.status),

//     age:
//       cleanValue(record?.age),

//     gender:
//       cleanValue(record?.gender),

//     jobTitle:
//       cleanValue(record?.jobTitle),

//     industry:
//       cleanValue(record?.industry),

//     zipCode:
//       cleanValue(record?.zipCode),

//     department:
//       cleanValue(record?.department),

//     employees:
//       cleanValue(record?.employees),

//     brand:
//       cleanValue(record?.brand),

//     revenue:
//       cleanValue(record?.revenue),

//     company:
//       cleanValue(record?.company),

//     nationality:
//       cleanValue(record?.nationality),

//     householdIncome:
//       cleanValue(
//         record?.householdIncome
//       ),

//     oppo:
//       cleanValue(record?.oppo),

//     studyTopic:
//       cleanValue(record?.studyTopic),

//     recordId:
//       cleanValue(record?.recordId),

//     data,
//   };
// }

// function extractJson(
//   text: string
// ): any {
//   const cleaned =
//     text
//       .replace(/```json/gi, "")
//       .replace(/```/g, "")
//       .trim();

//   try {
//     return JSON.parse(cleaned);
//   } catch {
//     // Try extracting the first JSON object.
//     const first =
//       cleaned.indexOf("{");

//     const last =
//       cleaned.lastIndexOf("}");

//     if (
//       first !== -1 &&
//       last !== -1 &&
//       last > first
//     ) {
//       return JSON.parse(
//         cleaned.slice(
//           first,
//           last + 1
//         )
//       );
//     }

//     throw new Error(
//       "Groq did not return valid JSON"
//     );
//   }
// }

// /* ======================================================
//    SINGLE GROQ CALL
//    ------------------------------------------------------
//    This is the original implementation, unchanged except
//    for the name — it now normalizes ONE chunk (which may
//    be the whole paste, if it's small enough).
// ====================================================== */

// async function normalizeChunkWithGroq(
//   paste: string
// ): Promise<GroqNormalizationResult> {
//   const apiKey =
//     process.env.GROQ_API_KEY;

//   if (!apiKey) {
//     throw new Error(
//       "GROQ_API_KEY is not configured"
//     );
//   }

//   const model =
//     process.env.GROQ_MODEL ||
//     "openai/gpt-oss-120b";

//   const systemPrompt = `
// You are a survey data extraction engine.

// Your ONLY job is to convert raw survey records into JSON.

// IMPORTANT RULES:

// 1. Every numbered survey block is ONE record.
// 2. NEVER merge two records.
// 3. NEVER delete a record.
// 4. NEVER invent information.
// 5. Missing values MUST be null.
// 6. Preserve values exactly as supplied.
// 7. Preserve IP addresses exactly.
// 8. Preserve IDs exactly.
// 9. Preserve currency and income formatting exactly.
// 10. Preserve the original language of answers.
// 11. "male" stays "male".
// 12. "M" stays "M".
// 13. Age values must be preserved exactly.
// 14. Long answer paragraphs belong in "oppo" when they are the answer content.
// 15. Return ONLY JSON.
// 16. Do NOT use markdown.
// 17. Do NOT explain anything.
// 18. The output MUST contain a "records" array.

// HEADER RULES:

// Example:
// "GMS 79151 - Genpop | TNX543"

// means:

// projectNo = "79151"
// surveyName = "Genpop"
// tnxId = "TNX543"

// Example:
// "TRN 21554 - Gen-pop (Monterrey only) | TNX511"

// means:

// projectNo = "21554"
// surveyName = "Gen-pop (Monterrey only)"
// tnxId = "TNX511"

// TAIL RULES:

// Example:
// "543 ="371515368214102272" China 118.123.80.10 Completed"

// means:

// tnxId = "TNX543"
// supplierId = "371515368214102272"
// country = "China"
// location = "China"
// ip = "118.123.80.10"
// status = "Completed"

// Example:
// "78014 rfderday00srj United States 76.250.239.86 Completed"

// means:

// projectNo = "78014"
// supplierId = "rfderday00srj"
// country = "United States"
// location = "United States"
// ip = "76.250.239.86"
// status = "Completed"

// For:
// "21425 jgreefjday00srj United States 76.250.239.112 Completed"

// means:

// projectNo = "21425"
// supplierId = "jgreefjday00srj"
// country = "United States"
// location = "United States"
// ip = "76.250.239.112"
// status = "Completed"

// FIELD RULES:

// "Age - 46–55" -> age = "46–55"

// "Gender - male" -> gender = "male"

// "Job title - Director" -> jobTitle = "Director"

// "role-Director of IT Infrastructure" is additional information and may be stored in data as:

// "role": "Director of IT Infrastructure"

// "Department- IT Technology" -> department = "IT Technology"

// "Employees - 5001+" -> employees = "5001+"

// "Household Income- 10,001 - 16,000元"
// must remain exactly:
// "10,001 - 16,000元"

// Long free-text responses must NOT be discarded.

// If multiple long answer paragraphs exist, preserve all of them in "oppo", separated by "\\n\\n".

// The data object may contain additional fields that are not part of the standard schema.

// OUTPUT SHAPE:

// {
//   "records": [
//     {
//       "category": "B2C",
//       "accountType": null,
//       "projectNo": null,
//       "surveyName": null,
//       "description": null,
//       "pid": null,
//       "tnxId": null,
//       "supplierId": null,
//       "location": null,
//       "country": null,
//       "ip": null,
//       "status": null,
//       "age": null,
//       "gender": null,
//       "jobTitle": null,
//       "industry": null,
//       "zipCode": null,
//       "department": null,
//       "employees": null,
//       "brand": null,
//       "revenue": null,
//       "company": null,
//       "nationality": null,
//       "householdIncome": null,
//       "oppo": null,
//       "studyTopic": null,
//       "recordId": null,
//       "data": {}
//     }
//   ]
// }
// `.trim();

//   const response =
//     await fetch(
//       "https://api.groq.com/openai/v1/chat/completions",
//       {
//         method: "POST",

//         headers: {
//           "Content-Type":
//             "application/json",

//           Authorization:
//             `Bearer ${apiKey}`,
//         },

//         body: JSON.stringify({
//           model,

//           temperature: 0,

//           max_tokens: 16000,

//           messages: [
//             {
//               role: "system",
//               content:
//                 systemPrompt,
//             },
//             {
//               role: "user",
//               content:
//                 paste,
//             },
//           ],

//           response_format: {
//             type: "json_object",
//           },
//         }),
//       }
//     );

//   const responseText =
//     await response.text();

//   if (!response.ok) {
//     throw new Error(
//       `${response.status} ${responseText}`
//     );
//   }

//   let apiResult: any;

//   try {
//     apiResult =
//       JSON.parse(responseText);
//   } catch {
//     throw new Error(
//       "Groq API returned invalid JSON"
//     );
//   }

//   const content =
//     apiResult?.choices?.[0]?.message
//       ?.content;

//   if (
//     typeof content !== "string" ||
//     !content.trim()
//   ) {
//     console.error(
//       "GROQ EMPTY CONTENT:",
//       JSON.stringify(
//         apiResult,
//         null,
//         2
//       )
//     );

//     throw new Error(
//       "Groq returned empty content"
//     );
//   }

//   let parsed: any;

//   try {
//     parsed =
//       extractJson(content);
//   } catch (error) {
//     console.error(
//       "GROQ CONTENT:",
//       content
//     );

//     throw error;
//   }

//   let records: any[] = [];

//   if (
//     parsed &&
//     Array.isArray(
//       parsed.records
//     )
//   ) {
//     records =
//       parsed.records;
//   } else if (
//     parsed &&
//     Array.isArray(
//       parsed.data
//     )
//   ) {
//     records =
//       parsed.data;
//   } else if (
//     Array.isArray(parsed)
//   ) {
//     records = parsed;
//   } else if (
//     parsed &&
//     typeof parsed === "object"
//   ) {
//     records = [parsed];
//   }

//   const normalizedRecords =
//     records.map(
//       normalizeRecord
//     );

//   console.log(
//     `GROQ NORMALIZER: ${normalizedRecords.length} record(s)`
//   );

//   return {
//     records:
//       normalizedRecords,

//     normalizedText:
//       JSON.stringify(
//         {
//           records:
//             normalizedRecords,
//         },
//         null,
//         2
//       ),
//   };
// }

// async function normalizeChunkWithRetry(
//   paste: string,
//   chunkLabel: string,
//   attempt = 1
// ): Promise<GroqNormalizationResult> {
//   try {
//     return await normalizeChunkWithGroq(paste);
//   } catch (error: any) {
//     if (attempt < 2) {
//       console.warn(
//         `GROQ ${chunkLabel} failed (attempt ${attempt}), retrying...`,
//         error?.message || error
//       );

//       return normalizeChunkWithRetry(
//         paste,
//         chunkLabel,
//         attempt + 1
//       );
//     }

//     throw error;
//   }
// }

// /* ======================================================
//    PUBLIC ENTRY POINT
//    ------------------------------------------------------
//    Splits the paste into "=====" delimited blocks, groups
//    them into safely-sized chunks, and normalizes each
//    chunk with its own Groq call (in parallel). If a chunk
//    fails after a retry, its error is collected but the
//    records from every other chunk are still returned —
//    the caller decides what to do with a partial success.
// ====================================================== */

// export async function normalizeSurveyWithGroq(
//   paste: string
// ): Promise<GroqNormalizationResult> {
//   const blocks = splitIntoBlocks(paste);

//   // Nothing to split — just make the one call, same as before.
//   if (blocks.length <= 1) {
//     return normalizeChunkWithGroq(paste);
//   }

//   const chunks = chunkBlocks(blocks);
//   const delimiter = "\n=====\n";

//   console.log(
//     `GROQ NORMALIZER: splitting ${blocks.length} block(s) into ${chunks.length} chunk(s)`
//   );

//   const settled = await Promise.allSettled(
//     chunks.map((chunkBlocks, idx) =>
//       normalizeChunkWithRetry(
//         chunkBlocks.join(delimiter),
//         `chunk ${idx + 1}/${chunks.length}`
//       )
//     )
//   );

//   const records: NormalizedSurveyRecord[] = [];
//   const errors: string[] = [];

//   settled.forEach((result, idx) => {
//     if (result.status === "fulfilled") {
//       records.push(...result.value.records);
//     } else {
//       const blockCount = chunks[idx].length;

//       const message =
//         result.reason?.message ||
//         String(result.reason);

//       console.error(
//         `GROQ CHUNK ${idx + 1}/${chunks.length} FAILED:`,
//         message
//       );

//       errors.push(
//         `Chunk ${idx + 1}/${chunks.length} (${blockCount} record${
//           blockCount === 1 ? "" : "s"
//         }) failed to normalize: ${message}`
//       );
//     }
//   });

//   return {
//     records,
//     errors: errors.length ? errors : undefined,
//     normalizedText: JSON.stringify(
//       { records },
//       null,
//       2
//     ),
//   };
// }

// lib/groqSurveyNormalizer.ts

export type SurveyCategory =
  | "B2B"
  | "B2C"
  | "B2H";

export interface NormalizedSurveyRecord {
  category: SurveyCategory;

  // ====================================================
  // COMMON PROJECT FIELDS
  // ====================================================

  projectName?: string;
  studyType?: string;
  counts?: string;

  // ====================================================
  // B2C FIELDS
  // ====================================================

  age?: string;
  gender?: string;
  zipCode?: string;
  country?: string;
  nationality?: string;
  ethnicity?: string;
  householdIncome?: string;
  personalIncome?: string;
  brand?: string;
  company?: string;
  occupation?: string;
  employmentStatus?: string;
  maritalStatus?: string;

  // ====================================================
  // B2B FIELDS
  // ====================================================

  jobTitle?: string;
  industry?: string;
  department?: string;
  employees?: string;
  revenue?: string;
  county?: string;

  // ====================================================
  // HEALTHCARE / B2H FIELDS
  // ====================================================

  patientAge?: string;
  caregiverAge?: string;
  patientGender?: string;
  caregiverGender?: string;
  diseaseCondition?: string;
  firstDiagnosed?: string;
  medicineName?: string;
  currentMedication?: string;
  previousMedication?: string;
  treatmentDuration?: string;
  treatmentResponse?: string;
  sideEffects?: string;
  otherConditions?: string;
  healthcareProvider?: string;
  insuranceType?: string;
  caregiverRelationship?: string;
  treatmentSatisfaction?: string;

  // ====================================================
  // COMMON RESPONSE FIELDS
  // ====================================================

  oppo?: string;
  note?: string;

  // ====================================================
  // IDENTIFIERS
  // ====================================================

  tnxProjectId?: string;
  parentId?: string;
  childId?: string;
  respondentId?: string;

  // ====================================================
  // RESPONDENT INFORMATION
  // ====================================================

  ip?: string;
  status?: string;

  // ====================================================
  // EXTRA / UNKNOWN FIELDS
  // ====================================================

  data: Record<string, string>;
}


export interface GroqNormalizationResult {
  records: NormalizedSurveyRecord[];
  normalizedText?: string;
  errors?: string[];
}


/* ======================================================
   CHUNKING
   ====================================================== */

const MAX_CHARS_PER_CHUNK = 6000;


/* ======================================================
   SPLIT RECORDS
   ====================================================== */

function splitIntoBlocks(
  paste: string
): string[] {

  const normalized =
    paste
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim();

  if (!normalized) {
    return [];
  }

  /*
   * Supports separators such as:
   *
   * --------------------
   * ====================
   * =====
   */

  const blocks =
    normalized
      .split(
        /^\s*(?:-{5,}|={3,})\s*$/gm
      )
      .map(
        (block) => block.trim()
      )
      .filter(Boolean);

  return blocks.length
    ? blocks
    : [normalized];
}


/* ======================================================
   CHUNK BLOCKS
   ====================================================== */

function chunkBlocks(
  blocks: string[]
): string[][] {

  const chunks: string[][] = [];

  let current: string[] = [];
  let currentLength = 0;

  for (
    const block of blocks
  ) {

    const blockLength =
      block.length;

    /*
     * If a single record is larger than the normal
     * chunk size, keep that record by itself.
     */

    if (
      blockLength >
      MAX_CHARS_PER_CHUNK
    ) {

      if (current.length) {
        chunks.push(current);
        current = [];
        currentLength = 0;
      }

      chunks.push([block]);

      continue;
    }


    /*
     * Start a new chunk if the next block would make
     * the chunk too large.
     */

    if (
      current.length &&
      currentLength + blockLength >
        MAX_CHARS_PER_CHUNK
    ) {

      chunks.push(current);

      current = [];
      currentLength = 0;
    }


    current.push(block);

    currentLength +=
      blockLength;
  }


  if (current.length) {
    chunks.push(current);
  }


  return chunks;
}


/* ======================================================
   CLEAN VALUE
   ====================================================== */

function cleanValue(
  value: unknown
): string | undefined {

  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  const text =
    String(value).trim();

  if (!text) {
    return undefined;
  }

  return text;
}


/* ======================================================
   FORMAT OPPO
   ====================================================== */

/*
 * Converts:
 *
 * Answer one
 *
 * Answer two
 *
 * Answer three
 *
 * into:
 *
 * 1- Answer one
 *
 * 2- Answer two
 *
 * 3- Answer three
 *
 *
 * Existing numbering is removed first so we don't get:
 *
 * 1- 1. Answer
 */

function formatOppo(
  value: unknown
): string | undefined {

  const cleaned =
    cleanValue(value);

  if (!cleaned) {
    return undefined;
  }


  const normalized =
    cleaned
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim();


  /*
   * Primary separator:
   *
   * Blank lines between answers.
   */

  let answers =
    normalized
      .split(/\n\s*\n+/)
      .map(
        (answer) =>
          answer.trim()
      )
      .filter(Boolean);


  /*
   * If Groq returned multiple answers as single-line
   * numbered values, handle those too.
   *
   * Example:
   *
   * 1. Answer one
   * 2. Answer two
   * 3. Answer three
   */

  if (
    answers.length === 1 &&
    /^\s*\d+\s*[\.\-\):]/m.test(
      answers[0]
    )
  ) {

    answers =
      answers[0]
        .split(
          /\n(?=\s*\d+\s*[\.\-\):]\s*)/
        )
        .map(
          (answer) =>
            answer.trim()
        )
        .filter(Boolean);
  }


  /*
   * If there is only one answer, still return:
   *
   * 1- Answer
   */

  const formatted =
    answers.map(
      (
        answer,
        index
      ) => {

        /*
         * Remove existing numbering:
         *
         * 1.
         * 1-
         * 1)
         * 1:
         */

        const withoutNumber =
          answer
            .replace(
              /^\s*\d+\s*[\.\-\):]\s*/,
              ""
            )
            .trim();

        return `${index + 1}- ${withoutNumber}`;
      }
    );


  return formatted.join(
    "\n\n"
  );
}


/* ======================================================
   CATEGORY
   ====================================================== */

function normalizeCategory(
  value: unknown,
  studyType: unknown
): SurveyCategory {

  const category =
    cleanValue(value)
      ?.toLowerCase();

  const study =
    cleanValue(studyType)
      ?.toLowerCase();


  if (
    category === "healthcare" ||
    category === "health care" ||
    category === "health" ||
    category === "b2h"
  ) {
    return "B2H";
  }


  if (
    study === "healthcare" ||
    study === "health care" ||
    study === "health" ||
    study === "b2h"
  ) {
    return "B2H";
  }


  if (
    category === "b2b"
  ) {
    return "B2B";
  }


  if (
    category === "b2c"
  ) {
    return "B2C";
  }


  if (
    study === "b2b"
  ) {
    return "B2B";
  }


  if (
    study === "b2c"
  ) {
    return "B2C";
  }


  /*
   * B2B is the default because the current application
   * primarily receives B2B data.
   */

  return "B2B";
}


/* ======================================================
   NORMALIZE RECORD
   ====================================================== */

function normalizeRecord(
  record: any
): NormalizedSurveyRecord {

  const category =
    normalizeCategory(
      record?.category,
      record?.studyType
    );


  const data:
    Record<string, string> = {};


  /* ----------------------------------------------------
     Preserve Groq additional fields
     ---------------------------------------------------- */

  if (
    record?.data &&
    typeof record.data === "object" &&
    !Array.isArray(record.data)
  ) {

    for (
      const [
        key,
        value
      ] of Object.entries(
        record.data
      )
    ) {

      const cleaned =
        cleanValue(value);

      if (cleaned) {
        data[key] = cleaned;
      }
    }
  }


  /* ----------------------------------------------------
     Format Oppo
     ---------------------------------------------------- */

  const formattedOppo =
    formatOppo(
      record?.oppo
    );


  /* ----------------------------------------------------
     Standard field map
     ---------------------------------------------------- */

  const fields:
    Array<[string, unknown]> = [

    // Common
    [
      "Project Name",
      record?.projectName
    ],

    [
      "Study Type",
      record?.studyType
    ],

    [
      "Counts",
      record?.counts
    ],


    // -------------------------
    // B2C
    // -------------------------

    [
      "Age",
      record?.age
    ],

    [
      "Gender",
      record?.gender
    ],

    [
      "ZIP Code",
      record?.zipCode
    ],

    [
      "Country",
      record?.country
    ],

    [
      "Nationality",
      record?.nationality
    ],

    [
      "Ethnicity",
      record?.ethnicity
    ],

    [
      "Household Income",
      record?.householdIncome
    ],

    [
      "Personal Income",
      record?.personalIncome
    ],

    [
      "Brand",
      record?.brand
    ],

    [
      "Company",
      record?.company
    ],

    [
      "Occupation",
      record?.occupation
    ],

    [
      "Employment Status",
      record?.employmentStatus
    ],

    [
      "Marital Status",
      record?.maritalStatus
    ],


    // -------------------------
    // B2B
    // -------------------------

    [
      "Job Title",
      record?.jobTitle
    ],

    [
      "Industry",
      record?.industry
    ],

    [
      "Department",
      record?.department
    ],

    [
      "Employees",
      record?.employees
    ],

    [
      "Revenue",
      record?.revenue
    ],

    [
      "Company",
      record?.company
    ],

    [
      "County",
      record?.county
    ],


    // -------------------------
    // Healthcare
    // -------------------------

    [
      "Patient Age",
      record?.patientAge
    ],

    [
      "Caregiver Age",
      record?.caregiverAge
    ],

    [
      "Patient Gender",
      record?.patientGender
    ],

    [
      "Caregiver Gender",
      record?.caregiverGender
    ],

    [
      "Disease / Condition",
      record?.diseaseCondition
    ],

    [
      "First Diagnosed",
      record?.firstDiagnosed
    ],

    [
      "Medicine Name",
      record?.medicineName
    ],

    [
      "Current Medication",
      record?.currentMedication
    ],

    [
      "Previous Medication",
      record?.previousMedication
    ],

    [
      "Treatment Duration",
      record?.treatmentDuration
    ],

    [
      "Treatment Response",
      record?.treatmentResponse
    ],

    [
      "Side Effects",
      record?.sideEffects
    ],

    [
      "Other Conditions",
      record?.otherConditions
    ],

    [
      "Healthcare Provider",
      record?.healthcareProvider
    ],

    [
      "Insurance Type",
      record?.insuranceType
    ],

    [
      "Caregiver Relationship",
      record?.caregiverRelationship
    ],

    [
      "Treatment Satisfaction",
      record?.treatmentSatisfaction
    ],


    // -------------------------
    // Common
    // -------------------------

    [
      "Oppo",
      formattedOppo
    ],

    [
      "TNX Project ID",
      record?.tnxProjectId
    ],

    [
      "Parent ID",
      record?.parentId
    ],

    [
      "Child ID",
      record?.childId
    ],

    [
      "Respondent ID",
      record?.respondentId
    ],

    [
      "Country",
      record?.country
    ],

    [
      "IP Address",
      record?.ip
    ],

    [
      "Status",
      record?.status
    ],

    [
      "Note",
      record?.note
    ],
  ];


  for (
    const [
      key,
      value
    ] of fields
  ) {

    const cleaned =
      cleanValue(value);

    if (cleaned) {
      data[key] = cleaned;
    }
  }


  /* ====================================================
     RETURN
     ==================================================== */

  return {

    category,

    // Common
    projectName:
      cleanValue(
        record?.projectName
      ),

    studyType:
      cleanValue(
        record?.studyType
      ),

    counts:
      cleanValue(
        record?.counts
      ),


    // B2C
    age:
      cleanValue(
        record?.age
      ),

    gender:
      cleanValue(
        record?.gender
      ),

    zipCode:
      cleanValue(
        record?.zipCode
      ),

    country:
      cleanValue(
        record?.country
      ),

    nationality:
      cleanValue(
        record?.nationality
      ),

    ethnicity:
      cleanValue(
        record?.ethnicity
      ),

    householdIncome:
      cleanValue(
        record?.householdIncome
      ),

    personalIncome:
      cleanValue(
        record?.personalIncome
      ),

    brand:
      cleanValue(
        record?.brand
      ),

    company:
      cleanValue(
        record?.company
      ),

    occupation:
      cleanValue(
        record?.occupation
      ),

    employmentStatus:
      cleanValue(
        record?.employmentStatus
      ),

    maritalStatus:
      cleanValue(
        record?.maritalStatus
      ),


    // B2B
    jobTitle:
      cleanValue(
        record?.jobTitle
      ),

    industry:
      cleanValue(
        record?.industry
      ),

    department:
      cleanValue(
        record?.department
      ),

    employees:
      cleanValue(
        record?.employees
      ),

    revenue:
      cleanValue(
        record?.revenue
      ),

    county:
      cleanValue(
        record?.county
      ),


    // Healthcare
    patientAge:
      cleanValue(
        record?.patientAge
      ),

    caregiverAge:
      cleanValue(
        record?.caregiverAge
      ),

    patientGender:
      cleanValue(
        record?.patientGender
      ),

    caregiverGender:
      cleanValue(
        record?.caregiverGender
      ),

    diseaseCondition:
      cleanValue(
        record?.diseaseCondition
      ),

    firstDiagnosed:
      cleanValue(
        record?.firstDiagnosed
      ),

    medicineName:
      cleanValue(
        record?.medicineName
      ),

    currentMedication:
      cleanValue(
        record?.currentMedication
      ),

    previousMedication:
      cleanValue(
        record?.previousMedication
      ),

    treatmentDuration:
      cleanValue(
        record?.treatmentDuration
      ),

    treatmentResponse:
      cleanValue(
        record?.treatmentResponse
      ),

    sideEffects:
      cleanValue(
        record?.sideEffects
      ),

    otherConditions:
      cleanValue(
        record?.otherConditions
      ),

    healthcareProvider:
      cleanValue(
        record?.healthcareProvider
      ),

    insuranceType:
      cleanValue(
        record?.insuranceType
      ),

    caregiverRelationship:
      cleanValue(
        record?.caregiverRelationship
      ),

    treatmentSatisfaction:
      cleanValue(
        record?.treatmentSatisfaction
      ),


    // Common
    oppo:
      formattedOppo,

    note:
      cleanValue(
        record?.note
      ),


    // IDs
    tnxProjectId:
      cleanValue(
        record?.tnxProjectId
      ),

    parentId:
      cleanValue(
        record?.parentId
      ),

    childId:
      cleanValue(
        record?.childId
      ),

    respondentId:
      cleanValue(
        record?.respondentId
      ),


    // Respondent
    ip:
      cleanValue(
        record?.ip
      ),

    status:
      cleanValue(
        record?.status
      ),


    data,
  };
}


/* ======================================================
   JSON EXTRACTION
   ====================================================== */

function extractJson(
  text: string
): any {

  const cleaned =
    text
      .replace(
        /```json/gi,
        ""
      )
      .replace(
        /```/g,
        ""
      )
      .trim();


  try {

    return JSON.parse(
      cleaned
    );

  } catch {
    // Continue below.
  }


  /*
   * Try extracting JSON object from surrounding text.
   */

  const firstObject =
    cleaned.indexOf("{");

  const lastObject =
    cleaned.lastIndexOf("}");


  if (
    firstObject !== -1 &&
    lastObject !== -1 &&
    lastObject > firstObject
  ) {

    try {

      return JSON.parse(
        cleaned.slice(
          firstObject,
          lastObject + 1
        )
      );

    } catch {
      // Continue.
    }
  }


  /*
   * Try JSON array.
   */

  const firstArray =
    cleaned.indexOf("[");

  const lastArray =
    cleaned.lastIndexOf("]");


  if (
    firstArray !== -1 &&
    lastArray !== -1 &&
    lastArray > firstArray
  ) {

    try {

      return JSON.parse(
        cleaned.slice(
          firstArray,
          lastArray + 1
        )
      );

    } catch {
      // Continue.
    }
  }


  throw new Error(
    "Groq did not return valid JSON"
  );
}


/* ======================================================
   GROQ SINGLE CHUNK
   ====================================================== */

async function normalizeChunkWithGroq(
  paste: string
): Promise<GroqNormalizationResult> {

  const apiKey =
    process.env.GROQ_API_KEY;


  if (!apiKey) {

    throw new Error(
      "GROQ_API_KEY is not configured"
    );
  }


  const model =
    process.env.GROQ_MODEL ||
    "openai/gpt-oss-120b";


  /* ====================================================
     SYSTEM PROMPT
     ==================================================== */

  const systemPrompt = `
You are a professional survey data extraction engine.

Your job is to convert raw survey records into structured JSON.

The input may contain:

B2B
B2C
Healthcare
B2H

Automatically identify the correct category.

========================================================
CRITICAL RULES
========================================================

1. Every numbered record is ONE record.

2. NEVER merge two records.

3. NEVER delete records.

4. NEVER invent information.

5. Missing fields MUST be null.

6. Preserve all supplied values exactly.

7. Preserve IP addresses exactly.

8. Preserve IDs exactly.

9. Preserve income values exactly.

10. Preserve age values exactly.

11. Preserve company names exactly.

12. Preserve job titles exactly.

13. Preserve country names exactly.

14. Preserve the original language.

15. Do NOT translate Oppo.

16. Do NOT summarize Oppo.

17. Do NOT delete Oppo paragraphs.

18. Preserve every Oppo answer.

19. Return ONLY JSON.

20. No markdown.

21. No explanations.

22. Output MUST contain a records array.


========================================================
B2B
========================================================

Fields:

Project Name
Study Type
Counts
Age
Gender
Job title
Industry
Department
Employees
Brand
Revenue
Company
County
Zip code
Nationality
Household Income
Oppo
TNX Project ID
Parent ID
Child ID
Respondent ID
Country
IP Address
Status
Note


Map:

Project Name -> projectName
Study Type -> studyType
Counts -> counts
Age -> age
Gender -> gender
Job title -> jobTitle
Industry -> industry
Department -> department
Employees -> employees
Brand -> brand
Revenue -> revenue
Company -> company
County -> county
Zip code -> zipCode
Nationality -> nationality
Household Income -> householdIncome
Oppo -> oppo
TNX Project ID -> tnxProjectId
Parent ID -> parentId
Child ID -> childId
Respondent ID -> respondentId
Country -> country
IP Address -> ip
Status -> status
Note -> note


========================================================
B2C
========================================================

Fields:

Project Name
Study Type
Counts
Age
Gender
ZIP Code
Country
Nationality
Ethnicity
Household Income
Personal Income
Brand
Company
Occupation
Employment Status
Marital Status
Oppo
TNX Project ID
Parent ID
Child ID
Respondent ID
Country
IP Address
Status
Note


Map:

Project Name -> projectName
Study Type -> studyType
Counts -> counts
Age -> age
Gender -> gender
ZIP Code -> zipCode
Country -> country
Nationality -> nationality
Ethnicity -> ethnicity
Household Income -> householdIncome
Personal Income -> personalIncome
Brand -> brand
Company -> company
Occupation -> occupation
Employment Status -> employmentStatus
Marital Status -> maritalStatus
Oppo -> oppo
TNX Project ID -> tnxProjectId
Parent ID -> parentId
Child ID -> childId
Respondent ID -> respondentId
Country -> country
IP Address -> ip
Status -> status
Note -> note


========================================================
HEALTHCARE / B2H
========================================================

Fields:

Project Name
Study Type
Counts
Patient Age
Caregiver Age
Patient Gender
Caregiver Gender
Disease / Condition
First Diagnosed
Medicine Name
Current Medication
Previous Medication
Treatment Duration
Treatment Response
Side Effects
Other Conditions
Healthcare Provider
Insurance Type
Caregiver Relationship
Treatment Satisfaction
Oppo
TNX Project ID
Parent ID
Child ID
Respondent ID
Country
IP Address
Status
Note


Map:

Project Name -> projectName
Study Type -> studyType
Counts -> counts
Patient Age -> patientAge
Caregiver Age -> caregiverAge
Patient Gender -> patientGender
Caregiver Gender -> caregiverGender
Disease / Condition -> diseaseCondition
First Diagnosed -> firstDiagnosed
Medicine Name -> medicineName
Current Medication -> currentMedication
Previous Medication -> previousMedication
Treatment Duration -> treatmentDuration
Treatment Response -> treatmentResponse
Side Effects -> sideEffects
Other Conditions -> otherConditions
Healthcare Provider -> healthcareProvider
Insurance Type -> insuranceType
Caregiver Relationship -> caregiverRelationship
Treatment Satisfaction -> treatmentSatisfaction
Oppo -> oppo
TNX Project ID -> tnxProjectId
Parent ID -> parentId
Child ID -> childId
Respondent ID -> respondentId
Country -> country
IP Address -> ip
Status -> status
Note -> note


========================================================
TNX PROJECT ID RULE
========================================================

The TNX Project ID comes from the HEADER.

Example:

GMS 79151 - Genpop | TNX543

must produce:

projectName = "GMS 79151 - Genpop"
tnxProjectId = "TNX543"

DO NOT use the respondent number as the TNX Project ID.


========================================================
RESPONDENT ID RULE
========================================================

Example:

543 ="371515368214102272" China 118.123.80.10 Completed

with header:

GMS 79151 - Genpop | TNX543

must produce:

tnxProjectId = "TNX543"

respondentId = "371515368214102272"

country = "China"

ip = "118.123.80.10"

status = "Completed"


========================================================
ANOTHER RESPONDENT EXAMPLE
========================================================

Example:

78014 rfderday00srj United States 76.250.239.86 Completed

must produce:

respondentId = "rfderday00srj"

country = "United States"

ip = "76.250.239.86"

status = "Completed"

Do NOT put rfderday00srj into TNX Project ID.


========================================================
TRN EXAMPLE
========================================================

Header:

TRN 21425 -18-50 YO || TNX300

Tail:

21425 jgreefjday00srj United States 76.250.239.112 Completed

must produce:

projectName = "TRN 21425 -18-50 YO"

tnxProjectId = "TNX300"

respondentId = "jgreefjday00srj"

country = "United States"

ip = "76.250.239.112"

status = "Completed"


========================================================
ROLE RULE
========================================================

If input contains:

Job title - Director

role-Director of IT Infrastructure

then:

jobTitle = "Director"

and:

data = {
  "Role": "Director of IT Infrastructure"
}

Do NOT replace Job Title with Role.


========================================================
OPPO RULE
========================================================

Oppo can contain multiple paragraphs.

Example:

Oppo-

Answer one.

Answer two.

Answer three.

Answer four.

Return ALL answers inside:

oppo

Do NOT summarize them.

Do NOT translate them.

Do NOT delete them.


IMPORTANT:

Do NOT add numbering yourself.

Return the raw Oppo answer paragraphs.

The application will add:

1-
2-
3-
4-

automatically.


========================================================
NOTE RULE
========================================================

Note -

Some note text

must become:

note = "Some note text"

If empty:

note = null


========================================================
UNKNOWN FIELDS
========================================================

Never delete unknown fields.

Put them into:

data

Example:

Spent - $5000

becomes:

data = {
  "Spent": "$5000"
}


========================================================
FINAL OUTPUT
========================================================

Return ONLY JSON.

Example:

{
  "records": [
    {
      "category": "B2B",
      "projectName": null,
      "studyType": "B2B",
      "counts": null,

      "age": null,
      "gender": null,
      "jobTitle": null,
      "industry": null,
      "department": null,
      "employees": null,
      "brand": null,
      "revenue": null,
      "company": null,
      "county": null,
      "zipCode": null,
      "nationality": null,
      "householdIncome": null,

      "patientAge": null,
      "caregiverAge": null,
      "patientGender": null,
      "caregiverGender": null,
      "diseaseCondition": null,
      "firstDiagnosed": null,
      "medicineName": null,
      "currentMedication": null,
      "previousMedication": null,
      "treatmentDuration": null,
      "treatmentResponse": null,
      "sideEffects": null,
      "otherConditions": null,
      "healthcareProvider": null,
      "insuranceType": null,
      "caregiverRelationship": null,
      "treatmentSatisfaction": null,

      "oppo": null,

      "tnxProjectId": null,
      "parentId": null,
      "childId": null,
      "respondentId": null,

      "country": null,
      "ip": null,
      "status": null,
      "note": null,

      "data": {}
    }
  ]
}
`.trim();


  /* ====================================================
     API REQUEST
     ==================================================== */

  const response =
    await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${apiKey}`,
        },

        body: JSON.stringify({
          model,

          temperature: 0,

          max_tokens: 16000,

          messages: [
            {
              role: "system",
              content:
                systemPrompt,
            },

            {
              role: "user",
              content:
                paste,
            },
          ],

          response_format: {
            type: "json_object",
          },
        }),
      }
    );


  /* ====================================================
     RESPONSE
     ==================================================== */

  const responseText =
    await response.text();


  if (!response.ok) {

    throw new Error(
      `${response.status} ${responseText}`
    );
  }


  let apiResult: any;

  try {

    apiResult =
      JSON.parse(
        responseText
      );

  } catch {

    throw new Error(
      "Groq API returned invalid JSON"
    );
  }


  const content =
    apiResult
      ?.choices?.[0]
      ?.message
      ?.content;


  if (
    typeof content !== "string" ||
    !content.trim()
  ) {

    console.error(
      "GROQ EMPTY CONTENT:",
      JSON.stringify(
        apiResult,
        null,
        2
      )
    );

    throw new Error(
      "Groq returned empty content"
    );
  }


  /* ====================================================
     PARSE GROQ JSON
     ==================================================== */

  let parsed: any;

  try {

    parsed =
      extractJson(
        content
      );

  } catch (error) {

    console.error(
      "GROQ CONTENT:",
      content
    );

    throw error;
  }


  /* ====================================================
     GET RECORDS
     ==================================================== */

  let records: any[] = [];


  if (
    parsed &&
    Array.isArray(
      parsed.records
    )
  ) {

    records =
      parsed.records;

  } else if (
    parsed &&
    Array.isArray(
      parsed.data
    )
  ) {

    records =
      parsed.data;

  } else if (
    Array.isArray(parsed)
  ) {

    records =
      parsed;

  } else if (
    parsed &&
    typeof parsed === "object"
  ) {

    records = [
      parsed
    ];
  }


  /* ====================================================
     NORMALIZE RECORDS
     ==================================================== */

  const normalizedRecords =
    records.map(
      normalizeRecord
    );


  console.log(
    `GROQ NORMALIZER: ${normalizedRecords.length} record(s)`
  );


  return {
    records:
      normalizedRecords,

    normalizedText:
      JSON.stringify(
        {
          records:
            normalizedRecords,
        },
        null,
        2
      ),
  };
}


/* ======================================================
   RETRY
   ====================================================== */

async function normalizeChunkWithRetry(
  paste: string,
  chunkLabel: string,
  attempt = 1
): Promise<GroqNormalizationResult> {

  try {

    return await normalizeChunkWithGroq(
      paste
    );

  } catch (error: any) {

    if (attempt < 2) {

      console.warn(
        `GROQ ${chunkLabel} failed (attempt ${attempt}), retrying...`,
        error?.message ||
          error
      );

      return normalizeChunkWithRetry(
        paste,
        chunkLabel,
        attempt + 1
      );
    }

    throw error;
  }
}


/* ======================================================
   PUBLIC ENTRY POINT
   ====================================================== */

export async function normalizeSurveyWithGroq(
  paste: string
): Promise<GroqNormalizationResult> {

  const blocks =
    splitIntoBlocks(
      paste
    );


  if (!blocks.length) {

    return {
      records: [],

      normalizedText:
        JSON.stringify(
          {
            records: [],
          },
          null,
          2
        ),
    };
  }


  /*
   * Single block.
   */

  if (
    blocks.length === 1
  ) {

    return normalizeChunkWithGroq(
      paste
    );
  }


  /*
   * Multiple blocks.
   */

  // const chunks =
  //   chunkBlocks(
  //     blocks.map(
  //       (block) => [block]
  //     )
  //   );

  const chunks = chunkBlocks(blocks);


  const delimiter =
    "\n--------------------\n";


  console.log(
    `GROQ NORMALIZER: splitting ${blocks.length} block(s) into ${chunks.length} chunk(s)`
  );


  const settled =
    await Promise.allSettled(
      chunks.map(
        (chunk, index) =>
          normalizeChunkWithRetry(
            chunk.join(
              delimiter
            ),
            `chunk ${index + 1}/${chunks.length}`
          )
      )
    );


  const records:
    NormalizedSurveyRecord[] = [];

  const errors:
    string[] = [];


  settled.forEach(
    (
      result,
      index
    ) => {

      if (
        result.status ===
        "fulfilled"
      ) {

        records.push(
          ...result.value.records
        );

      } else {

        const blockCount =
          chunks[index].length;

        const message =
          result.reason?.message ||
          String(
            result.reason
          );


        console.error(
          `GROQ CHUNK ${index + 1}/${chunks.length} FAILED:`,
          message
        );


        errors.push(
          `Chunk ${index + 1}/${chunks.length} (${blockCount} record${
            blockCount === 1
              ? ""
              : "s"
          }) failed to normalize: ${message}`
        );
      }
    }
  );


  return {
    records,

    errors:
      errors.length
        ? errors
        : undefined,

    normalizedText:
      JSON.stringify(
        {
          records,
        },
        null,
        2
      ),
  };
}