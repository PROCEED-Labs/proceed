export function statusToType(status: string) {
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

export function getPlannedEnd(plannedStart: number, plannedDuration: string) {
  const anchor = new Date(plannedStart);

  const re =
    /^P((?<y>\d+)Y)?((?<m>\d+)M)?((?<d>\d+)D)?(T((?<th>\d+)H)?((?<tm>\d+)M)?((?<ts>\d+(.\d+)?)S)?)?$/;
  const match = re.exec(plannedDuration);
  if (!match || !match.groups) return null;

  anchor.setFullYear(anchor.getFullYear() + (+match.groups['y'] || 0));
  anchor.setMonth(anchor.getMonth() + (+match.groups['m'] || 0));
  anchor.setDate(anchor.getDate() + (+match.groups['d'] || 0));
  anchor.setHours(anchor.getHours() + (+match.groups['th'] || 0));
  anchor.setMinutes(anchor.getMinutes() + (+match.groups['tm'] || 0));
  anchor.setSeconds(anchor.getSeconds() + (+match.groups['ts'] || 0));

  return anchor;
}
