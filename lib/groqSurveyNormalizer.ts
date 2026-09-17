// lib/groqSurveyNormalizer.ts

export interface NormalizedSurveyRecord {
  category: "B2B" | "B2H" | "B2C";

  accountType?: string;
  projectNo?: string;
  surveyName?: string;
  description?: string;

  pid?: string;
  tnxId?: string;
  supplierId?: string;

  location?: string;
  country?: string;
  ip?: string;
  status?: string;

  age?: string;
  gender?: string;
  jobTitle?: string;
  industry?: string;
  zipCode?: string;
  department?: string;
  employees?: string;
  brand?: string;
  revenue?: string;
  company?: string;
  nationality?: string;
  householdIncome?: string;
  oppo?: string;
  studyTopic?: string;
  recordId?: string;

  data: Record<string, string>;
}

export interface GroqNormalizationResult {
  records: NormalizedSurveyRecord[];
  normalizedText?: string;
  /**
   * Populated when the paste had to be split into multiple Groq calls and
   * one or more of those calls failed. Records from the chunks that
   * succeeded are still returned — this is a partial-success report, not a
   * hard failure.
   */
  errors?: string[];
}

/* ======================================================
   CHUNKING
   ------------------------------------------------------
   A single Groq completion asked to normalize a large
   paste (many blocks, some with long free-text answers)
   can exceed what the model can reliably emit as valid
   JSON in one shot — that's what produced the
   "json_validate_failed" / malformed-JSON error.

   To make this robust we split the paste into the same
   "=====" delimited blocks the UI already recognizes,
   then group those blocks into chunks that stay under a
   safe character budget before sending each chunk to
   Groq separately. One bad/oversized chunk can then only
   affect the records in that chunk, not the whole batch.
====================================================== */

// Keep each Groq call small enough that even a few
// long-answer blocks won't push the JSON completion past
// what the model can reliably finish.
const MAX_CHARS_PER_CHUNK = 6000;

function splitIntoBlocks(paste: string): string[] {
  const hasDelimiter = /^\s*=+\s*$/m.test(paste);

  if (!hasDelimiter) {
    return [paste.trim()].filter(Boolean);
  }

  return paste
    .split(/^\s*=+\s*$/m)
    .map((b) => b.trim())
    .filter(Boolean);
}

function chunkBlocks(blocks: string[]): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  let currentLen = 0;

  for (const block of blocks) {
    const blockLen = block.length;

    // An oversized single block gets its own chunk rather
    // than being force-merged with others.
    if (blockLen > MAX_CHARS_PER_CHUNK) {
      if (current.length) {
        chunks.push(current);
        current = [];
        currentLen = 0;
      }

      chunks.push([block]);
      continue;
    }

    if (
      current.length &&
      currentLen + blockLen > MAX_CHARS_PER_CHUNK
    ) {
      chunks.push(current);
      current = [];
      currentLen = 0;
    }

    current.push(block);
    currentLen += blockLen;
  }

  if (current.length) {
    chunks.push(current);
  }

  return chunks;
}

function cleanValue(
  value: unknown
): string | undefined {
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  const text = String(value).trim();

  if (!text) {
    return undefined;
  }

  return text;
}

