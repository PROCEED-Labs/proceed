export default function createWarningStore() {
  const initialState = {
    showWarning: false,
  };

  const getters = {
    showWarning(state) {
      return state.showWarning;
    },
  };

  const mutations = {
    setWarning(state, showWarning) {
      state.showWarning = showWarning;
    },
  };

  return {
    namespaced: true,
    state: initialState,
    getters,
    actions: {},
    mutations,
  };
}
