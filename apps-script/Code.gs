var SHEET_ID      = "1KOrf25AFVEanO5cD0ZlXLNGZ2e9pi7bRBUjFCMwVA5I";
var PENDING_SHEET = "PENDING";
var GROQ_KEY = PropertiesService
  .getScriptProperties()
  .getProperty("GROQ_KEY");
// var GROQ_MODEL = "openai/gpt-oss-20b";
var GROQ_MODEL = "openai/gpt-oss-120b";

// ═══════════════════════════════════════════
// PAGE ROUTER
// ═══════════════════════════════════════════
// function doGet(e) {
//   var page = e.parameter.page || "";
//   if (page === "dqa")     return HtmlService.createHtmlOutputFromFile("dqa").setTitle("DQA Panel").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
//   if (page === "quality") return HtmlService.createHtmlOutputFromFile("quality").setTitle("Quality Manager").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
//   return HtmlService.createHtmlOutputFromFile("submit").setTitle("OE Submission").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
// }

function doGet(e) {
  var page = (e && e.parameter && e.parameter.page)
    ? e.parameter.page
    : "";

  if (page === "dqa") {
    return HtmlService
      .createHtmlOutputFromFile("dqa")
      .setTitle("DQA Panel")
      .setXFrameOptionsMode(
        HtmlService.XFrameOptionsMode.ALLOWALL
      );
  }

  if (page === "quality") {
    return HtmlService
      .createHtmlOutputFromFile("quality")
      .setTitle("Quality Manager")
      .setXFrameOptionsMode(
        HtmlService.XFrameOptionsMode.ALLOWALL
      );
  }
  if (page === "oe-performance") {

  return HtmlService
    .createHtmlOutputFromFile(
      "oe-performance"
    )
    .setTitle(
      "OE Performance"
    )
    .setXFrameOptionsMode(
      HtmlService.XFrameOptionsMode.ALLOWALL
    );

}

  return HtmlService
    .createHtmlOutputFromFile("submit")
    .setTitle("OE Submission")
    .setXFrameOptionsMode(
      HtmlService.XFrameOptionsMode.ALLOWALL
    );
}

// ═══════════════════════════════════════════
// EXTRACT PID CODE (GMS 12345 - Name → "12345")
// ═══════════════════════════════════════════
function extractPIDCode(pid) {
  if (!pid) return "";
  var m = String(pid).match(/(?:GMS|IER|TRN)\s*(\d+)/i);
  return m ? m[1] : String(pid).trim().toUpperCase();
}

// ═══════════════════════════════════════════
// CACHE INVALIDATION
// ═══════════════════════════════════════════
function invalidateCache() {
  try {
    CacheService.getScriptCache().removeAll(["dqa_data_v2", "dash_stats_v2"]);
  } catch(e) {}
}

// ═══════════════════════════════════════════
// UPLOAD IMAGE TO DRIVE — returns direct view URL
// ═══════════════════════════════════════════
function uploadImageToDrive(base64Data, fileName) {
  try {
    var folders = DriveApp.getFoldersByName("OE_Images");
    var folder  = folders.hasNext() ? folders.next() : DriveApp.createFolder("OE_Images");
    var match   = base64Data.match(/^data:(.*?);base64,/);
    var contentType = match ? match[1] : "image/jpeg";
    var base64  = base64Data.replace(/^data:.*?;base64,/, "");
    var decoded = Utilities.base64Decode(base64);
    var blob    = Utilities.newBlob(decoded, contentType, fileName);
    var file    = folder.createFile(blob);
   file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
   return "https://lh3.googleusercontent.com/d/" + file.getId();
  } catch(e) {
    Logger.log("uploadImageToDrive error: " + e.toString());
    return "";
  }
}

// ═══════════════════════════════════════════
// SUBMIT OE — stores extracted PID code, 19 cols
// ═══════════════════════════════════════════
function submitOE(data) {
  var ss      = SpreadsheetApp.openById(SHEET_ID);
  var pending = getOrCreateSheet(ss, PENDING_SHEET);

  if (pending.getLastRow() === 0) {
    pending.appendRow(["ID","Timestamp","Member Name","PID","Question","OE Response",
      "DQA Correction","Status","Approved By","Approved Time","Copied",
      "AI Score","AI Reason","Relevancy Score","Relevancy Reason","Reject Reason","Old OE ID",
      "Image URL","DQA Viewed Time"]);
    pending.getRange(1,1,1,19).setFontWeight("bold").setBackground("#4a86e8").setFontColor("white");
  }

  var pid = extractPIDCode(data.pid);  // store only numeric/short code
  var id  = Utilities.getUuid().substring(0,8).toUpperCase();
  var ai  = data.qualityResult ? data.qualityResult : checkOEQuality(data.oeResponse, data.qNumber, false);

  var aiScore   = ai.ai_score         || 0;
  var aiReason  = ai.ai_reason        || "";
  var relScore  = ai.relevancy_score  || 0;
  var relReason = ai.relevancy_reason || "";

  pending.appendRow([
    id, new Date().toISOString(), data.memberName, pid,
    data.qNumber, data.oeResponse,
    "", "PENDING", "", "", "",
    aiScore, aiReason, relScore, relReason,
    "", data.oldOEId || "", data.imageUrl || "", ""
  ]);

  var lastRow = pending.getLastRow();
  pending.getRange(lastRow, 1, 1, 19).setBackground("#fff2cc");
  invalidateCache();
  return { success:true, id:id, aiStatus:"PENDING", aiScore:aiScore, relScore:relScore };
}

// ═══════════════════════════════════════════
// UPDATE EXISTING PENDING OE (in-place edit)
// ═══════════════════════════════════════════
function updateOE(oeId, newText) {
  var ss      = SpreadsheetApp.openById(SHEET_ID);
  var pending = ss.getSheetByName(PENDING_SHEET);
  if (!pending || pending.getLastRow() <= 1) return { success:false };

  var data = pending.getRange(2, 1, pending.getLastRow()-1, 19).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(oeId)) {
      var rowIndex = i + 2;
      var qNumber  = String(data[i][4]);
      var ai       = checkOEQuality(newText, qNumber, false);

      pending.getRange(rowIndex, 6).setValue(newText);
      pending.getRange(rowIndex, 7).setValue("");
      pending.getRange(rowIndex, 8).setValue("PENDING");
      pending.getRange(rowIndex, 9).setValue("");
      pending.getRange(rowIndex, 10).setValue("");
      pending.getRange(rowIndex, 12).setValue(ai.ai_score         || 0);
      pending.getRange(rowIndex, 13).setValue(ai.ai_reason        || "");
      pending.getRange(rowIndex, 14).setValue(ai.relevancy_score  || 0);
      pending.getRange(rowIndex, 15).setValue(ai.relevancy_reason || "");
      pending.getRange(rowIndex, 19).setValue("");  // reset DQA viewed
      pending.getRange(rowIndex, 1, 1, 19).setBackground("#fff2cc");
      invalidateCache();
      return { success:true, id:String(data[i][0]) };
    }
  }
  return { success:false };
}

// ═══════════════════════════════════════════
// GET EXACT PID SHEET URL (with gid)
// ═══════════════════════════════════════════
function getPIDSheetURL(pid) {
  var ss        = SpreadsheetApp.openById(SHEET_ID);
  var projectId = extractProjectId(pid);
  var sheet     = ss.getSheetByName(projectId);
  var base      = "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/edit";
  if (!sheet) return base;
  return base + "#gid=" + sheet.getSheetId();
}

// ═══════════════════════════════════════════
// APPROVE OE (rowIndex-based, writes to PID sheet)
// ═══════════════════════════════════════════
function approveOE(rowIndex, dqaName, correction) {
  var ss      = SpreadsheetApp.openById(SHEET_ID);
  var pending = ss.getSheetByName(PENDING_SHEET);
  var row     = pending.getRange(rowIndex, 1, 1, 10).getValues()[0];
  var pid        = row[3];
  var qNumber    = row[4];
  var oeOriginal = row[5];

  var finalOE = (correction && correction.trim() !== "") ? correction.trim() : oeOriginal;

  pending.getRange(rowIndex, 7).setValue(finalOE);
  pending.getRange(rowIndex, 8).setValue("APPROVED");
  pending.getRange(rowIndex, 9).setValue(dqaName);
  pending.getRange(rowIndex, 10).setValue(new Date().toString());
  pending.getRange(rowIndex, 1, 1, 19).setBackground("#d9ead3");

  var projectId = extractProjectId(pid);
  var pidSheet  = getOrCreateSheet(ss, projectId);
  if (pidSheet.getLastRow() === 0) {
    pidSheet.appendRow(["PID","Q#","Original OE","Approved OE","Member","Approved By","Timestamp"]);
    pidSheet.getRange(1,1,1,7).setFontWeight("bold").setBackground("#6aa84f").setFontColor("white");
  }
  pidSheet.appendRow([pid, qNumber, oeOriginal, finalOE, row[2], dqaName, new Date().toString()]);
  pidSheet.getRange(pidSheet.getLastRow(), 1, 1, 7).setBackground("#d9ead3");

  invalidateCache();
  return { success: true };
}

