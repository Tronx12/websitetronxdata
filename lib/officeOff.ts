import OfficeOff from "@/models/OfficeOff";
import OfficeSettings from "@/models/OfficeSettings";

interface OfficeOffResult {
  isOfficeOff: boolean;
  title: string | null;
  type: string | null;
  description: string | null;
  reason: "saturday" | "sunday" | "holiday" | null;
}

export async function getOfficeOffForDate(
  date: Date
): Promise<OfficeOffResult> {
  // ============================================
  // GET OFFICE SETTINGS
  // ============================================

  const settings =
    await OfficeSettings.findOne().lean();

  // ============================================
  // WEEKEND CHECK
  // ============================================

  // Dates in OfficeOff are normalized to UTC midnight.
  const day = date.getUTCDay();

  // Sunday
  if (
    day === 0 &&
    settings?.sundayOff === true
  ) {
    return {
      isOfficeOff: true,
      title: "Sunday",
      type: "weekend",
      description: "Weekly office off",
      reason: "sunday",
    };
  }

  // Saturday
  if (
    day === 6 &&
    settings?.saturdayOff === true
  ) {
    return {
      isOfficeOff: true,
      title: "Saturday",
      type: "weekend",
      description: "Weekly office off",
      reason: "saturday",
    };
  }

  // ============================================
  // MANUAL HOLIDAY / FESTIVAL CHECK
  // ============================================

  const start = new Date(date);

  start.setUTCHours(
    0,
    0,
    0,
    0
  );

  const end = new Date(start);

  end.setUTCDate(
    end.getUTCDate() + 1
  );

  const officeOff =
    await OfficeOff.findOne({
      date: {
        $gte: start,
        $lt: end,
      },
      isActive: true,
    }).lean();

  if (officeOff) {
    return {
      isOfficeOff: true,
      title: officeOff.title,
      type: officeOff.type,
      description:
        officeOff.description || null,
      reason: "holiday",
    };
  }

  // ============================================
  // NORMAL WORKING DAY
  // ============================================

  return {
    isOfficeOff: false,
    title: null,
    type: null,
    description: null,
    reason: null,
  };
}