function normalizeRecord(
  record: any
): NormalizedSurveyRecord {
  const data: Record<string, string> = {};

  if (
    record?.data &&
    typeof record.data === "object"
  ) {
    for (
      const [key, value] of Object.entries(
        record.data
      )
    ) {
      const cleaned = cleanValue(value);

      if (cleaned) {
        data[key] = cleaned;
      }
    }
  }

  const fields: Array<
    [string, unknown]
  > = [
    ["Age", record?.age],
    ["Gender", record?.gender],
    ["Job Title", record?.jobTitle],
    ["Industry", record?.industry],
    ["Zip code", record?.zipCode],
    ["Department", record?.department],
    ["Employees", record?.employees],
    ["Brand", record?.brand],
    ["Revenue", record?.revenue],
    ["Company", record?.company],
    ["Country", record?.country],
    ["Nationality", record?.nationality],
    [
      "Household Income",
      record?.householdIncome,
    ],
    ["Oppo", record?.oppo],
    ["Study Topic", record?.studyTopic],
    ["Record ID", record?.recordId],
    ["TNX-ID", record?.tnxId],
    ["Location", record?.location],
  ];

  for (
    const [key, value] of fields
  ) {
    const cleaned = cleanValue(value);

    if (cleaned) {
      data[key] = cleaned;
    }
  }

  return {
    category:
      record?.category === "B2B" ||
      record?.category === "B2H" ||
      record?.category === "B2C"
        ? record.category
        : "B2C",

    accountType:
      cleanValue(record?.accountType),

    projectNo:
      cleanValue(record?.projectNo),

    surveyName:
      cleanValue(record?.surveyName),

    description:
      cleanValue(record?.description),

    pid:
      cleanValue(record?.pid),

    tnxId:
      cleanValue(record?.tnxId),

    supplierId:
      cleanValue(record?.supplierId),

    location:
      cleanValue(record?.location),

    country:
      cleanValue(record?.country),

    ip:
      cleanValue(record?.ip),

    status:
      cleanValue(record?.status),

    age:
      cleanValue(record?.age),

    gender:
      cleanValue(record?.gender),

    jobTitle:
      cleanValue(record?.jobTitle),

    industry:
      cleanValue(record?.industry),

    zipCode:
      cleanValue(record?.zipCode),

    department:
      cleanValue(record?.department),

    employees:
      cleanValue(record?.employees),

    brand:
      cleanValue(record?.brand),

    revenue:
      cleanValue(record?.revenue),

    company:
      cleanValue(record?.company),

    nationality:
      cleanValue(record?.nationality),

    householdIncome:
      cleanValue(
        record?.householdIncome
      ),

    oppo:
      cleanValue(record?.oppo),

    studyTopic:
      cleanValue(record?.studyTopic),

    recordId:
      cleanValue(record?.recordId),

    data,
  };
}

function extractJson(
  text: string
): any {
  const cleaned =
    text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try extracting the first JSON object.
    const first =
      cleaned.indexOf("{");

    const last =
      cleaned.lastIndexOf("}");

    if (
      first !== -1 &&
      last !== -1 &&
      last > first
    ) {
      return JSON.parse(
        cleaned.slice(
          first,
          last + 1
        )
      );
    }

    throw new Error(
      "Groq did not return valid JSON"
    );
  }
}

