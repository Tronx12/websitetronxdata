export function parseTime(
  time: string
) {
  const [hours, minutes] =
    time.split(":").map(Number);

  return {
    hours,
    minutes,
  };
}

export function buildShiftDateTime(
  shiftDate: Date,
  time: string
) {
  const { hours, minutes } =
    parseTime(time);

  const result =
    new Date(shiftDate);

  result.setHours(
    hours,
    minutes,
    0,
    0
  );

  return result;
}

export function buildShiftWindow(
  shiftDate: Date,
  startTime: string,
  endTime: string,
  crossesMidnight: boolean
) {
  const start =
    buildShiftDateTime(
      shiftDate,
      startTime
    );

  const end =
    buildShiftDateTime(
      shiftDate,
      endTime
    );

  if (
    crossesMidnight ||
    end <= start
  ) {
    end.setDate(
      end.getDate() + 1
    );
  }

  return {
    start,
    end,
  };
}

export function getMinutesDifference(
  start: Date,
  end: Date
) {
  return Math.max(
    0,
    Math.floor(
      (end.getTime() -
        start.getTime()) /
        60000
    )
  );
}