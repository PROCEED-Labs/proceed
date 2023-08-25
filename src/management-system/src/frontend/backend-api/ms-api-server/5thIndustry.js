import { request } from './socket.js';

async function getInspectionPlans(type) {
  const [result] = await request('5th_Industry_get_inspection_plans', type);

  if (result.error) {
    throw new Error(result.error);
  } else {
    return result.data;
  }
}

async function getInspectionPlanData(inspectionPlanId, type) {
  const [result] = await request('5th_Industry_get_inspection_plan_data', inspectionPlanId, type);

  if (result.error) {
    throw new Error(result.error);
  } else {
    return result.data;
  }
}

async function createInspectionPlan(planInformation, templateId) {
  const [result] = await request(
    '5th_Industry_create_inspection_plan',
    planInformation,
    templateId,
  );

  if (result.error) {
    throw new Error(result.error);
  } else {
    return result.data;
  }
}

export default {
  getInspectionPlans,
  getInspectionPlanData,
  createInspectionPlan,
};