/* ======================================================
   SINGLE GROQ CALL
   ------------------------------------------------------
   This is the original implementation, unchanged except
   for the name — it now normalizes ONE chunk (which may
   be the whole paste, if it's small enough).
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

  const systemPrompt = `
You are a survey data extraction engine.

Your ONLY job is to convert raw survey records into JSON.

IMPORTANT RULES:

1. Every numbered survey block is ONE record.
2. NEVER merge two records.
3. NEVER delete a record.
4. NEVER invent information.
5. Missing values MUST be null.
6. Preserve values exactly as supplied.
7. Preserve IP addresses exactly.
8. Preserve IDs exactly.
9. Preserve currency and income formatting exactly.
10. Preserve the original language of answers.
11. "male" stays "male".
12. "M" stays "M".
13. Age values must be preserved exactly.
14. Long answer paragraphs belong in "oppo" when they are the answer content.
15. Return ONLY JSON.
16. Do NOT use markdown.
17. Do NOT explain anything.
18. The output MUST contain a "records" array.

HEADER RULES:

Example:
"GMS 79151 - Genpop | TNX543"

means:

projectNo = "79151"
surveyName = "Genpop"
tnxId = "TNX543"

Example:
"TRN 21554 - Gen-pop (Monterrey only) | TNX511"

means:

projectNo = "21554"
surveyName = "Gen-pop (Monterrey only)"
tnxId = "TNX511"

TAIL RULES:

Example:
"543 ="371515368214102272" China 118.123.80.10 Completed"

means:

tnxId = "TNX543"
supplierId = "371515368214102272"
country = "China"
location = "China"
ip = "118.123.80.10"
status = "Completed"

Example:
"78014 rfderday00srj United States 76.250.239.86 Completed"

means:

projectNo = "78014"
supplierId = "rfderday00srj"
country = "United States"
location = "United States"
ip = "76.250.239.86"
status = "Completed"

For:
"21425 jgreefjday00srj United States 76.250.239.112 Completed"

means:

projectNo = "21425"
supplierId = "jgreefjday00srj"
country = "United States"
location = "United States"
ip = "76.250.239.112"
status = "Completed"

FIELD RULES:

"Age - 46–55" -> age = "46–55"

"Gender - male" -> gender = "male"

"Job title - Director" -> jobTitle = "Director"

"role-Director of IT Infrastructure" is additional information and may be stored in data as:

"role": "Director of IT Infrastructure"

"Department- IT Technology" -> department = "IT Technology"

"Employees - 5001+" -> employees = "5001+"

"Household Income- 10,001 - 16,000元"
must remain exactly:
"10,001 - 16,000元"

Long free-text responses must NOT be discarded.

If multiple long answer paragraphs exist, preserve all of them in "oppo", separated by "\\n\\n".

The data object may contain additional fields that are not part of the standard schema.

OUTPUT SHAPE:

{
  "records": [
    {
      "category": "B2C",
      "accountType": null,
      "projectNo": null,
      "surveyName": null,
      "description": null,
      "pid": null,
      "tnxId": null,
      "supplierId": null,
      "location": null,
      "country": null,
      "ip": null,
      "status": null,
      "age": null,
      "gender": null,
      "jobTitle": null,
      "industry": null,
      "zipCode": null,
      "department": null,
      "employees": null,
      "brand": null,
      "revenue": null,
      "company": null,
      "nationality": null,
      "householdIncome": null,
      "oppo": null,
      "studyTopic": null,
      "recordId": null,
      "data": {}
    }
  ]
}
`.trim();

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
      JSON.parse(responseText);
  } catch {
    throw new Error(
      "Groq API returned invalid JSON"
    );
  }

  const content =
    apiResult?.choices?.[0]?.message
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

  let parsed: any;

  try {
    parsed =
      extractJson(content);
  } catch (error) {
    console.error(
      "GROQ CONTENT:",
      content
    );

    throw error;
  }

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
    records = parsed;
  } else if (
    parsed &&
    typeof parsed === "object"
  ) {
    records = [parsed];
  }

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

async function normalizeChunkWithRetry(
  paste: string,
  chunkLabel: string,
  attempt = 1
): Promise<GroqNormalizationResult> {
  try {
    return await normalizeChunkWithGroq(paste);
  } catch (error: any) {
    if (attempt < 2) {
      console.warn(
        `GROQ ${chunkLabel} failed (attempt ${attempt}), retrying...`,
        error?.message || error
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
   ------------------------------------------------------
   Splits the paste into "=====" delimited blocks, groups
   them into safely-sized chunks, and normalizes each
   chunk with its own Groq call (in parallel). If a chunk
   fails after a retry, its error is collected but the
   records from every other chunk are still returned —
   the caller decides what to do with a partial success.
====================================================== */

export async function normalizeSurveyWithGroq(
  paste: string
): Promise<GroqNormalizationResult> {
  const blocks = splitIntoBlocks(paste);

  // Nothing to split — just make the one call, same as before.
  if (blocks.length <= 1) {
    return normalizeChunkWithGroq(paste);
  }

  const chunks = chunkBlocks(blocks);
  const delimiter = "\n=====\n";

  console.log(
    `GROQ NORMALIZER: splitting ${blocks.length} block(s) into ${chunks.length} chunk(s)`
  );

  const settled = await Promise.allSettled(
    chunks.map((chunkBlocks, idx) =>
      normalizeChunkWithRetry(
        chunkBlocks.join(delimiter),
        `chunk ${idx + 1}/${chunks.length}`
      )
    )
  );

  const records: NormalizedSurveyRecord[] = [];
  const errors: string[] = [];

  settled.forEach((result, idx) => {
    if (result.status === "fulfilled") {
      records.push(...result.value.records);
    } else {
      const blockCount = chunks[idx].length;

      const message =
        result.reason?.message ||
        String(result.reason);

      console.error(
        `GROQ CHUNK ${idx + 1}/${chunks.length} FAILED:`,
        message
      );

      errors.push(
        `Chunk ${idx + 1}/${chunks.length} (${blockCount} record${
          blockCount === 1 ? "" : "s"
        }) failed to normalize: ${message}`
      );
    }
  });

  return {
    records,
    errors: errors.length ? errors : undefined,
    normalizedText: JSON.stringify(
      { records },
      null,
      2
    ),
  };
}