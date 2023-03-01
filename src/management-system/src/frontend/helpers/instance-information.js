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
    case 'ERROR_SEMANTIC':
    case 'ERROR_TECHNICAL':
    case 'ERROR_CONSTRAINT_UNFULFILLED':
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
