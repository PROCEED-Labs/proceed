/* eslint-disable no-underscore-dangle */

/**
 * @module helpers
 */

/**
 * @module constraint-helper
 * @memberof module:helpers
 */

/**
 * This function is meant to check for contradictions between task and process constraints before saving them in the modal
 * @param taskConstraints
 * @param processConstraints
 * @returns {string}
 */
export const getContradictionsMessage = ({ taskConstraints, processConstraints }) => {
  if (!taskConstraints || !processConstraints) return '';

  const contradictionMessages = [];

  const processIPs = processConstraints
    .filter(
      (pc) =>
        ((pc.unit && pc.unit === 'subIP') || pc.name.startsWith('machine.network')) &&
        pc.condition === '==',
    )
    .map((pc) => pc.value);
  const taskIPs = taskConstraints
    .filter(
      (tc) =>
        ((tc.unit && tc.unit === 'subIP') || tc.name.startsWith('machine.network')) &&
        tc.condition === '==',
    )
    .map((tc) => tc.value);

  if (!processIPs.length && !taskIPs.length) return '';

  [processIPs, taskIPs].forEach((level1, i1) => {
    level1.forEach((ip) => {
      if (ip === 'machine.host.ip') return;

      [processIPs, taskIPs].forEach((level2, i2) => {
        level2.forEach((otherIP) => {
          if (ip === 'machine.host.ip') return;

          if (otherIP !== ip) {
            const a = otherIP.length < ip ? otherIP : ip;
            const b = a === otherIP ? ip : otherIP;

            if (!b.startsWith(a)) {
              contradictionMessages.push(
                `The IP addresses of the ${
                  i1 !== i2 ? 'process and task ' : ''
                }location constraints do not overlap.`,
              );
            }
          }
        });
      });
    });
  });

  return contradictionMessages.length
    ? `Error: ${contradictionMessages[0]} Please change and try saving again.`
    : '';
};
/**
 * This function generates a description string to display below a profile name
 * @param {Object} profile
 * @param {string} profile.name
 * @param {string} profile.description
 * @param {Object[]} profile.processConstraints
 * @returns {string}
 */
export const getConstraintDescription = (profile) => {
  if (!profile) return '';
  if (profile.description) return profile.description;
  if (!profile.processConstraints) return 'no constraints selected';
  let hardConstraints;
  let softConstraints;
  if (profile.processConstraints.hardConstraints) {
    hardConstraints = profile.processConstraints.hardConstraints
      .map((c) => c.name || c._attributes.id)
      .join(', ');
  }
  if (profile.processConstraints.softConstraints) {
    softConstraints = profile.processConstraints.softConstraints
      .map((c) => c.name || c._attributes.id)
      .join(', ');
  }
  return (hardConstraints ? 'hard:' : '').concat(
    hardConstraints || '',
    ' ',
    softConstraints ? 'soft:' : '',
    softConstraints || '',
  );
};
