import { dataInterface } from '@/frontend/backend-api/index.js';
import { mergeIntoObject } from '@/shared-frontend-backend/helpers/javascriptHelpers.js';

export default function createEnvironmentConfigStore() {
  const initialState = {
    milestones: [],
    settings: {
      currency: {
        name: 'European Euro',
        cc: 'EUR',
        symbol: '\u20ac',
      },
    },
    resources: [],
    company: {
      id: '',
      longName: '',
      shortName: '',
      factoryIds: [],
      description: '',
    },
    factories: [],
    buildings: [],
    areas: [],
    workingPlaces: [],
  };

  const getters = {
    environmentConfig(state) {
      return state;
    },
    milestones(state) {
      return state.milestones;
    },
    settings(state) {
      return state.settings;
    },
    resources(state) {
      return state.resources;
    },
    company(state) {
      return state.company;
    },
    factories(state) {
      return state.factories;
    },
    buildings(state) {
      return state.buildings;
    },
    areas(state) {
      return state.areas;
    },
    workingPlaces(state) {
      return state.workingPlaces;
    },
  };

  const mutations = {
    setEnvironmentConfig(state, environmentConfig) {
      try {
        mergeIntoObject(state, environmentConfig, true, true, true);
      } catch (error) {
        state = initialState;
      }
    },
    updateSettings(state, newSettings) {
      mergeIntoObject(state.settings, newSettings, true, true, true);
    },
    updateCompany(state, newCompanyInfo) {
      state.company = { ...newCompanyInfo };
    },
    addConfigItem(state, { configName, configInfo }) {
      if (configName && state[configName]) {
        const configItemIdx = state[configName].findIndex((item) => item.id === configInfo.id);
        if (configItemIdx > -1) {
          state[configName].splice(configItemIdx, 1, configInfo);
        } else {
          state[configName].push(configInfo);
        }
      }
    },
    removeConfigItem(state, { configName, id }) {
      if (configName && state[configName]) {
        state[configName] = state[configName].filter((item) => item.id !== id);
      }
    },
  };

  const actions = {
    updateSettings({ commit, state }, newSettings) {
      commit('updateSettings', newSettings);
      dataInterface.set('environmentConfig', 'environmentConfig', state);
    },
    async loadEnvironmentConfig({ commit }) {
      const environmentConfig = await dataInterface.get('environmentConfig');
      commit('setEnvironmentConfig', environmentConfig);
    },
    addMilestone({ commit, state }, milestoneInfos) {
      commit('addConfigItem', { configName: 'milestones', configInfo: milestoneInfos });
      dataInterface.set('environmentConfig', 'environmentConfig', state);
    },
    removeMilestone({ commit, state }, id) {
      commit('removeConfigItem', { configName: 'milestones', id });
      dataInterface.set('environmentConfig', 'environmentConfig', state);
    },
    addResource({ commit, state }, resourceInfo) {
      commit('addConfigItem', { configName: 'resources', configInfo: resourceInfo });
      dataInterface.set('environmentConfig', 'environmentConfig', state);
    },
    removeResource({ commit, state }, id) {
      commit('removeConfigItem', { configName: 'resources', id });
      dataInterface.set('environmentConfig', 'environmentConfig', state);
    },
    updateCompany({ commit, state }, companyInfo) {
      commit('updateCompany', companyInfo);
      dataInterface.set('environmentConfig', 'environmentConfig', state);
    },
    addFactory({ commit, state }, factoryInfo) {
      commit('addConfigItem', { configName: 'factories', configInfo: factoryInfo });
      dataInterface.set('environmentConfig', 'environmentConfig', state);
    },
    removeFactory({ commit, state }, id) {
      commit('removeConfigItem', { configName: 'factories', id });
      dataInterface.set('environmentConfig', 'environmentConfig', state);
    },
    addBuilding({ commit, state }, buildingInfo) {
      commit('addConfigItem', { configName: 'buildings', configInfo: buildingInfo });
      dataInterface.set('environmentConfig', 'environmentConfig', state);
    },
    removeBuilding({ commit, state }, id) {
      commit('removeConfigItem', { configName: 'buildings', id });
      dataInterface.set('environmentConfig', 'environmentConfig', state);
    },
    addArea({ commit, state }, areaInfo) {
      commit('addConfigItem', { configName: 'areas', configInfo: areaInfo });
      dataInterface.set('environmentConfig', 'environmentConfig', state);
    },
    removeArea({ commit, state }, id) {
      commit('removeConfigItem', { configName: 'areas', id });
      dataInterface.set('environmentConfig', 'environmentConfig', state);
    },
    addWorkingPlace({ commit, state }, workingPlaceInfo) {
      commit('addConfigItem', { configName: 'workingPlaces', configInfo: workingPlaceInfo });
      dataInterface.set('environmentConfig', 'environmentConfig', state);
    },
    removeWorkingPlace({ commit, state }, id) {
      commit('removeConfigItem', { configName: 'workingPlaces', id });
      dataInterface.set('environmentConfig', 'environmentConfig', state);
    },
  };

  return {
    namespaced: true,
    state: initialState,
    getters,
    actions,
    mutations,
  };
}
