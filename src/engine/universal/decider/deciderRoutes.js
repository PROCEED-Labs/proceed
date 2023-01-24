/* eslint-disable no-plusplus */
const { network } = require('@proceed/system');
const constraintManager = require('./constraintManager');
const Hceval = require('./hard_constraint_evaluation/hc-eval.js');

const route = '/evaluation';

module.exports = () => {
  network.post(`${route}/`, { cors: true }, async (req) => {
    const { hardConstraints, softConstraints, flowNodeInformation } = req.body.formData;

    let localSoftConstraintValues = null;
    if (
      (await constraintManager.checkExecutionConfig(flowNodeInformation)) &&
      (hardConstraints.length === 0 ||
        (await Hceval.machineSatisfiesAllHardConstraints(hardConstraints)))
    ) {
      localSoftConstraintValues = await constraintManager.getLocalSoftConstraintValues(
        softConstraints
      );
    }

    return JSON.stringify(localSoftConstraintValues);
  });
};
