import {
  getInspectionPlans,
  getInspectionPlanData,
  createPlan,
} from '../shared-electron-server/network/5thIndustry/5thIndustry.js';

export function setup5thIndustryHandlers(addListener) {
  addListener('5th_Industry_get_inspection_plans', async (socket, id, type) => {
    try {
      const result = await getInspectionPlans(type);
      socket.emit('5th_Industry_get_inspection_plans', id, { data: result });
    } catch (error) {
      socket.emit('5th_Industry_get_inspection_plans', id, { error: error.message });
    }
  });

  addListener(
    '5th_Industry_get_inspection_plan_data',
    async (socket, id, inspectionPlanId, type) => {
      try {
        const result = await getInspectionPlanData(inspectionPlanId, type);
        socket.emit('5th_Industry_get_inspection_plan_data', id, { data: result });
      } catch (error) {
        socket.emit('5th_Industry_get_inspection_plan_data', id, { error: error.message });
      }
    },
  );

  addListener(
    '5th_Industry_create_inspection_plan',
    async (socket, id, planInformation, templateId) => {
      try {
        const result = await createPlan(planInformation, templateId);
        socket.emit('5th_Industry_create_inspection_plan', id, { data: result });
      } catch (error) {
        socket.emit('5th_Industry_create_inspection_plan', id, { error: error.message });
      }
    },
  );
}
