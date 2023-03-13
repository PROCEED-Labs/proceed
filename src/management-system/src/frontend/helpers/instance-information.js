export function statusToType(status) {
  switch (status) {
    case 'PAUSED':
    case 'DEPLOYMENT_WAITING':
      return 'warning';
    case 'READY':
    case 'RUNNING':
    case 'COMPLETED':
    case 'FORWARDED':
    case 'ENDED':
      return 'success';
    case 'ABORTED':
    case 'ERROR-SEMANTIC':
    case 'ERROR-TECHNICAL':
    case 'ERROR-INTERRUPTED':
    case 'ERROR-CONSTRAINT-UNFULFILLED':
    case 'STOPPED':
      return 'error';
    default:
      return 'info';
  }
}
export function calculateProgress(elementMetaData, instanceInfo) {
  let plannedStart = null;
  if (elementMetaData.timePlannedOccurrence) {
    plannedStart = new Date(elementMetaData.timePlannedOccurrence).getTime();
  }
  return calculateProgressHelper(
    plannedStart || instanceInfo.startTime,
    instanceInfo.endTime,
    elementMetaData.timePlannedDuration
  );
}
export function calculateProgressHelper(start, end, plannedDuration) {
  if (start && plannedDuration) {
    const plannedEnd = getPlannedEnd(start, plannedDuration);
    if (end) {
      if (plannedEnd.getTime() > end) {
        return 'green';
      } else {
        return 'red';
      }
    } else {
      const durationInMs = plannedEnd.getTime() - start;
      const criticalTime = Math.floor(0.7 * durationInMs);
      const currentDate = new Date().getTime();
      if (currentDate < start + criticalTime) {
        return 'green';
      } else if (currentDate < plannedEnd.getTime()) {
        return 'orange';
      } else {
        return 'red';
      }
    }
  }
  return 'white';
}

export function getPlannedEnd(plannedStart, plannedDuration) {
  const anchor = new Date(plannedStart);
  var re =
    /^P((?<y>\d+)Y)?((?<m>\d+)M)?((?<d>\d+)D)?(T((?<th>\d+)H)?((?<tm>\d+)M)?((?<ts>\d+(.\d+)?)S)?)?$/;
  var match = re.exec(plannedDuration);
  var direction = 1;
  anchor.setFullYear(anchor.getFullYear() + (match.groups['y'] || 0) * direction);
  anchor.setMonth(anchor.getMonth() + (match.groups['m'] || 0) * direction);
  anchor.setDate(anchor.getDate() + (match.groups['d'] || 0) * direction);
  anchor.setHours(anchor.getHours() + (match.groups['th'] || 0) * direction);
  anchor.setMinutes(anchor.getMinutes() + (match.groups['tm'] || 0) * direction);
  anchor.setSeconds(anchor.getSeconds() + (match.groups['ts'] || 0) * direction);
  return anchor;
}

export function parseISODuration(isoDuration) {
  let years = null;
  let months = null;
  let days = null;
  let hours = null;
  let minutes = null;
  let seconds = null;
  let dateStr = isoDuration.substring(isoDuration.lastIndexOf('P') + 1);
  let timeStr = '';

  if (dateStr.includes('T')) {
    dateStr = isoDuration.substring(isoDuration.lastIndexOf('P') + 1, isoDuration.lastIndexOf('T'));
    timeStr = isoDuration.substring(isoDuration.lastIndexOf('T') + 1);
  }
  if (dateStr.includes('Y')) {
    const yearsStr = dateStr.substring(0, dateStr.lastIndexOf('Y'));
    years = parseInt(yearsStr) || null;
    dateStr = dateStr.substring(dateStr.lastIndexOf('Y') + 1);
  }
  if (dateStr.includes('M')) {
    const monthsStr = dateStr.substring(0, dateStr.lastIndexOf('M'));
    months = parseInt(monthsStr) || null;
    dateStr = dateStr.substring(dateStr.lastIndexOf('M') + 1);
  }
  if (dateStr.includes('D')) {
    const daysStr = dateStr.substring(0, dateStr.lastIndexOf('D'));
    days = parseInt(daysStr) || null;
  }
  if (timeStr.includes('H')) {
    const hoursStr = timeStr.substring(0, timeStr.lastIndexOf('H'));
    hours = parseInt(hoursStr) || null;
    timeStr = timeStr.substring(timeStr.lastIndexOf('H') + 1);
  }
  if (timeStr.includes('M')) {
    const minutesStr = timeStr.substring(0, timeStr.lastIndexOf('M'));
    minutes = parseInt(minutesStr) || null;
    timeStr = timeStr.substring(timeStr.lastIndexOf('M') + 1);
  }
  if (timeStr.includes('S')) {
    const secondsStr = timeStr.substring(0, timeStr.lastIndexOf('S'));
    seconds = parseInt(secondsStr) || null;
  }

  return { years, months, days, hours, minutes, seconds };
}
