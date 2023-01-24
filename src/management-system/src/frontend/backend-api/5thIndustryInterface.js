import api from './ms-api-interface/5thIndustry.js';

class _5thIndustryInterface {
  async getInspectionPlans(type) {
    return await api.getInspectionPlans(type);
  }
  async getInspectionPlanData(inspectionPlanId, type) {
    return await api.getInspectionPlanData(inspectionPlanId, type);
  }

  async createInspectionPlan(planInformation, templateId) {
    return await api.createInspectionPlan(planInformation, templateId);
  }
}

export default _5thIndustryInterface;