// ═══════════════════════════════════════════
// REJECT OE (rowIndex-based)
// ═══════════════════════════════════════════
function rejectOE(rowIndex, dqaName, reason) {
  var ss      = SpreadsheetApp.openById(SHEET_ID);
  var pending = ss.getSheetByName(PENDING_SHEET);

  pending.getRange(rowIndex, 8).setValue("REJECTED");
  pending.getRange(rowIndex, 9).setValue(dqaName);
  pending.getRange(rowIndex, 10).setValue(new Date().toString());
  pending.getRange(rowIndex, 16).setValue(reason);
  pending.getRange(rowIndex, 1, 1, 19).setBackground("#fce8e6");

  invalidateCache();
  return { success: true };
}

// ═══════════════════════════════════════════
// RECALL OE (rowIndex-based)
// ═══════════════════════════════════════════
function recallOE(rowIndex) {
  var ss      = SpreadsheetApp.openById(SHEET_ID);
  var pending = ss.getSheetByName(PENDING_SHEET);

  pending.getRange(rowIndex, 7).setValue("");
  pending.getRange(rowIndex, 8).setValue("PENDING");
  pending.getRange(rowIndex, 9).setValue("");
  pending.getRange(rowIndex, 10).setValue("");
  pending.getRange(rowIndex, 16).setValue("");
  pending.getRange(rowIndex, 19).setValue("");
  pending.getRange(rowIndex, 1, 1, 19).setBackground("#fff2cc");

  invalidateCache();
  return { success: true };
}

// ═══════════════════════════════════════════
// MARK DQA VIEWING (by OE ID, writes col 19)
// ═══════════════════════════════════════════
function markDQAViewing(oeId) {
  var ss      = SpreadsheetApp.openById(SHEET_ID);
  var pending = ss.getSheetByName(PENDING_SHEET);
  if (!pending || pending.getLastRow() <= 1) return { success:false };
  var data = pending.getRange(2, 1, pending.getLastRow()-1, 19).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(oeId)) {
      if (!data[i][18]) {  // only set if not already set
        pending.getRange(i+2, 19).setValue(new Date().toISOString());
        invalidateCache();
      }
      return { success:true };
    }
  }
  return { success:false };
}

// ═══════════════════════════════════════════
// GET PENDING OEs — 19 cols, cached 20s
// ═══════════════════════════════════════════
function getPendingOEs(filterName) {
  var ss      = SpreadsheetApp.openById(SHEET_ID);
  var pending = ss.getSheetByName(PENDING_SHEET);
  if (!pending || pending.getLastRow() <= 1) return [];

  var numCols = Math.min(pending.getLastColumn(), 19);
  var data    = pending.getRange(2, 1, pending.getLastRow()-1, numCols).getValues();
  var result  = [];

  data.forEach(function(row, i) {
    if (!filterName || filterName === "ALL" ||
        String(row[2]).trim().toLowerCase() === filterName.toLowerCase()) {
      result.push({
        rowIndex:      i + 2,
        id:            String(row[0]),
        timestamp:     row[1] ? (row[1] instanceof Date ? row[1].toISOString() : String(row[1])) : "",
        memberName:    String(row[2]),
        pid:           String(row[3]),
        qNumber:       String(row[4]),
        oeResponse:    String(row[5]),
        dqaCorrection: String(row[6]),
        status:        String(row[7]).trim(),
        approvedBy:    String(row[8]  || ""),
        approvedTime:  row[9] ? (row[9] instanceof Date ? row[9].toISOString() : String(row[9])) : "",
        aiScore:       String(row[11] || ""),
        aiReason:      String(row[12] || ""),
        relScore:      String(row[13] || ""),
        relReason:     String(row[14] || ""),
        rejectReason:  String(row[15] || ""),
        oldOEId:       String(row[16] || ""),
        imageUrl:      String(row[17] || ""),
        dqaViewedTime: String(row[18] || "")
      });
    }
  });

  result.sort(function(a,b) { return new Date(b.timestamp) - new Date(a.timestamp); });
  return result;
}

