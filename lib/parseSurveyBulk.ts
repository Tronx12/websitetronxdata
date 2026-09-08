// lib/parseSurveyBulk.ts

export type SurveyCategory = "B2B" | "B2H" | "B2C";

export interface ParsedSurveyRecord {
  category: SurveyCategory;
  accountType: string;
  projectNo: string;
  panelCode?: string;
  description: string;
  pid: string;
  supplierId: string;
  country: string;
  ip: string;
  status: string;
  data: Record<string, string>;
  rawBlock: string;
}

const HEADER_RE =
  /^\s*(?:\d+\.\s*)?(GMS|TRN)\s+(\d+)\s*[-–—]\s*(.+?)\s*$/i;

const CATEGORY_RE = /^\s*(B2B|B2H|B2C)\s*$/i;

const IP_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/;

function clean(value: string): string {
  return value
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .trim();
}

function normalizeKey(value: string): string {
  return clean(value)
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function isValidIp(ip: string): boolean {
  if (!IP_RE.test(ip)) return false;
  return ip.split(".").every((part) => {
    const n = Number(part);
    return n >= 0 && n <= 255;
  });
}

/** Classic single-line format: PID SupplierID Country IP Status */
function parseMetadataLine(line: string) {
  const parts = clean(line).split(/\s+/);

  if (parts.length < 5) return null;

  const ipIndex = parts.findIndex(isValidIp);
  if (ipIndex < 3) return null;

  const ip = parts[ipIndex];
  const pid = parts[0];
  const supplierId = parts[1];
  const country = parts.slice(2, ipIndex).join(" ");
  const status = parts.slice(ipIndex + 1).join(" ");

  if (!pid || !supplierId || !country || !ip || !status) return null;

  return { pid, supplierId, country, ip, status };
}

function parseKeyValueLine(line: string) {
  const cleaned = clean(line);

  // Supports: Age - 32 | Age: 32 | Age = 32 | Age-32
  const match = cleaned.match(/^(.+?)\s*[-:=]\s*(.+)$/);
  if (!match) return null;

  const key = clean(match[1]);
  const value = clean(match[2]);
  if (!key || value === undefined) return null;

  return { key, value };
}

/**
 * Extract metadata either from a classic space-separated line
 * OR from Key-Value lines (pid, supplierId, country, ip, status, etc.)
 */
function extractMetadata(lines: string[]) {
  // 1. Prefer classic single-line metadata (search from bottom)
  for (let i = lines.length - 1; i >= 1; i--) {
    const parsed = parseMetadataLine(lines[i]);
    if (parsed) {
      return { metadata: parsed, metadataIndex: i, metaIndexes: [] as number[] };
    }
  }

  // 2. Fall back to Key-Value extraction
  const kvMeta: Record<string, string> = {};
  const metaIndexes: number[] = [];

  for (let i = 1; i < lines.length; i++) {
    const kv = parseKeyValueLine(lines[i]);
    if (!kv) continue;

    const nk = normalizeKey(kv.key);

    if (nk === "pid") {
      kvMeta.pid = kv.value;
      metaIndexes.push(i);
    } else if (nk === "supplierid" || nk === "supplier id") {
      kvMeta.supplierId = kv.value;
      metaIndexes.push(i);
    } else if (nk === "country" || nk === "location") {
      kvMeta.country = kv.value;
      metaIndexes.push(i);
    } else if (nk === "ip") {
      kvMeta.ip = kv.value;
      metaIndexes.push(i);
    } else if (nk === "status") {
      kvMeta.status = kv.value;
      metaIndexes.push(i);
    } else if (nk === "account type" || nk === "accounttype") {
      kvMeta.accountType = kv.value;
    } else if (nk === "projectid" || nk === "project id") {
      kvMeta.projectNo = kv.value;
    } else if (nk === "survey name") {
      kvMeta.description = kv.value;
    } else if (nk === "tnx" || nk === "tnx id" || nk === "tnx-id") {
      kvMeta.panelCode = kv.value;
    }
  }

  // We need at least pid + ip + status to consider it valid
  if (kvMeta.pid && kvMeta.ip && kvMeta.status) {
    return {
      metadata: {
        pid: kvMeta.pid,
        supplierId: kvMeta.supplierId || "N/A",
        country: kvMeta.country || "N/A",
        ip: kvMeta.ip,
        status: kvMeta.status,
        accountType: kvMeta.accountType,
        projectNo: kvMeta.projectNo,
        description: kvMeta.description,
        panelCode: kvMeta.panelCode,
      },
      metadataIndex: -1,
      metaIndexes,
    };
  }

  return null;
}

export function parseSurveyBlock(
  block: string,
  fallbackCategory: SurveyCategory = "B2C"
): ParsedSurveyRecord {
  const rawBlock = block.trim();
  if (!rawBlock) throw new Error("Empty survey block");

  const lines = rawBlock
    .split(/\r?\n/)
    .map(clean)
    .filter(Boolean);

  if (lines.length === 0) throw new Error("No survey data found");

  // ----------------------------------------
  // HEADER
  // ----------------------------------------
  let accountType = "GMS";
  let projectNo = "00000";
  let description = "Manual Record";
  let panelCode: string | undefined;

  const headerMatch = lines[0].match(HEADER_RE);

  if (headerMatch) {
    accountType = headerMatch[1].toUpperCase();
    projectNo = headerMatch[2];
    const headerDescription = clean(headerMatch[3]);

    description = headerDescription;

    if (headerDescription.includes("||")) {
      const parts = headerDescription.split("||");
      description = clean(parts[0]);
      if (parts[1]) panelCode = clean(parts[1]);
    }
  } else {
    // Allow "Manual Record" or numbered manual blocks
    const firstLine = lines[0].toLowerCase();
    if (
      firstLine.includes("manual") ||
      /^\d+\.\s*manual/i.test(lines[0])
    ) {
      description = lines[0];
    } else {
      throw new Error(
        `Invalid survey header: "${lines[0]}". Expected format like "GMS 79053 - Contact lenses"`
      );
    }
  }

  // ----------------------------------------
  // CATEGORY
  // ----------------------------------------
  let category: SurveyCategory = fallbackCategory;
  for (let i = 1; i < lines.length; i++) {
    const categoryMatch = lines[i].match(CATEGORY_RE);
    if (categoryMatch) {
      category = categoryMatch[1].toUpperCase() as SurveyCategory;
      break;
    }
  }

  // ----------------------------------------
  // METADATA (classic line OR key-value)
  // ----------------------------------------
  const extracted = extractMetadata(lines);

  if (!extracted) {
    throw new Error(
      `Metadata line not found for project ${projectNo}. Expected: PID SupplierID Country IP Status  OR  Key-Value lines (pid, supplierId, country, ip, status)`
    );
  }

  const { metadata, metadataIndex } = extracted;

  // Override header values if they were found in Key-Value
  if ((metadata as any).accountType) {
    accountType = (metadata as any).accountType;
  }
  if ((metadata as any).projectNo) {
    projectNo = (metadata as any).projectNo;
  }
  if ((metadata as any).description) {
    description = (metadata as any).description;
  }
  if ((metadata as any).panelCode) {
    panelCode = (metadata as any).panelCode;
  }

  // ----------------------------------------
  // SURVEY DATA – store EVERY key-value pair
  // ----------------------------------------
  const data: Record<string, string> = {};

  for (let i = 1; i < lines.length; i++) {
    // Skip pure category line
    if (CATEGORY_RE.test(lines[i])) continue;

    // Skip the classic single-line metadata (if we found one)
    if (i === metadataIndex) continue;

    const kv = parseKeyValueLine(lines[i]);
    if (!kv) continue;

    // Store ALL fields (no exclusions)
    data[kv.key] = kv.value;
  }

  return {
    category,
    accountType,
    projectNo,
    panelCode,
    description,
    pid: metadata.pid,
    supplierId: metadata.supplierId,
    country: metadata.country,
    ip: metadata.ip,
    status: metadata.status,
    data,
    rawBlock,
  };
}

export function parseBulkPaste(
  paste: string,
  fallbackCategory: SurveyCategory = "B2C"
): { records: ParsedSurveyRecord[]; errors: string[] } {
  if (!paste?.trim()) {
    return { records: [], errors: ["Paste data is empty"] };
  }

  const normalized = paste
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  // Split on lines that are mostly =====
  const blocks = normalized
    .split(/^\s*=+\s*$/gm)
    .map((b) => b.trim())
    .filter(Boolean);

  const records: ParsedSurveyRecord[] = [];
  const errors: string[] = [];

  blocks.forEach((block, index) => {
    try {
      const record = parseSurveyBlock(block, fallbackCategory);
      records.push(record);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown parsing error";
      errors.push(`Record ${index + 1}: ${message}`);
    }
  });

  return { records, errors };
}

export default parseBulkPaste;

export function categoryToStudyType(category: SurveyCategory): string {
  switch (category) {
    case "B2C":
      return "Genpop";
    case "B2H":
      return "Healthcare";
    case "B2B":
      return "B2B";
    default:
      return "Unknown";
  }
}