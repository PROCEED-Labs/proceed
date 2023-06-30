import { enable5thIndustryIntegration } from '../../../../../FeatureFlags.js';

const config = {
  startEngineAtStartup: false,
  logLevel: 'info',
  machinePollingInterval: 10,
  deploymentsPollingInterval: 10,
  activeUserTasksPollingInterval: 5,
  instancePollingInterval: 5,
  deploymentStorageTime: 60 * 15,
  activeUserTaskStorageTime: 60 * 10,
  instanceStorageTime: 60 * 10,
  closeOpenEditorsInMs: 300000,
  processEngineUrl: '',
  domains: [],
  trustedOrigins: [],
};

if (enable5thIndustryIntegration) {
  config._5thIndustryApplicationURL = '';
  config._5thIndustryAPIURL = '';
}

export default config;