// ═══════════════════════════════════════════
// GET MY RESULTS — 19 cols
// ═══════════════════════════════════════════
// ═══════════════════════════════════════════
// GET MY RESULTS — 19 cols
// ═══════════════════════════════════════════
function getMyResults(memberName) {

  // Safely handle undefined/null
  memberName = String(memberName || "").trim();

  Logger.log("===== getMyResults =====");
  Logger.log("Requested memberName: [" + memberName + "]");

  if (!memberName) {
    Logger.log("No member name provided");
    return [];
  }

  var ss = SpreadsheetApp.openById(SHEET_ID);
  var pending = ss.getSheetByName(PENDING_SHEET);

  if (!pending) {
    Logger.log("PENDING sheet not found");
    return [];
  }

  var lastRow = pending.getLastRow();
  var lastColumn = pending.getLastColumn();

  Logger.log("PENDING rows: " + lastRow);
  Logger.log("PENDING columns: " + lastColumn);

  // Only header exists
  if (lastRow <= 1) {
    Logger.log("No submission rows found");
    return [];
  }

  var numCols = Math.min(lastColumn, 19);

  var data = pending
    .getRange(
      2,
      1,
      lastRow - 1,
      numCols
    )
    .getValues();

  var result = [];

  var targetName = memberName
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  data.forEach(function(row, index) {

    // Column C = Member Name
    var rowName = String(row[2] || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    // Column K = Copied
    var copied = String(row[10] || "")
      .trim()
      .toUpperCase();

    Logger.log(
      "Row " + (index + 2) +
      " | NAME=[" + rowName + "]" +
      " | TARGET=[" + targetName + "]" +
      " | COPIED=[" + copied + "]"
    );

    // Different member
    if (rowName !== targetName) {
      return;
    }

    // Already copied
    if (copied === "COPIED") {
      return;
    }

    // Column G = DQA Correction
    var correction = String(row[6] || "").trim();

    // Column F = Original OE
    var originalOE = String(row[5] || "");

    var finalOE = correction !== ""
      ? correction
      : originalOE;

    result.push({

      // Column A
      id: String(row[0] || ""),

      // Column D
      pid: String(row[3] || ""),

      // Column E
      qNumber: String(row[4] || ""),

      // Column F
      originalOE: originalOE,

      // Column G/F
      approvedOE: finalOE,

      // Column H
      status: String(row[7] || "").trim(),

      // Column I
      approvedBy: String(row[8] || ""),

      // Column L
      aiScore: String(row[11] || ""),

      // Column M
      aiReason: String(row[12] || ""),

      // Column N
      relScore: String(row[13] || ""),

      // Column O
      relReason: String(row[14] || ""),

      // Column P
      rejectReason: String(row[15] || ""),

      // Column B
      timestamp:
        row[1] instanceof Date
          ? row[1].toISOString()
          : String(row[1] || ""),

      // Column R
      imageUrl: String(row[17] || ""),

      // Column S
      dqaViewedTime: String(row[18] || "")
    });

  });

  Logger.log("Total results found: " + result.length);
  Logger.log("RESULT: " + JSON.stringify(result));

  return result;
}


// ═══════════════════════════════════════════
// DASHBOARD STATS — cached 20s
// ═══════════════════════════════════════════
function getDashboardStats() {
  var cache  = CacheService.getScriptCache();
  var cached = cache.get("dash_stats_v2");
  if (cached) { try { return JSON.parse(cached); } catch(e) {} }

  var ss      = SpreadsheetApp.openById(SHEET_ID);
  var pending = ss.getSheetByName(PENDING_SHEET);
  if (!pending || pending.getLastRow() <= 1) {
    return { totalPending:0, totalApproved:0, totalRejected:0, submittedToday:0, approvedToday:0, employees:[] };
  }

  var data  = pending.getRange(2, 1, pending.getLastRow()-1, 16).getValues();
  var today = new Date(); today.setHours(0,0,0,0);
  var stats = { totalPending:0, totalApproved:0, totalRejected:0, submittedToday:0, approvedToday:0, empMap:{} };

  data.forEach(function(row) {
    var status = String(row[7]).trim();
    var name   = String(row[2]).trim();
    if (status === "PENDING")  stats.totalPending++;
    if (status === "APPROVED") stats.totalApproved++;
    if (status === "REJECTED") stats.totalRejected++;
    if (row[1]) { var d = new Date(row[1]); d.setHours(0,0,0,0); if (d.getTime() === today.getTime()) stats.submittedToday++; }
    if (row[9] && status === "APPROVED") { var a = new Date(row[9]); a.setHours(0,0,0,0); if (a.getTime() === today.getTime()) stats.approvedToday++; }
    if (name) stats.empMap[name] = (stats.empMap[name] || 0) + 1;
  });

  stats.employees = Object.keys(stats.empMap).sort();
  try { cache.put("dash_stats_v2", JSON.stringify(stats), 20); } catch(e) {}
  return stats;
}

// ═══════════════════════════════════════════
// GET DQA DATA — cached 20s
// ═══════════════════════════════════════════
function getDQAData() {
  var cache  = CacheService.getScriptCache();
  var cached = cache.get("dqa_data_v2");
  if (cached) { try { return JSON.parse(cached); } catch(e) {} }
  var result = { stats: getDashboardStats(), oes: getPendingOEs("ALL") };
  try { cache.put("dqa_data_v2", JSON.stringify(result), 20); } catch(e) {}
  return result;
}

// ═══════════════════════════════════════════
// GET APPROVED OEs BY PID
// ═══════════════════════════════════════════
function getApprovedOEsByPID(pid) {
  var ss      = SpreadsheetApp.openById(SHEET_ID);
  var pending = ss.getSheetByName(PENDING_SHEET);
  if (!pending || pending.getLastRow() <= 1) return [];

  var pidCode = extractPIDCode(pid);
  var numCols = Math.min(pending.getLastColumn(), 19);
  var data    = pending.getRange(2, 1, pending.getLastRow()-1, numCols).getValues();
  var result  = [];

  data.forEach(function(row) {
    var status  = String(row[7]||"").trim();
    if (status !== "APPROVED") return;
    var rowPid  = String(row[3]||"").trim();
    var rowCode = extractPIDCode(rowPid);
    if (rowCode !== pidCode && rowPid !== pid && rowPid.toLowerCase() !== pid.toLowerCase()) return;
    var finalOE = String(row[6]||"").trim() || String(row[5]||"");
    result.push({
      id:         String(row[0]||""),
      member:     String(row[2]||""),
      pid:        rowPid,
      qNumber:    String(row[4]||""),
      approvedOE: finalOE,
      approvedBy: String(row[8]||""),
      approvedAt: row[9] ? (row[9] instanceof Date ? row[9].toISOString() : String(row[9])) : ""
    });
  });
  return result;
}

// ═══════════════════════════════════════════
// CHECK DUPLICATE OE — within same PID only
// ═══════════════════════════════════════════
function checkDuplicateOE(oeText, pid) {
  try {
    var pidCode  = extractPIDCode(pid);
    var ss       = SpreadsheetApp.openById("19uhwY8H-aAAZqh_lF81Gvh3I6Uw5FbI-F9W3uAbk0zc");
    var sheet    = ss.getSheetByName("PENDING");
    if (!sheet) return { isDuplicate: false };
    var data     = sheet.getDataRange().getValues();
    var newClean = String(oeText).trim().toLowerCase().replace(/[^a-z0-9\s]/g, " ");
    var newWords = newClean.split(/\s+/).filter(function(w){ return w.length > 0; });
    if (newWords.length < 5) return { isDuplicate: false };
    for (var i = 1; i < data.length; i++) {
      var row    = data[i];
      var status = String(row[7] || "").toUpperCase();
      if (status !== "APPROVED" && status !== "AUTO_APPROVED") continue;
      var rowPid = extractPIDCode(String(row[3] || ""));
      if (rowPid !== pidCode) continue;
      var exClean = String(row[5] || "").trim().toLowerCase().replace(/[^a-z0-9\s]/g, " ");
      if (!exClean || exClean.split(/\s+/).length < 3) continue;
      var start3 = newWords.slice(0, 3).join(" ");
      if (exClean.indexOf(start3) !== -1) {
        return { isDuplicate: true, matchType: "Same starting words — \"" + start3 + "\"", preview: String(row[5]).substring(0, 120) };
      }
      var end3 = newWords.slice(-3).join(" ");
      if (exClean.indexOf(end2) !== -1) {
        return { isDuplicate: true, matchType: "Same ending words — \"" + end3 + "\"", preview: String(row[5]).substring(0, 120) };
      }
      for (var j = 1; j <= newWords.length - 3; j++) {
        var chunk = newWords.slice(j, j + 3).join(" ");
        if (exClean.indexOf(chunk) !== -1) {
          return { isDuplicate: true, matchType: "Same middle words — \"" + chunk + "\"", preview: String(row[5]).substring(0, 120) };
        }
      }
    }
    return { isDuplicate: false };
  } catch(e) {
    Logger.log("checkDuplicateOE error: " + e);
    return { isDuplicate: false };
  }
}

// ═══════════════════════════════════════════
// CHECK OE QUALITY
// ═══════════════════════════════════════════
function checkOEQuality(oeResponse, question, isRelatedToPrevious) {
  var url = "https://api.groq.com/openai/v1/chat/completions";
  var relatedNote = isRelatedToPrevious ? "\nSPECIAL CONTEXT: The respondent says this answer relates to a previous survey question. Be more lenient on relevancy.\n" : "";
    // var prompt = "You are a strict fraud detector for market research. Real survey respondents are ordinary people typing fast on a phone. Your job: catch answers that were written or polished by AI (ChatGPT etc.) so they do NOT reach the client.\n\n"
    // + "Question: " + question + "\nResponse: " + oeResponse + relatedNote + "\n\n"
    // + "━━━ RELEVANCY SCORE (0-100) ━━━\n"
    // + "Check if the MEANING of the response matches the MEANING of the question.\n"
    // + "- Response completely unrelated → 0–15\n- Too vague, could answer any question → 10–25\n"
    // + "- Touches topic but misses main point → 25–45\n- Partially answers → 45–65\n"
    // + "- Mostly answers → 65–80\n- Directly and specifically answers → 80–100\n\n"
    // + "━━━ HUMAN SCORE (0-100) ━━━\n"
    // + "Start at 100. Subtract for AI signals:\n"
    // + "- Uses Additionally/Furthermore/Moreover/In conclusion → -25 each\n"
    // + "- Lists 3+ features in sequence → -30\n- No personal pronouns (I/my/me) anywhere → -20\n"
    // + "- Formal structured grammar throughout → -15\n- Generic fits any question → -20\n"
    // + "- Sounds like marketing copy → -30\n- Restates question at start → -15\n"
    // + "Add for human signals:\n- Uses I/my/me/honestly/tbh/I think → +15\n"
    // + "- Casual conversational words → +10\n- Focuses on ONE specific thing → +10\n"
    // + "- Short direct personal answer → +10\n\n"
    // + "━━━ OUTPUT ━━━\n"
    // + "Return ONLY raw JSON — no markdown, no code block:\n"
    // + "{\"ai_verdict\":\"HUMAN\",\"ai_score\":72,\"ai_reason\":\"specific evidence\","
    // + "\"relevancy_score\":80,\"relevancy_verdict\":\"RELEVANT\","
    // + "\"relevancy_reason\":\"reason the response matches or misses the question\","
    // + "\"overall\":\"PASS\",\"suggestion\":\"one specific actionable improvement tip\"}\n\n"
    // + "overall = PASS only if ai_score >= 50 AND relevancy_score >= 50. ";
      
      var prompt =
      "You are a STRICT evaluator of open-ended market-research responses. " +
      "Evaluate the response independently on TWO separate dimensions: HUMAN-LIKENESS and RELEVANCY. " +
      "Do NOT assume a response is human merely because it uses I, my, me, casual language, or is short. " +
      "Do NOT give high scores by default. Every score must be justified by observable evidence in the actual response.\n\n"

      + "QUESTION:\n" + question + "\n\n"
      + "RESPONSE:\n" + oeResponse + "\n"
      + relatedNote + "\n\n"

      + "============================\n"
      + "RELEVANCY SCORE: 0-100\n"
      + "============================\n\n"

      + "Evaluate whether the response actually answers the specific question.\n"
      + "Do NOT reward generic statements merely because they mention a related topic.\n\n"

      + "0-10 = Completely unrelated, nonsense, or does not address the question.\n"
      + "11-25 = Barely related; mostly generic or avoids answering the question.\n"
      + "26-40 = Mentions the general topic but does not answer what was asked.\n"
      + "41-55 = Partially answers the question but is vague or incomplete.\n"
      + "56-70 = Answers the question reasonably but lacks meaningful specificity.\n"
      + "71-80 = Clearly answers the question with some specific relevance.\n"
      + "81-90 = Direct, specific, and clearly focused on exactly what was asked.\n"
      + "91-100 = Exceptionally specific and directly answers the exact question with concrete personal detail.\n\n"

      + "IMPORTANT RELEVANCY RULES:\n"
      + "- A generic answer that could fit many different questions MUST NOT receive above 70.\n"
      + "- A response that mentions a topic but does not explain the requested thing MUST NOT receive above 55.\n"
      + "- Do not give 90+ unless the answer contains concrete details specifically connected to the question.\n"
      + "- Do not give 80+ simply because the answer sounds natural.\n\n"

      + "============================\n"
      + "HUMAN-LIKENESS SCORE: 0-100\n"
      + "============================\n\n"

      + "Estimate whether the response appears naturally written by an ordinary survey respondent " +
      "rather than generated or heavily polished by an AI system.\n\n"

      + "Start from NEUTRAL, not 100.\n"
      + "Use approximately 50 as the starting point before examining evidence.\n\n"

      + "Possible HUMAN-LIKE signals:\n"
      + "- Natural first-person experience with concrete personal detail: +5 to +15\n"
      + "- Slightly imperfect or spontaneous wording: +3 to +10\n"
      + "- Natural conversational phrasing: +3 to +8\n"
      + "- Specific personal preference, situation, or experience: +5 to +15\n"
      + "- Uneven sentence structure that still remains understandable: +2 to +6\n\n"

      + "Possible AI-LIKE signals:\n"
      + "- Generic polished statement with little or no personal detail: -10 to -20\n"
      + "- Could easily be reused as an answer to many unrelated questions: -10 to -20\n"
      + "- Excessively polished or formal wording for a casual survey: -5 to -15\n"
      + "- Artificially structured or balanced sentences: -5 to -15\n"
      + "- Generic motivational/corporate language: -5 to -15\n"
      + "- Repeated formulaic phrasing: -5 to -15\n"
      + "- Unnaturally comprehensive answer to a simple question: -5 to -15\n"
      + "- AI-style transition words such as Furthermore, Moreover, Additionally, In conclusion: -10 to -20\n"
      + "- Repeats or paraphrases the question unnecessarily: -5 to -10\n"
      + "- Sounds like marketing, professional copy, or an essay instead of a survey response: -10 to -20\n\n"

      + "IMPORTANT HUMAN SCORE RULES:\n"
      + "- NEVER give 100 unless there is extremely strong evidence of natural human authorship.\n"
      + "- Using I/my/me alone is NOT evidence of human authorship.\n"
      + "- A short answer is NOT automatically human.\n"
      + "- A grammatically correct answer is NOT automatically human.\n"
      + "- A casual tone is NOT automatically human.\n"
      + "- Generic answers should normally fall around 35-65.\n"
      + "- Clearly polished/generic AI-like answers with multiple AI signals should score 0-15, not 20-45.\n"
      + "- Strongly natural, specific, spontaneous answers can score 70-90.\n"
      + "- Reserve 91-100 for exceptionally convincing human-like responses.\n\n"

      + "============================\n"
      + "HARD OVERRIDE RULES (apply AFTER computing the base human score above)\n"
      + "============================\n\n"

      + "Count how many STRONG AI-signal categories are present in the response.\n"
      + "STRONG AI signals include: AI-style transition words (Furthermore/Moreover/Additionally/In conclusion); "
      + "list-like generic phrasing (e.g. stringing together words like teamwork, growth, collaboration, innovation); "
      + "unnaturally comprehensive or balanced structure for a casual survey answer; "
      + "marketing/essay-like tone; repeated formulaic phrasing; a generic statement that could answer many unrelated questions.\n\n"
      + "- If 3 or more STRONG AI signals are present: cap ai_score at 10 maximum, regardless of any positive signals found.\n"
      + "- If exactly 2 STRONG AI signals are present: cap ai_score at 25 maximum.\n"
      + "- If exactly 1 STRONG AI signal is present with no offsetting concrete personal detail: cap ai_score at 40 maximum.\n"
      + "- These caps are a final ceiling applied after the additive scoring above, not an average with it.\n"
      + "- A single natural-sounding word or phrase (e.g. 'honestly', 'I guess', 'tbh') does NOT offset multiple STRONG AI signals. "
      + "Polish or casual veneer layered over generic AI-like content is still AI-like and must remain capped.\n"
      + "- If NO STRONG AI signals are present and multiple HUMAN-LIKE signals are present, no cap applies; score normally.\n\n"

      + "============================\n"
      + "ANTI-BIAS RULES\n"
      + "============================\n\n"

      + "Evaluate the actual text, not your assumptions about the respondent.\n"
      + "Do not increase the score merely because the answer is grammatical.\n"
      + "Do not decrease the score merely because the answer is grammatical either.\n"
      + "Do not use word count alone to determine either score.\n"
      + "Do not automatically classify all concise answers as human.\n"
      + "Do not automatically classify all detailed answers as AI.\n"
      + "Human and relevancy scores MUST be evaluated independently.\n\n"

      + "============================\n"
      + "EXAMPLES OF CALIBRATION\n"
      + "============================\n\n"

      + "Example A:\n"
      + "Question: What do you enjoy most about working?\n"
      + "Response: I enjoy solving problems and learning new things while working. It feels good when I can complete a task successfully and see the result of my work.\n"
      + "This is relevant, but it is also somewhat generic and polished. Do NOT automatically score it 100 human.\n\n"

      + "Example B:\n"
      + "Question: What do you enjoy most about working?\n"
      + "Response: Honestly, I like fixing bugs because I get stuck on them sometimes, but when I finally figure them out it feels really satisfying.\n"
      + "This contains a more specific personal experience and natural phrasing, so it can receive a higher human-likeness score.\n\n"

      + "Example C:\n"
      + "Question: What do you enjoy most about working?\n"
      + "Response: I enjoy teamwork, growth, collaboration, learning, innovation, and achieving meaningful results.\n"
      + "This is related but highly generic and list-like. This contains 2+ STRONG AI signals (list-like generic phrasing, "
      + "reusable-for-any-question), so ai_score must be capped at 25 maximum. Relevancy should also not be extremely high.\n\n"

      + "Example D:\n"
      + "Question: What do you enjoy most about working?\n"
      + "Response: I find great fulfillment in fostering collaborative synergy. Furthermore, professional growth and innovation "
      + "are deeply important to me. In conclusion, meaningful achievement drives my satisfaction.\n"
      + "This contains 3+ STRONG AI signals (AI transition words, marketing/essay tone, generic reusable content), "
      + "so ai_score must be capped at 10 maximum regardless of grammatical fluency.\n\n"

      + "============================\n"
      + "OUTPUT\n"
      + "============================\n\n"

      + "Return ONLY valid JSON. No markdown. No explanation outside JSON.\n"
      + "Use integer scores from 0 to 100.\n"
      + "The reason fields must cite specific evidence from the response.\n"
      + "If a hard override cap was applied, mention which STRONG AI signals triggered it in ai_reason.\n\n"

      + "{"
      + "\"ai_verdict\":\"HUMAN\","
      + "\"ai_score\":0,"
      + "\"ai_reason\":\"specific observable evidence, including any hard override signals triggered\","
      + "\"relevancy_score\":0"
      + "\"relevancy_verdict\":\"RELEVANT\","
      + "\"relevancy_reason\":\"specific explanation of how well the response answers the question\","
      + "\"overall\":\"PASS\","
      + "\"suggestion\":\"one specific improvement\""
      + "}\n\n"

      + "VERDICT RULES:\n"
      + "ai_verdict = HUMAN when ai_score >= 0; otherwise AI.\n"
      + "relevancy_verdict = RELEVANT when relevancy_score >= 0; otherwise UNRELEVANT.\n"
      + "overall = PASS ONLY when BOTH ai_score >= 0 AND relevancy_score >= 0.";

  var payload = { model:GROQ_MODEL, messages:[{role:"user",content:prompt}], temperature:0, max_tokens:1200, reasoning_effort:"low", seed:42 };
  try {
    var options = { method:"POST", headers:{"Authorization":"Bearer "+GROQ_KEY,"Content-Type":"application/json"}, payload:JSON.stringify(payload), muteHttpExceptions:true };
    var res  = UrlFetchApp.fetch(url, options);
    var code = res.getResponseCode();
    var raw  = res.getContentText();
    Logger.log("RAW CONTENT: " + raw);
    Logger.log("checkOEQuality HTTP: " + code);
    if (code === 429) return { ai_verdict:"PENDING", ai_score:55, ai_reason:"AI busy — wait 1 min", relevancy_score:55, relevancy_verdict:"PENDING", relevancy_reason:"Try again", overall:"FAIL", suggestion:"Wait 1 minute then re-check." };
    if (code !== 200) return { ai_verdict:"FAIL", ai_score:0, ai_reason:"API Error "+code, relevancy_score:0, relevancy_verdict:"FAIL", relevancy_reason:"API Error", overall:"FAIL", suggestion:"Check GROQ_KEY" };
    var content = JSON.parse(raw).choices[0].message.content.replace(/<think>[\s\S]*?<\/think>/gi,"").trim().replace(/```json/gi,"").replace(/```/g,"").trim();
    var match = content.match(/\{[\s\S]*\}/);
    if (!match) return fallbackQuality();
    return JSON.parse(match[0].replace(/'/g, "\u2019"));
  } catch(e) { Logger.log("checkOEQuality EXCEPTION: " + e.toString()); }
  return fallbackQuality();
}
function fallbackQuality() {
  return { ai_verdict:"PENDING", ai_score:55, ai_reason:"Check failed — try again", relevancy_score:55, relevancy_verdict:"PENDING", relevancy_reason:"Check failed", overall:"FAIL", suggestion:"Please try again" };
}

// ═══════════════════════════════════════════
// REWRITE OE COMBINED
// ═══════════════════════════════════════════
function rewriteOECombined(oeText, qText, relScore) {
  var url = "https://api.groq.com/openai/v1/chat/completions";
  var seed = Math.floor(Math.random() * 99999);
  var isOffTopic = (!relScore || Number(relScore) < 50);
  var prompt;
  if (isOffTopic) {
    prompt = "Variation seed: " + seed + "\n\nSurvey question: " + qText + "\nThe employee gave a wrong off-topic answer. Ignore their answer completely.\n\nWrite 5 fresh natural responses that CORRECTLY answer the question.\n\nSTYLE:\nResponse 1: Personal memory style\nResponse 2: Direct preference style\nResponse 3: Comparison style\nResponse 4: Feeling/emotion style\nResponse 5: Everyday life style\n\nRULES for ALL 5:\n1. 100–300 characters each\n2. Casual real person — NOT AI\n3. Each starts with a DIFFERENT word\n4. No commas/semicolons/dashes\n5. Each sounds like a different person\n\nReturn ONLY: {\"suggestions\":[\"r1\",\"r2\",\"r3\",\"r4\",\"r5\"]}";
  } else {
    prompt = "Variation seed: " + seed + "\n\nQuestion: " + qText + "\nEmployee answer: " + oeText + "\n\nRewrite 5 times — same meaning, more human and casual.\n\nSTYLE:\nResponse 1: Personal memory style\nResponse 2: Direct preference style\nResponse 3: Comparison style\nResponse 4: Feeling/emotion style\nResponse 5: Everyday life style\n\nRULES for ALL 5:\n1. 100–300 characters each\n2. Casual real person — NOT AI\n3. Each starts with a DIFFERENT word\n4. No commas/semicolons/dashes/brackets\n5. Each sounds like a DIFFERENT person\n6. Never repeat phrases across the 5\n\nReturn ONLY: {\"suggestions\":[\"r1\",\"r2\",\"r3\",\"r4\",\"r5\"]}";
  }
  var payload = { model:GROQ_MODEL, messages:[{role:"user",content:prompt}], temperature:0.7, max_tokens:1500, reasoning_effort:"low" };
  try {
    var options = { method:"POST", headers:{"Authorization":"Bearer "+GROQ_KEY,"Content-Type":"application/json"}, payload:JSON.stringify(payload), muteHttpExceptions:true };
    var res  = UrlFetchApp.fetch(url, options);
    var code = res.getResponseCode();
    Logger.log("rewriteOECombined HTTP: " + code);
    if (code !== 200) return { success:false, suggestions:[] };
    var content = JSON.parse(res.getContentText()).choices[0].message.content.replace(/<think>[\s\S]*?<\/think>/gi,"").trim().replace(/```json/gi,"").replace(/```/g,"").trim();
    var match = content.match(/\{[\s\S]*\}/);
    if (!match) return { success:false, suggestions:[] };
    var r = JSON.parse(match[0].replace(/'/g, "\u2019"));
    if (r.suggestions && r.suggestions.length > 0) return { success:true, suggestions:r.suggestions };
  } catch(e) { Logger.log("rewriteOECombined: " + e.toString()); }
  return { success:false, suggestions:[] };
}

// ═══════════════════════════════════════════
// REWRITE OE AS HUMAN (DQA panel)
// ═══════════════════════════════════════════
function rewriteOEAsHuman(oeResponse, question) {
  var url = "https://api.groq.com/openai/v1/chat/completions";
  var seed = Math.floor(Math.random() * 99999);
  var prompt = "Seed: " + seed + "\n\nGenerate 5 different survey responses.\n\nQuestion: " + question + "\nMeaning to express: " + oeResponse + "\n\nRULES:\n1. NO commas/semicolons/brackets/dashes\n2. Simple everyday words only\n3. ONE main point per response\n4. All 5 start with DIFFERENT words\n5. 100–300 characters each\n6. Casual spoken style\n7. Do NOT repeat the submitted text\n8. Each feels like a different person wrote it\n\nReturn ONLY: {\"suggestions\":[\"r1\",\"r2\",\"r3\",\"r4\",\"r5\"]}";
  var payload = { model:GROQ_MODEL, messages:[{role:"user",content:prompt}], temperature:0.85, max_tokens:1500, reasoning_effort:"low" };
  try {
    var options = { method:"POST", headers:{"Authorization":"Bearer "+GROQ_KEY,"Content-Type":"application/json"}, payload:JSON.stringify(payload), muteHttpExceptions:true };
    var res = UrlFetchApp.fetch(url, options);
    if (res.getResponseCode() !== 200) return { success:false, suggestions:[] };
    var text  = JSON.parse(res.getContentText()).choices[0].message.content.replace(/<think>[\s\S]*?<\/think>/gi,"").trim().replace(/```json/gi,"").replace(/```/g,"").trim();
    var match = text.match(/\{[\s\S]*\}/);
    if (match) { var r = JSON.parse(match[0].replace(/'/g,"\u2019")); if (r.suggestions && r.suggestions.length) return { success:true, suggestions:r.suggestions }; }
  } catch(e) { Logger.log("rewriteOEAsHuman: " + e.message); }
  return { success:false, suggestions:[] };
}

// ═══════════════════════════════════════════
// GET QUESTION HINT
// ═══════════════════════════════════════════
function getQuestionHint(question) {
  var url  = "https://api.groq.com/openai/v1/chat/completions";
  var seed = Math.floor(Math.random() * 99999);
  var prompt = "Seed: " + seed + "\n\nA survey respondent doesn't understand: " + question + "\n\nGive a FRESH unique explanation every time.\n\nReturn ONLY raw JSON:\n{\"simple_question\":\"explain in simple words what this is asking\",\"example\":\"one short casual first-person example answer\",\"keywords\":\"3-5 key topic words\"}";
  var payload = { model:GROQ_MODEL, messages:[{role:"user",content:prompt}], temperature:0.95, max_tokens:800, reasoning_effort:"low" };
  try {
    var options = { method:"POST", headers:{"Authorization":"Bearer "+GROQ_KEY,"Content-Type":"application/json"}, payload:JSON.stringify(payload), muteHttpExceptions:true };
    var res = UrlFetchApp.fetch(url, options);
    if (res.getResponseCode() !== 200) return { simple_question:"Re-read the question carefully.", example:"", keywords:"" };
    var text  = JSON.parse(res.getContentText()).choices[0].message.content.replace(/<think>[\s\S]*?<\/think>/gi,"").trim().replace(/```json/gi,"").replace(/```/g,"").trim();
    var match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch(e) { Logger.log("getQuestionHint: " + e.message); }
  return { simple_question:"Re-read the question and answer what it is asking.", example:"", keywords:"" };
}

// ═══════════════════════════════════════════
// EMPLOYEE + PID LISTS
// ═══════════════════════════════════════════
function getEmployeeList() {
  var ss      = SpreadsheetApp.openById(SHEET_ID);
  var pending = ss.getSheetByName(PENDING_SHEET);
  if (!pending || pending.getLastRow() <= 1) return [];
  var data  = pending.getRange(2, 3, pending.getLastRow()-1, 1).getValues();
  var names = {};
  data.forEach(function(row) { var n = String(row[0]).trim(); if (n) names[n] = true; });
  return Object.keys(names).sort();
}
function getPIDList() {
  var ss      = SpreadsheetApp.openById(SHEET_ID);
  var pending = ss.getSheetByName(PENDING_SHEET);
  if (!pending || pending.getLastRow() <= 1) return [];
  var data = pending.getRange(2, 4, pending.getLastRow()-1, 1).getValues();
  var pids = {};
  data.forEach(function(row) { var p = String(row[0]).trim(); if (p) pids[p] = true; });
  return Object.keys(pids).sort();
}
function getInitialData() {
  var cache = CacheService.getScriptCache();
  var cachedNames = cache.get("emp_names");
  var cachedPIDs  = cache.get("pid_list");
  var names = cachedNames ? JSON.parse(cachedNames) : getEmployeeList();
  var pids  = cachedPIDs  ? JSON.parse(cachedPIDs)  : getPIDList();
  if (!cachedNames) try { cache.put("emp_names", JSON.stringify(names), 600); } catch(ex) {}
  if (!cachedPIDs)  try { cache.put("pid_list",  JSON.stringify(pids),  600); } catch(ex) {}
  return { names: names, pids: pids };
}

// ═══════════════════════════════════════════
// PATTERN DETECTION
// ═══════════════════════════════════════════

// ═══════════════════════════════════════════
// PATTERN DETECTION
// ═══════════════════════════════════════════
function checkPatternDetection(memberName, currentOE) {

  // Safely handle undefined/null
  memberName = String(memberName || "").trim();
  currentOE = String(currentOE || "").trim();

  Logger.log("===== checkPatternDetection =====");
  Logger.log("Member: [" + memberName + "]");
  Logger.log("Current OE: [" + currentOE + "]");

  if (!memberName || !currentOE) {
    return {
      hasPattern: false,
      warnings: []
    };
  }

  var ss = SpreadsheetApp.openById(SHEET_ID);
  var pending = ss.getSheetByName(PENDING_SHEET);

  if (!pending || pending.getLastRow() <= 1) {
    return {
      hasPattern: false,
      warnings: []
    };
  }

  var data = pending
    .getRange(
      2,
      1,
      pending.getLastRow() - 1,
      6
    )
    .getValues();

  var targetName = memberName
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  var myOEs = [];

  data.forEach(function(row) {

    // Column C = Member Name
    var rowMemberName = String(row[2] || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    // Column F = OE Response
    var oeText = String(row[5] || "")
      .toLowerCase()
      .trim();

    if (
      rowMemberName === targetName &&
      oeText !== ""
    ) {
      myOEs.push(oeText);
    }

  });

  // Last 5 responses
  var recent = myOEs.slice(-5);

  Logger.log("Previous OEs found: " + recent.length);

  var warnings = [];

  var starters = [
    "for me",
    "i usually",
    "honestly",
    "i think",
    "personally",
    "i love",
    "i like",
    "i feel"
  ];

  // Check repeated starting phrases
  starters.forEach(function(prefix) {

    var count = recent.filter(function(oe) {
      return oe.indexOf(prefix) === 0;
    }).length;

    if (count >= 2) {
      warnings.push('"' + prefix + '"');
    }

  });

  // Check first two words
  var currentWords = currentOE
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  var currentStart = currentWords
    .slice(0, 2)
    .join(" ");

  if (currentStart) {

    var sameStartCount = recent.filter(function(oe) {
      return oe.indexOf(currentStart) === 0;
    }).length;

    if (sameStartCount >= 2) {
      warnings.push('"' + currentStart + '"');
    }

  }

  Logger.log(
    "Pattern detected: " +
    (warnings.length > 0)
  );

  return {
    hasPattern: warnings.length > 0,
    warnings: warnings
  };
}

// ═══════════════════════════════════════════
// MARK AS COPIED
// ═══════════════════════════════════════════
function markAsCopied(oeId) {
  var ss      = SpreadsheetApp.openById(SHEET_ID);
  var pending = ss.getSheetByName(PENDING_SHEET);
  if (!pending || pending.getLastRow() <= 1) return;
  var data = pending.getRange(2, 1, pending.getLastRow()-1, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(oeId)) {
      pending.getRange(i+2, 11).setValue("COPIED");
      pending.getRange(i+2, 1, 1, 19).setBackground("#cfe2f3");
      break;
    }
  }
  return { success:true };
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}
function extractProjectId(pid) {
  var match = String(pid).match(/\d{4,}/);
  return match ? match[0] : String(pid).trim();
}
function formatMyTime(ts) {
  if (!ts) return "";
  var d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  var today = new Date(); today.setHours(0,0,0,0);
  var yest  = new Date(today); yest.setDate(yest.getDate()-1);
  var day   = new Date(d); day.setHours(0,0,0,0);
  var t = d.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit", hour12:true });
  if (day.getTime() === today.getTime()) return "Today " + t;
  if (day.getTime() === yest.getTime())  return "Yesterday " + t;
  return d.toLocaleDateString("en-US", { day:"numeric", month:"short" }) + " " + t;
}
function testGroqAPI() {
  var url = "https://api.groq.com/openai/v1/chat/completions";
  var options = { method:"POST", headers:{"Authorization":"Bearer "+GROQ_KEY,"Content-Type":"application/json"}, payload:JSON.stringify({model:GROQ_MODEL,messages:[{role:"user",content:"Say hello"}],max_tokens:10}), muteHttpExceptions:true };
  var res = UrlFetchApp.fetch(url, options);
  Logger.log("HTTP: " + res.getResponseCode());
  Logger.log("Response: " + res.getContentText());
}

function testDup() {
  var r = checkDuplicateOE("Widely used in many homes and considered a practical everyday option", "GMS 75590");
  Logger.log(JSON.stringify(r));
}

function listGroqModels() {
  var res = UrlFetchApp.fetch("https://api.groq.com/openai/v1/models", {
    method: "GET",
    headers: { "Authorization": "Bearer " + GROQ_KEY },
    muteHttpExceptions: true
  });
  Logger.log(res.getContentText());
}

function debugOE() {
  var r = checkOEQuality("I love this soap because it smells fresh and keeps my skin soft", "Why do you like this product?", false);
  Logger.log(JSON.stringify(r));
}

function debugRaw() {
  var url = "https://api.groq.com/openai/v1/chat/completions";
  var payload = {
    model: GROQ_MODEL,
    messages:[{role:"user", content:"Return ONLY raw JSON: {\"ai_score\":72,\"relevancy_score\":80,\"overall\":\"PASS\"}"}],
    temperature:0.2,
    max_tokens:400
  };
  var res = UrlFetchApp.fetch(url, {
    method:"POST",
    headers:{"Authorization":"Bearer "+GROQ_KEY, "Content-Type":"application/json"},
    payload:JSON.stringify(payload),
    muteHttpExceptions:true
  });
  Logger.log("CODE: " + res.getResponseCode());
  Logger.log("FULL BODY: " + res.getContentText());
}

// function doPost(e) {
//   try {
//     // -----------------------------
//     // Safely read request body
//     // -----------------------------
//     var body = {};

//     if (e && e.postData && e.postData.contents) {
//       try {
//         body = JSON.parse(e.postData.contents);
//       } catch (parseError) {
//         throw new Error("Invalid JSON request body");
//       }
//     }

//     body = body || {};

//     var action = String(body.action || "").trim();
//     var data = body.data || {};

//     if (!action) {
//       throw new Error("Missing action");
//     }

//     Logger.log("ACTION: " + action);
//     Logger.log("DATA: " + JSON.stringify(data));

//     var result;

//     switch (action) {

//       // =============================
//       // QUALITY CHECK
//       // =============================
//       case "checkOEQuality":
//         result = checkOEQuality(
//           String(data.oeResponse || "").trim(),
//           String(data.question || data.qText || data.qNumber || "").trim(),
//           data.isRelatedToPrevious === true
//         );
//         break;


//       // =============================
//       // DQA
//       // =============================
//       case "getDQAData":
//         result = getDQAData();
//         break;


//       // =============================
//       // INITIAL DATA
//       // =============================
//       case "getInitialData":
//         result = getInitialData();
//         break;


//       case "getEmployeeList":
//         result = getEmployeeList();
//         break;


//       case "getPIDList":
//         result = getPIDList();
//         break;


//       case "getDashboardStats":
//         result = getDashboardStats();
//         break;


//       // =============================
//       // APPROVED OEs
//       // =============================
//       case "getApprovedOEsByPID":
//         result = getApprovedOEsByPID(
//           String(data.pid || "").trim()
//         );
//         break;


//           // =============================
//       // MY RESULTS
//       // =============================
//       case "getMyResults":

//         var resultName = String(
//           data.name || data.memberName || ""
//         ).trim();

//         Logger.log("getMyResults name: " + resultName);

//         result = getMyResults(resultName);

//         break;


//       // =============================
//       // SUBMIT
//       // =============================
//       case "submitOE":
//         result = submitOE(data);
//         break;


//       // =============================
//       // UPDATE
//       // =============================
//       case "updateOE":
//         result = updateOE(
//           String(data.oeId || "").trim(),
//           String(data.newText || "")
//         );
//         break;


//       // =============================
//       // APPROVE
//       // =============================
//       case "approveOE":
//         result = approveOE(
//           Number(data.rowIndex || 0),
//           String(data.dqaName || "").trim(),
//           String(data.correction || "")
//         );
//         break;


//       // =============================
//       // REJECT
//       // =============================
//       case "rejectOE":
//         result = rejectOE(
//           Number(data.rowIndex || 0),
//           String(data.dqaName || "").trim(),
//           String(data.reason || "").trim()
//         );
//         break;


//       // =============================
//       // RECALL
//       // =============================
//       case "recallOE":
//         result = recallOE(
//           Number(data.rowIndex || 0)
//         );
//         break;


//       // =============================
//       // DQA VIEWING
//       // =============================
//       case "markDQAViewing":
//         result = markDQAViewing(
//           String(data.oeId || "").trim()
//         );
//         break;


//       // =============================
//       // DUPLICATE CHECK
//       // =============================
//       case "checkDuplicateOE":
//         result = checkDuplicateOE(
//           String(data.oeText || "").trim(),
//           String(data.pid || "").trim()
//         );
//         break;


//       // =============================
//       // PATTERN DETECTION
//       // =============================
//       case "checkPatternDetection":
//         result = checkPatternDetection(
//           String(data.memberName || "").trim(),
//           String(data.currentOE || "").trim()
//         );
//         break;


//       // =============================
//       // COPIED
//       // =============================
//       case "markAsCopied":
//         result = markAsCopied(
//           String(data.oeId || "").trim()
//         );
//         break;


//       // =============================
//       // QUESTION HINT
//       // =============================
//       case "getQuestionHint":
//         result = getQuestionHint(
//           String(data.question || data.qText || "").trim()
//         );
//         break;


//       // =============================
//       // REWRITE COMBINED
//       // =============================
//       case "rewriteOECombined":
//         result = rewriteOECombined(
//           String(data.oeText || ""),
//           String(data.qText || data.question || ""),
//           Number(data.relScore || 0)
//         );
//         break;


//       // =============================
//       // REWRITE HUMAN
//       // =============================
//       case "rewriteOEAsHuman":
//         result = rewriteOEAsHuman(
//           String(data.oeResponse || ""),
//           String(data.question || data.qText || "")
//         );
//         break;


//       // =============================
//       // UNKNOWN
//       // =============================
//       default:
//         throw new Error("Unknown action: " + action);
//     }


//     // =============================
//     // SUCCESS RESPONSE
//     // =============================
//     return ContentService
//       .createTextOutput(
//         JSON.stringify({
//           success: true,
//           data: result
//         })
//       )
//       .setMimeType(ContentService.MimeType.JSON);


//   } catch (error) {

//     Logger.log(
//       "doPost ERROR: " + error.toString()
//     );

//     return ContentService
//       .createTextOutput(
//         JSON.stringify({
//           success: false,
//           error: error && error.message
//             ? error.message
//             : String(error)
//         })
//       )
//       .setMimeType(ContentService.MimeType.JSON);
//   }
// }


function doPost(e) {

  try {

    // =========================================
    // READ REQUEST BODY
    // =========================================

    var body = {};

    if (
      e &&
      e.postData &&
      e.postData.contents
    ) {

      try {

        body = JSON.parse(
          e.postData.contents
        );

      } catch (parseError) {

        throw new Error(
          "Invalid JSON request body"
        );

      }

    }

    body = body || {};

    var action = String(
      body.action || ""
    ).trim();

    var data = body.data || {};

    if (!action) {
      throw new Error(
        "Missing action"
      );
    }

    Logger.log(
      "========== API REQUEST =========="
    );

    Logger.log(
      "ACTION: " + action
    );

    Logger.log(
      "DATA: " + JSON.stringify(data)
    );


    var result;


    // =========================================
    // ROUTER
    // =========================================

    switch (action) {


      // =======================================
      // QUALITY
      // =======================================

      case "checkOEQuality":

        result = checkOEQuality(
          String(
            data.oeResponse || ""
          ).trim(),

          String(
            data.question ||
            data.qText ||
            data.qNumber ||
            ""
          ).trim(),

          data.isRelatedToPrevious === true
        );

        break;


      // =======================================
      // DQA
      // =======================================

      case "getDQAData":

        result = getDQAData();

        break;


      // =======================================
      // INITIAL DATA
      // =======================================

      case "getInitialData":

        result = getInitialData();

        break;


      // =======================================
      // EMPLOYEES
      // =======================================

      case "getEmployeeList":

        result = getEmployeeList();

        break;


      // =======================================
      // PID LIST
      // =======================================

      case "getPIDList":

        result = getPIDList();

        break;


      // =======================================
      // DASHBOARD
      // =======================================

      case "getDashboardStats":

        result = getDashboardStats();

        break;


      // =======================================
      // APPROVED OEs
      // =======================================

      case "getApprovedOEsByPID":

        result = getApprovedOEsByPID(
          String(
            data.pid || ""
          ).trim()
        );

        break;


      // =======================================
      // MY RESULTS
      // =======================================

      case "getMyResults":

        var memberName =
          data.name ||
          data.memberName ||
          "";

        memberName = String(
          memberName
        ).trim();

        Logger.log(
          "getMyResults memberName = [" +
          memberName +
          "]"
        );

        result = getMyResults(
          memberName
        );

        break;


      // =======================================
      // SUBMIT
      // =======================================

      case "submitOE":

        result = submitOE(data);

        break;


      // =======================================
      // UPDATE
      // =======================================

      case "updateOE":

        result = updateOE(
          String(
            data.oeId || ""
          ).trim(),

          String(
            data.newText || ""
          )
        );

        break;


      // =======================================
      // APPROVE
      // =======================================

      case "approveOE":

        result = approveOE(
          Number(
            data.rowIndex || 0
          ),

          String(
            data.dqaName || ""
          ).trim(),

          String(
            data.correction || ""
          )
        );

        break;


      // =======================================
      // REJECT
      // =======================================

      case "rejectOE":

        result = rejectOE(
          Number(
            data.rowIndex || 0
          ),

          String(
            data.dqaName || ""
          ).trim(),

          String(
            data.reason || ""
          ).trim()
        );

        break;


      // =======================================
      // RECALL
      // =======================================

      case "recallOE":

        result = recallOE(
          Number(
            data.rowIndex || 0
          )
        );

        break;


      // =======================================
      // DQA VIEWING
      // =======================================

      case "markDQAViewing":

        result = markDQAViewing(
          String(
            data.oeId || ""
          ).trim()
        );

        break;


      // =======================================
      // DUPLICATE
      // =======================================

      case "checkDuplicateOE":

        result = checkDuplicateOE(
          String(
            data.oeText || ""
          ).trim(),

          String(
            data.pid || ""
          ).trim()
        );

        break;


      // =======================================
      // PATTERN
      // =======================================

      case "checkPatternDetection":

        result = checkPatternDetection(
          String(
            data.memberName || ""
          ).trim(),

          String(
            data.currentOE || ""
          ).trim()
        );

        break;


      // =======================================
      // COPIED
      // =======================================

      case "markAsCopied":

        result = markAsCopied(
          String(
            data.oeId || ""
          ).trim()
        );

        break;


      // =======================================
      // QUESTION HINT
      // =======================================

      case "getQuestionHint":

        result = getQuestionHint(
          String(
            data.question ||
            data.qText ||
            ""
          ).trim()
        );

        break;


      // =======================================
      // REWRITE COMBINED
      // =======================================

      case "rewriteOECombined":

        result = rewriteOECombined(
          String(
            data.oeText || ""
          ),

          String(
            data.qText ||
            data.question ||
            ""
          ),

          Number(
            data.relScore || 0
          )
        );

        break;


      // =======================================
      // REWRITE HUMAN
      // =======================================

      case "rewriteOEAsHuman":

        result = rewriteOEAsHuman(
          String(
            data.oeResponse || ""
          ),

          String(
            data.question ||
            data.qText ||
            ""
          )
        );

        break;


      // =======================================
// OE PERFORMANCE
// =======================================

case "getOEPerformance":

  result =
    getOEPerformance(
      data || {}
    );

  break;


// =======================================
// OE PERFORMANCE OEs
// =======================================

case "getPerformanceOEs":

  result =
    getPerformanceOEs(
      data || {}
    );

  break;


// =======================================
// OE PERFORMANCE FILTERS
// =======================================

case "getOEPerformanceFilters":

  result =
    getOEPerformanceFilters();

  break;


      // =======================================
      // UNKNOWN ACTION
      // =======================================

      default:

        throw new Error(
          "Unknown action: " + action
        );

    }


    // =========================================
    // SUCCESS
    // =========================================

    Logger.log(
      "RESULT: " +
      JSON.stringify(result)
    );

    return ContentService
      .createTextOutput(
        JSON.stringify({
          success: true,
          data: result
        })
      )
      .setMimeType(
        ContentService.MimeType.JSON
      );


  } catch (error) {

    Logger.log(
      "doPost ERROR: " +
      error.toString()
    );

    return ContentService
      .createTextOutput(
        JSON.stringify({
          success: false,
          error:
            error && error.message
              ? error.message
              : String(error)
        })
      )
      .setMimeType(
        ContentService.MimeType.JSON
      );

  }

}

function testPendingSheet() {

  Logger.log(
    "========== TEST PENDING SHEET =========="
  );

  var ss = SpreadsheetApp.openById(
    SHEET_ID
  );

  Logger.log(
    "Spreadsheet name: " +
    ss.getName()
  );

  var sheet = ss.getSheetByName(
    PENDING_SHEET
  );

  if (!sheet) {

    Logger.log(
      "❌ PENDING sheet NOT FOUND"
    );

    return;

  }

  Logger.log(
    "✅ PENDING sheet found"
  );

  Logger.log(
    "Sheet name: " +
    sheet.getName()
  );

  Logger.log(
    "Rows: " +
    sheet.getLastRow()
  );

  Logger.log(
    "Columns: " +
    sheet.getLastColumn()
  );


  var data =
    sheet.getDataRange().getValues();


  Logger.log(
    "Total rows read: " +
    data.length
  );


  for (
    var i = 0;
    i < data.length;
    i++
  ) {

    Logger.log(
      "ROW " + (i + 1) +

      " | ID=" +
      String(data[i][0] || "") +

      " | NAME=" +
      String(data[i][2] || "") +

      " | PID=" +
      String(data[i][3] || "") +

      " | Q=" +
      String(data[i][4] || "") +

      " | OE=" +
      String(data[i][5] || "") +

      " | STATUS=" +
      String(data[i][7] || "")
    );

  }

}

// ============================================================
// OE PERFORMANCE MODULE
// ============================================================

function getOEPerformance(filters) {

  filters = filters || {};

  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(PENDING_SHEET);

  var emptyResponse = {
    success: true,

    summary: {
      totalSubmission: 0,
      totalApproved: 0,
      totalRejected: 0,
      totalPending: 0,
      approvalRate: 0,
      rejectionRate: 0
    },

    daily: [],
    projects: [],
    employees: [],
    oes: []
  };

  if (!sheet || sheet.getLastRow() <= 1) {
    return emptyResponse;
  }

  var lastRow = sheet.getLastRow();
  var lastColumn = Math.min(sheet.getLastColumn(), 19);

  var data = sheet
    .getRange(
      2,
      1,
      lastRow - 1,
      lastColumn
    )
    .getValues();


  // ==========================================================
  // FILTERS
  // ==========================================================

  var fromDate = null;
  var toDate = null;

  if (filters.fromDate) {

    fromDate = new Date(
      String(filters.fromDate) + "T00:00:00"
    );

  }

  if (filters.toDate) {

    toDate = new Date(
      String(filters.toDate) + "T23:59:59"
    );

  }


  var projectFilter = String(
    filters.projectId || ""
  )
    .trim()
    .toLowerCase();


  var employeeFilter = String(
    filters.employee || ""
  )
    .trim()
    .toLowerCase();


  var statusFilter = String(
    filters.status || ""
  )
    .trim()
    .toUpperCase();


  // ==========================================================
  // FILTER DATA
  // ==========================================================

  var filtered = [];


  data.forEach(function(row, index) {

    var timestamp = row[1];

    var memberName = String(
      row[2] || ""
    ).trim();

    var pid = String(
      row[3] || ""
    ).trim();

    var status = String(
      row[7] || ""
    )
      .trim()
      .toUpperCase();


    if (!timestamp) {
      return;
    }


    var date = new Date(timestamp);


    if (isNaN(date.getTime())) {
      return;
    }


    // --------------------------
    // DATE FILTER
    // --------------------------

    if (fromDate && date < fromDate) {
      return;
    }

    if (toDate && date > toDate) {
      return;
    }


    // --------------------------
    // PROJECT FILTER
    // --------------------------

    if (
      projectFilter &&
      extractProjectId(pid)
        .toLowerCase() !== projectFilter &&
      pid.toLowerCase() !== projectFilter
    ) {
      return;
    }


    // --------------------------
    // EMPLOYEE FILTER
    // --------------------------

    if (
      employeeFilter &&
      memberName.toLowerCase() !== employeeFilter
    ) {
      return;
    }


    // --------------------------
    // STATUS FILTER
    // --------------------------

    if (
      statusFilter &&
      status !== statusFilter
    ) {
      return;
    }


    // ========================================================
    // PUSH OE
    // ========================================================

    filtered.push({

      rowIndex: index + 2,

      id: String(
        row[0] || ""
      ),

      timestamp:
        timestamp instanceof Date
          ? timestamp.toISOString()
          : String(timestamp || ""),

      date: Utilities.formatDate(
        date,
        Session.getScriptTimeZone(),
        "yyyy-MM-dd"
      ),

      memberName: memberName,

      pid: pid,

      projectId: extractProjectId(pid),

      qNumber: String(
        row[4] || ""
      ),

      oeResponse: String(
        row[5] || ""
      ),

      dqaCorrection: String(
        row[6] || ""
      ),

      status: status,

      approvedBy: String(
        row[8] || ""
      ),

      actionTime: row[9]
        ? (
            row[9] instanceof Date
              ? row[9].toISOString()
              : String(row[9])
          )
        : "",

      aiScore: String(
        row[11] || ""
      ),

      aiReason: String(
        row[12] || ""
      ),

      relScore: String(
        row[13] || ""
      ),

      relReason: String(
        row[14] || ""
      ),

      rejectReason: String(
        row[15] || ""
      ),

      oldOEId: String(
        row[16] || ""
      ),

      imageUrl: String(
        row[17] || ""
      ),

      dqaViewedTime: String(
        row[18] || ""
      )

    });

  });


  // ==========================================================
  // SUMMARY
  // ==========================================================

  var summary = {

    totalSubmission: filtered.length,

    totalApproved: 0,

    totalRejected: 0,

    totalPending: 0,

    approvalRate: 0,

    rejectionRate: 0

  };


  filtered.forEach(function(item) {

    if (item.status === "APPROVED") {
      summary.totalApproved++;
    }

    else if (item.status === "REJECTED") {
      summary.totalRejected++;
    }

    else if (item.status === "PENDING") {
      summary.totalPending++;
    }

  });


  if (summary.totalSubmission > 0) {

    summary.approvalRate =
      Number(
        (
          summary.totalApproved /
          summary.totalSubmission *
          100
        ).toFixed(1)
      );


    summary.rejectionRate =
      Number(
        (
          summary.totalRejected /
          summary.totalSubmission *
          100
        ).toFixed(1)
      );

  }


  // ==========================================================
  // DAILY PERFORMANCE
  // ==========================================================

  var dailyMap = {};


  filtered.forEach(function(item) {

    if (!dailyMap[item.date]) {

      dailyMap[item.date] = {

        date: item.date,

        totalSubmission: 0,

        approved: 0,

        rejected: 0,

        pending: 0

      };

    }


    dailyMap[item.date]
      .totalSubmission++;


    if (item.status === "APPROVED") {

      dailyMap[item.date]
        .approved++;

    }


    if (item.status === "REJECTED") {

      dailyMap[item.date]
        .rejected++;

    }


    if (item.status === "PENDING") {

      dailyMap[item.date]
        .pending++;

    }

  });


  var daily = Object.keys(dailyMap)

    .map(function(key) {

      var d = dailyMap[key];

      var approvalRate = 0;

      if (d.totalSubmission > 0) {

        approvalRate =
          Number(
            (
              d.approved /
              d.totalSubmission *
              100
            ).toFixed(1)
          );

      }


      return {

        date: d.date,

        totalSubmission:
          d.totalSubmission,

        approved:
          d.approved,

        rejected:
          d.rejected,

        pending:
          d.pending,

        approvalRate:
          approvalRate

      };

    })


    .sort(function(a, b) {

      return b.date.localeCompare(
        a.date
      );

    });


  // ==========================================================
  // PROJECT / PID PERFORMANCE
  // ==========================================================

  var projectMap = {};


  filtered.forEach(function(item) {

    var projectId =
      item.projectId ||
      item.pid ||
      "UNKNOWN";


    if (!projectMap[projectId]) {

      projectMap[projectId] = {

        projectId: projectId,

        totalSubmission: 0,

        approved: 0,

        rejected: 0,

        pending: 0

      };

    }


    projectMap[projectId]
      .totalSubmission++;


    if (item.status === "APPROVED") {

      projectMap[projectId]
        .approved++;

    }


    if (item.status === "REJECTED") {

      projectMap[projectId]
        .rejected++;

    }


    if (item.status === "PENDING") {

      projectMap[projectId]
        .pending++;

    }

  });


  var projects = Object.keys(projectMap)

    .map(function(key) {

      var p =
        projectMap[key];


      var approvalRate = 0;

      if (p.totalSubmission > 0) {

        approvalRate =
          Number(
            (
              p.approved /
              p.totalSubmission *
              100
            ).toFixed(1)
          );

      }


      return {

        projectId:
          p.projectId,

        totalSubmission:
          p.totalSubmission,

        approved:
          p.approved,

        rejected:
          p.rejected,

        pending:
          p.pending,

        approvalRate:
          approvalRate

      };

    })


    .sort(function(a, b) {

      return (
        b.totalSubmission -
        a.totalSubmission
      );

    });


  // ==========================================================
  // EMPLOYEE + PROJECT PERFORMANCE
  // ==========================================================

  var employeeMap = {};


  filtered.forEach(function(item) {

    var projectId =
      item.projectId ||
      item.pid ||
      "UNKNOWN";


    var employee =
      item.memberName ||
      "Unknown";


    var key =
      employee +
      "||" +
      projectId;


    if (!employeeMap[key]) {

      employeeMap[key] = {

        employee:
          employee,

        projectId:
          projectId,

        totalSubmission: 0,

        approved: 0,

        rejected: 0,

        pending: 0

      };

    }


    employeeMap[key]
      .totalSubmission++;


    if (item.status === "APPROVED") {

      employeeMap[key]
        .approved++;

    }


    if (item.status === "REJECTED") {

      employeeMap[key]
        .rejected++;

    }


    if (item.status === "PENDING") {

      employeeMap[key]
        .pending++;

    }

  });


  var employees = Object.keys(employeeMap)

    .map(function(key) {

      var e =
        employeeMap[key];


      var approvalRate = 0;


      if (e.totalSubmission > 0) {

        approvalRate =
          Number(
            (
              e.approved /
              e.totalSubmission *
              100
            ).toFixed(1)
          );

      }


      return {

        employee:
          e.employee,

        projectId:
          e.projectId,

        totalSubmission:
          e.totalSubmission,

        approved:
          e.approved,

        rejected:
          e.rejected,

        pending:
          e.pending,

        approvalRate:
          approvalRate

      };

    })


    .sort(function(a, b) {

      return (
        b.totalSubmission -
        a.totalSubmission
      );

    });


  // ==========================================================
  // FINAL RESPONSE
  // ==========================================================

  return {

    success: true,

    summary: summary,

    daily: daily,

    projects: projects,

    employees: employees,

    oes: filtered

  };

}


// ============================================================
// GET PERFORMANCE OEs
// ============================================================

function getPerformanceOEs(filters) {

  var result =
    getOEPerformance(
      filters || {}
    );


  if (
    !result ||
    result.success !== true
  ) {

    return [];

  }


  return result.oes || [];

}


// ============================================================
// GET PERFORMANCE FILTER LISTS
// ============================================================

function getOEPerformanceFilters() {

  var ss =
    SpreadsheetApp.openById(
      SHEET_ID
    );

  var sheet =
    ss.getSheetByName(
      PENDING_SHEET
    );


  if (
    !sheet ||
    sheet.getLastRow() <= 1
  ) {

    return {

      employees: [],

      projects: []

    };

  }


  var data =
    sheet.getRange(
      2,
      1,
      sheet.getLastRow() - 1,
      Math.min(
        sheet.getLastColumn(),
        19
      )
    ).getValues();


  var employeeMap = {};

  var projectMap = {};


  data.forEach(function(row) {

    var employee =
      String(
        row[2] || ""
      ).trim();


    var pid =
      String(
        row[3] || ""
      ).trim();


    if (employee) {

      employeeMap[
        employee
      ] = true;

    }


    if (pid) {

      var projectId =
        extractProjectId(
          pid
        );

      if (projectId) {

        projectMap[
          projectId
        ] = true;

      }

    }

  });


  return {

    employees:
      Object.keys(
        employeeMap
      ).sort(),

    projects:
      Object.keys(
        projectMap
      ).sort()

  };

}



