const { convertISODurationToMiliseconds } = require('@proceed/bpmn-helper');

/** Function that transforms miliseconds to human-readable time format (taken from other PROCEED code: src/management-system/src/frontend/components/deployments/activityInfo/ActivityTimeCalculation.vue)
 *
 * @param {Number} timeInMiliseconds
 * @returns {String} time in easily readable format: `${days} Days, ${hours}h, ${minutes}min, ${seconds}s` or null
 */
function transformMilisecondsToTimeFormat(timeInMiliseconds) {
  let miliseconds = timeInMiliseconds;
  if (miliseconds > 0) {
    const days = Math.floor(miliseconds / (3600000 * 24));
    miliseconds -= days * (3600000 * 24);
    const hours = Math.floor(miliseconds / 3600000);
    miliseconds -= hours * 3600000;
    // Minutes part from the difference
    const minutes = Math.floor(miliseconds / 60000);
    miliseconds -= minutes * 60000;
    //Seconds part from the difference
    const seconds = Math.floor(miliseconds / 1000);
    miliseconds -= seconds * 1000;

    return `${days} Days, ${hours}h, ${minutes}min, ${seconds}s`;
  }
  return null;
}

/**Function that gets and generates time related information (start, end, duration) provided for a flow element
 *
 * @param {Object} meta element meta data (as received by getMetaDataFromElement())
 * @returns {Objec} {start: Date or 'none', end: Date or 'none', duration (in ms), startTime ('none' or in ms), endTime: ('none' or in ms)}
 */
function getTimeInfos(meta) {
  let start = meta.timePlannedOccurrence ? new Date(meta.timePlannedOccurrence) : 'none';
  let end = meta.timePlannedEnd ? new Date(meta.timePlannedEnd) : 'none';

  let startTime = meta.timePlannedOccurrence ? start.getTime() : 'none';
  let endTime = meta.timePlannedEnd ? end.getTime() : 'none';

  let duration = meta.timePlannedDuration
    ? convertISODurationToMiliseconds(meta.timePlannedDuration)
    : 0;

  if (start == 'none' && end != 'none' && duration != 0) {
    start = new Date(endTime - duration);
  } else if (start != 'none' && end == 'none' && duration != 0) {
    end = new Date(startTime + duration);
  } else if (start != 'none' && end != 'none' && duration == 0) {
    duration = endTime - startTime;
  }

  return { start: start, end: end, duration: duration, startTime: startTime, endTime: endTime };
}

module.exports = {
  transformMilisecondsToTimeFormat,
  getTimeInfos,
};
