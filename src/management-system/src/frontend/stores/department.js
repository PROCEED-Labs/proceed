export default function createDepartmentStore() {
  const state = {
    departments: [
      {
        name: 'Production',
        color: '#bdb6ce',
      },
      {
        name: 'Research and Development',
        color: '#252257',
      },
      {
        name: 'Purchasing',
        color: '#c2bf49',
      },
      {
        name: 'Marketing',
        color: '#2ddaaf',
      },
      {
        name: 'Human Resource Managment',
        color: '#4b9f12',
      },
      {
        name: 'Accounting and Finance',
        color: '#a63915',
      },
    ],
  };
  const mutations = {
    addDepartment(state, department) {
      state.departments.push(department);
    },
  };
  const actions = {
    addNewDepartment({ commit }, department) {
      commit('addDepartment', department);
    },
  };
  const getters = {
    getDepartments: (state) => {
      return state.departments.sort((dep1, dep2) => (dep1.name > dep2.name ? 1 : -1));
    },
  };

  return {
    namespaced: true,
    state: state,
    getters,
    actions,
    mutations,
  };
}
