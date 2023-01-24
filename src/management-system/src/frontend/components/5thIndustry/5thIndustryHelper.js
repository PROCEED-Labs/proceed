import {
  toBpmnObject,
  toBpmnXml,
  getElementsByTagName,
  getMetaData,
  setMetaData,
  getTaskConstraintMapping,
  addConstraintsToElementById,
  setUserTaskData,
} from '@proceed/bpmn-helper';
import { fifthIndustryInterface } from '@/frontend/backend-api/index.js';

import { getUpdatedTaskConstraintMapping } from '@/frontend/helpers/usertask-helper.js';
import { asyncForEach } from '@/shared-frontend-backend/helpers/javascriptHelpers.js';

export async function remove5thIndustryDataFromXml(data) {
  const bpmnObj = await toBpmnObject(data.bpmn);

  const processes = getElementsByTagName(bpmnObj, 'bpmn:Process');

  await asyncForEach(processes, async (process) => {
    const meta = await getMetaData(bpmnObj, process.id);

    // if there is no plan set on the bpmn we don't expect there to be other 5i Data
    if (!meta['_5i-Inspection-Plan-ID'] && !meta['_5i-Inspection-Plan-Template-ID']) {
      return;
    }

    // reset 5thIndustry data on the process object
    await setMetaData(bpmnObj, process.id, {
      '_5i-Inspection-Plan-ID': undefined,
      '_5i-Inspection-Plan-Template-ID': undefined,
      '_5i-Inspection-Plan-Title': undefined,
      '_5i-API-Address': undefined,
      '_5i-Application-Address': undefined,
    });

    // reset 5thIndustry data on all user tasks
    const userTasks = getElementsByTagName(process, 'bpmn:UserTask');

    await asyncForEach(userTasks, async (userTask) => {
      await setMetaData(bpmnObj, userTask.id, {
        '_5i-Assembly-Group-ID': undefined,
        '_5i-Assembly-Group-Name': undefined,
        '_5i-Manufacturing-Step-ID': undefined,
        '_5i-Manufacturing-Step-Name': undefined,
        '_5i-Inspection-Order-ID': undefined,
        '_5i-Inspection-Order-Code': undefined,
        '_5i-Inspection-Order-Shortdescription': undefined,
      });
    });
  });

  data.bpmn = await toBpmnXml(bpmnObj);
  return data;
}

export async function createPlan(info, templateId, bpmn) {
  const newPlan = await fifthIndustryInterface.createInspectionPlan(info, templateId);

  let newBpmn;
  if (bpmn) {
    newBpmn = await mapUserTasks(newPlan, bpmn);
  }

  return { newPlanId: newPlan._id, newBpmn };
}

/**
 * Tries to adjust the ids of the assembly groups, manufacturing steps and inspection orders that were assigned to user tasks
 *
 * This is necessary since the ids change when a plan is created from a template
 *
 * @param {Object} newPlan the newly created plan
 */
async function mapUserTasks(newPlan, bpmn) {
  // we first have to make sure that all assembly groups and all manufacturing steps inside a single assembly group are uniquely named
  // this is necessary since the names are the only thing that can be used to match them to their counterparts in the template
  // if they were not unique we couldn't know which one is supposed to be the one to map to
  const bpmnObj = await toBpmnObject(bpmn);
  const userTasks = await getElementsByTagName(bpmnObj, 'bpmn:UserTask');

  for (const userTask of userTasks) {
    const meta = await getMetaData(bpmnObj, userTask.id);

    if (meta['_5i-Assembly-Group-Name']) {
      const newMeta = getNewMetaData(
        newPlan.assemblyGroup,
        meta['_5i-Assembly-Group-Name'],
        meta['_5i-Manufacturing-Step-Name'],
        meta['_5i-Inspection-Order-Code']
      );

      await setMetaData(bpmnObj, userTask.id, newMeta);
    }
  }

  return await toBpmnXml(bpmnObj);
}

// check if the order can be uniquely identified and if yes return the updated information (e.g. the new ids) of the group step and order
function getNewMetaData(assemblyGroups, groupName, stepName, orderCode) {
  // will be returned if the correct order can't be deduced to reset the order assigned to a user task
  let newMeta = {
    '_5i-Assembly-Group-ID': undefined,
    '_5i-Assembly-Group-Name': undefined,
    '_5i-Manufacturing-Step-ID': undefined,
    '_5i-Manufacturing-Step-Name': undefined,
    '_5i-Inspection-Order-ID': undefined,
    '_5i-Inspection-Order-Code': undefined,
    '_5i-Inspection-Order-Shortdescription': undefined,
  };

  const groups = assemblyGroups.filter((group) => {
    return group.assemblyGroupName.some(({ value }) => value === groupName);
  });

  if (groups.length !== 1) {
    return newMeta;
  }

  const steps = groups[0].manufacturingStep.filter((step) => {
    return step.manufacturingStepName.some(({ value }) => value === stepName);
  });

  if (steps.length !== 1) {
    return newMeta;
  }

  const orders = steps[0].inspectionOrders.filter((order) => {
    return order.inspectionCode.some(({ value }) => value === orderCode);
  });

  if (orders.length !== 1) {
    return newMeta;
  }

  let order = orders[0];

  let orderDescription;

  if (order.inspectionDescriptionShort && order.inspectionDescriptionShort.length) {
    orderDescription = order.inspectionDescriptionShort[0].value.trim();
  }

  return {
    '_5i-Assembly-Group-ID': groups[0]._id,
    '_5i-Assembly-Group-Name': groupName,
    '_5i-Manufacturing-Step-ID': steps[0]._id,
    '_5i-Manufacturing-Step-Name': stepName,
    '_5i-Inspection-Order-ID': orders[0]._id,
    '_5i-Inspection-Order-Code': orderCode,
    '_5i-Inspection-Order-Shortdescription': orderDescription,
  };
}

/**
 * Will remove trailing slash from a url if there is one
 *
 * @param {String} url the url to normalize
 */
export function normalizeUrl(url) {
  if (url.endsWith('/')) {
    url = url.slice(0, url.length - 1);
  }

  return url;
}

export async function setUserTasksTo5thIndustry(bpmn) {
  const bpmnObj = await toBpmnObject(bpmn);

  const userTasks = await getElementsByTagName(bpmnObj, 'bpmn:UserTask');
  const constraintMapping = await getTaskConstraintMapping(bpmnObj);

  for (const userTask of userTasks) {
    // make sure to remove html specific constraints
    const newConstraints = getUpdatedTaskConstraintMapping(constraintMapping[userTask.id], '');
    await addConstraintsToElementById(bpmnObj, userTask.id, newConstraints);
    // remove fileName attribute and set implementation to 5thIndustry
    await setUserTaskData(bpmnObj, userTask.id, undefined, '5thIndustry');
  }

  return await toBpmnXml(bpmnObj);
}
