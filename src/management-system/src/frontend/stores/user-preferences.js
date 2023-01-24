import { dataInterface, userId } from '@/frontend/backend-api/index.js';
import { mergeIntoObject } from '@/shared-frontend-backend/helpers/javascriptHelpers.js';

async function saveUserPreferences(newState, force) {
  // only save userPreferences if they are supposed to for authenticated user
  if ((force || newState.config.useUserPreferences) && userId) {
    dataInterface.set('userPreferences', 'userPreferences', newState, userId);
  }
}

const getDefaultProcessView = () => {
  return {
    tabs: [],
    selectedView: 'table',
    showFavorites: false,
    datatableView: {
      sortBy: [],
      groupByDepartments: [],
      itemsPerPage: 10,
      columnSelection: ['Name', 'Last Edited', 'Departments'],
    },
    cardView: {
      cardsPerRow: 3,
    },
  };
};

const getDefaultProjectView = () => {
  return {
    tabs: [],
    selectedView: 'table',
    showFavorites: false,
    datatableView: {
      sortBy: [],
      groupByDepartments: [],
      itemsPerPage: 10,
      columnSelection: [
        'Name',
        'Last Edited',
        'Schedule Status',
        'Planning Status',
        'Planned End Date',
      ],
    },
    cardView: {
      cardsPerRow: 3,
    },
    statusWindowMeasurements: {
      right: '2vw',
      top: '10vh',
      width: '40vw',
      height: '80vh',
    },
  };
};

const getDefaultProcessEditorView = () => {
  return {
    isPropertiesPanelVisible: true,
  };
};

