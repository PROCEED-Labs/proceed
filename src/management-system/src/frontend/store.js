import Vue from 'vue';
import Vuex from 'vuex';
import createMachineStore from './stores/machine.js';
import createDeploymentStore from './stores/deployment.js';
import createProcessEditorStore from './stores/process-editor.js';
import createWarningStore from './stores/show-warning.js';
import createProcessStore from './stores/process.js';
import createCapabilityStore from './stores/capability.js';
import createEnvironmentProfileStore from './stores/environment.js';
import createEnvironmentConfigStore from './stores/environmentConfig.js';
import createConfigStore from './stores/config.js';
// import createServiceStore from './stores/service';
import createDepartmentStore from './stores/department.js';
import createUserPreferencesStore from './stores/user-preferences.js';
import createAuthStore from './stores/auth.js';
import abilityPlugin from '@/frontend/stores/plugins/abilities';

Vue.use(Vuex);

export default async function () {
  const machineStore = createMachineStore();
  const deploymentStore = createDeploymentStore();
  const processStore = createProcessStore();
  const processEditorStore = createProcessEditorStore();
  const capabilityStore = createCapabilityStore();
  const environmentStore = createEnvironmentProfileStore();
  const environmentConfigStore = createEnvironmentConfigStore();
  const configStore = await createConfigStore();
  const warningStore = createWarningStore();
  const departmentStore = createDepartmentStore();
  const userPreferencesStore = createUserPreferencesStore();
  const authStore = createAuthStore();

  return new Vuex.Store({
    modules: {
      machineStore,
      deploymentStore,
      processStore,
      processEditorStore,
      capabilityStore,
      environmentStore,
      environmentConfigStore,
      configStore,
      departmentStore,
      userPreferencesStore,
      warningStore,
      authStore,
    },
    plugins: [abilityPlugin],
    strict: false,
  });
}