export default function createUserPreferencesStore() {
  const initialState = {
    config: {
      useUserPreferences: true,
      highlightNonExecutableElements: true,
      nonExecutableElementsColor: 'orange',
      user5thIndustryAuthorization: '',
    },
    userFavorites: [],
    processView: getDefaultProcessView(),
    projectView: getDefaultProjectView(),
    processEditor: getDefaultProcessEditorView(),
    sidePanelHoverable: false,
    executionColorMode: 'executionColors',
  };

  const mutations = {
    updateUserPreferences(state, newPreferences) {
      mergeIntoObject(state, newPreferences, true, true, true);
    },
    updateUserConfig(state, newConfigValues) {
      mergeIntoObject(state.config, newConfigValues, true, 'strict', 'strict');
    },
    setUserFavorites(state, favorites) {
      state.userFavorites = favorites;
    },
    addProcessTofavorites(state, processDefinitionsId) {
      state.userFavorites.push(processDefinitionsId);
    },
    deleteProcessFromFavorites(state, processDefinitionsId) {
      const favorites = state.userFavorites;
      if (favorites.includes(processDefinitionsId)) {
        const index = favorites.indexOf(processDefinitionsId);
        state.userFavorites.splice(index, 1);
      }
    },
    setLastTabSession(state, tabs) {
      state.processView.tabs = tabs;
    },
    setSelectedProcessView(state, selectedView) {
      state.processView.selectedView = selectedView;
    },
    setShowFavoritesProcessView(state, showFavorites) {
      state.processView.showFavorites = showFavorites;
    },
    setItemsPerPageInProcessView(state, itemsPerPage) {
      state.processView.datatableView.itemsPerPage = itemsPerPage;
    },
    setSetGroupByDepartmentsInProcessView(state, groupByDepartments) {
      state.processView.datatableView.groupByDepartments = groupByDepartments;
    },
    setSortByInProcessView(state, sortBy) {
      state.processView.datatableView.sortBy = sortBy;
    },
    setColumnSelectionProcessView(state, columnSelection) {
      state.processView.datatableView.columnSelection = columnSelection;
    },
    setColumnSelectionProjectView(state, columnSelection) {
      state.projectView.datatableView.columnSelection = columnSelection;
    },
    setStatusWindowMeasurementsProjectView(state, statusWindowMeasurements) {
      state.projectView.statusWindowMeasurements = statusWindowMeasurements;
    },
    setCardsPerRowInProcessView(state, cardsPerRow) {
      state.processView.cardView.cardsPerRow = cardsPerRow;
    },
    setPropertiesPanelVisibility(state, isPropertiesPanelVisible) {
      state.processEditor.isPropertiesPanelVisible = isPropertiesPanelVisible;
    },
    setSidePanelHoverable(state, isSidePanelHoverable) {
      state.sidePanelHoverable = isSidePanelHoverable;
    },
    setExecutionColorMode(state, executionColorMode) {
      state.executionColorMode = executionColorMode;
    },
  };

  const actions = {
    async loadUserPreferences({ commit, rootGetters }) {
      const userPreferences = await dataInterface.get('userPreferences');
      // backend doesn't have preferences stored for the user or the preferences are not supposed to be used
      if (
        !userPreferences ||
        !userPreferences[rootGetters['authStore/getUser'].id] ||
        !userPreferences[rootGetters['authStore/getUser'].id].config
      ) {
        return;
      }

      if (
        userPreferences[rootGetters['authStore/getUser'].id].config.useUserPreferences === false
      ) {
        commit('updateUserPreferences', {
          config: userPreferences[rootGetters['authStore/getUser'].id].config,
        });
      } else {
        commit('updateUserPreferences', userPreferences[rootGetters['authStore/getUser'].id]);
      }
    },
    resetUIPreferences({ commit, state }) {
      commit('updateUserPreferences', {
        ...state,
        processView: getDefaultProcessView(),
        processEditor: getDefaultProcessEditorView(),
      });

      saveUserPreferences(state);
    },
    updateUserConfig({ commit, state }, newConfigValues) {
      if (typeof newConfigValues !== 'object' || Array.isArray(newConfigValues)) {
        throw new Error('Tried to update user config with something that was not an object.');
      }

      const oldUsePreferences = state.config.useUserPreferences;

      commit('updateUserConfig', newConfigValues);

      const newUsePreferences = state.config.useUserPreferences;
      // force a push into backend when useUserPreferences changes from true to false
      saveUserPreferences(state, oldUsePreferences && !newUsePreferences);
    },
    addNewProcessToFavorites({ commit, state }, processDefinitionsId) {
      commit('addProcessTofavorites', processDefinitionsId);
      saveUserPreferences(state, undefined);
    },
    deleteProcessFromFavoritesById({ commit, state }, processDefinitionsId) {
      commit('deleteProcessFromFavorites', processDefinitionsId);
      saveUserPreferences(state);
    },

    setLastTabSession({ commit, state }, tabs) {
      commit('setLastTabSession', tabs);
      saveUserPreferences(state);
    },
    setSelectedProcessView({ commit, state }, selectedView) {
      commit('setSelectedProcessView', selectedView);
      saveUserPreferences(state);
    },
    setShowFavoritesProcessView({ commit, state }, showFavorites) {
      commit('setShowFavoritesProcessView', showFavorites);
      saveUserPreferences(state);
    },
    setItemsPerPageInProcessView({ commit, state }, itemsPerPage) {
      commit('setItemsPerPageInProcessView', itemsPerPage);
      saveUserPreferences(state);
    },
    setSetGroupByDepartmentsInProcessView({ commit, state }, groupByDepartments) {
      commit('setSetGroupByDepartmentsInProcessView', groupByDepartments);
      saveUserPreferences(state);
    },
    setSortByInProcessView({ commit, state }, sortBy) {
      commit('setSortByInProcessView', sortBy);
      saveUserPreferences(state);
    },
    setColumnSelectionProcessView({ commit, state }, columnSelection) {
      commit('setColumnSelectionProcessView', columnSelection);
      saveUserPreferences(state);
    },
    setColumnSelectionProjectView({ commit, state }, columnSelection) {
      commit('setColumnSelectionProjectView', columnSelection);
      saveUserPreferences(state);
    },
    setStatusWindowMeasurementsProjectView({ commit, state }, statusWindowMeasurements) {
      commit('setStatusWindowMeasurementsProjectView', statusWindowMeasurements);
      saveUserPreferences(state);
    },
    setCardsPerRowInProcessView({ commit, state }, cardsPerRow) {
      commit('setCardsPerRowInProcessView', cardsPerRow);
      saveUserPreferences(state);
    },
    setPropertiesPanelVisibility({ commit, state }, isPropertiesPanelVisible) {
      commit('setPropertiesPanelVisibility', isPropertiesPanelVisible);
      saveUserPreferences(state);
    },
    setSidePanelHoverable({ commit, state }, isSidePanelHoverable) {
      commit('setSidePanelHoverable', isSidePanelHoverable);
      saveUserPreferences(state);
    },
    setExecutionColorMode({ commit, state }, executionColorMode) {
      commit('setExecutionColorMode', executionColorMode);
      saveUserPreferences(state);
    },
  };

  const getters = {
    getPreferences: (state) => {
      return state;
    },
    getUserConfig: (state) => {
      return state.config;
    },
    getUserFavorite: (state) => {
      return state.userFavorites;
    },
    getLastTabSession: (state) => {
      return state.processView.tabs;
    },
    getSelectedProcessView: (state, getters, rootState, rootGetters) => {
      return state.processView.selectedView;
    },
    getShowFavoritesProcessView: (state, getters, rootState, rootGetters) => {
      return state.processView.showFavorites;
    },
    getCardsPerRow: (state, getters, rootState, rootGetters) => {
      return state.processView.cardView.cardsPerRow;
    },
    getItemsPerPage: (state, getters, rootState, rootGetters) => {
      return state.processView.datatableView.itemsPerPage;
    },
    getGroupByDepartments: (state, getters, rootState, rootGetters) => {
      return state.processView.datatableView.groupByDepartments;
    },
    getSortBy: (state, getters, rootState, rootGetters) => {
      return state.processView.datatableView.sortBy;
    },
    getColumnSelectionsProcessView: (state, getters, rootState, rootGetters) => {
      return state.processView.datatableView.columnSelection;
    },
    getColumnSelectionsProjectView: (state, getters, rootState, rootGetters) => {
      return state.projectView.datatableView.columnSelection;
    },
    getStatusWindowMeasurementsProjectView: (state, getters, rootState, rootGetters) => {
      return state.projectView.statusWindowMeasurements;
    },
    getPropertiesPanelVisibility: (state, getters, rootState, rootGetters) => {
      return state.processEditor.isPropertiesPanelVisible;
    },
    getSidePanelHoverable: (state) => {
      return state.sidePanelHoverable;
    },
    getExecutionColorMode: (state) => {
      return state.executionColorMode;
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
