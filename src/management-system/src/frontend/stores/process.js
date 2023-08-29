import * as R from 'ramda';
import { processInterface, eventHandler } from '@/frontend/backend-api/index.js';
import {
  createProcess,
  getProcessInfo,
  getDefaultProcessMetaInfo,
} from '@/shared-frontend-backend/helpers/processHelpers.js';
import {
  mergeIntoObject,
  asyncForEach,
  asyncMap,
} from '@/shared-frontend-backend/helpers/javascriptHelpers.js';
import { initResourcePermissions } from '@/frontend/helpers/iam/permissions/permissions-handler.js';
import { scaleDownImage } from '@/frontend/helpers/image-helper.js';
import { subject } from '@casl/ability';
import { getDefinitionsAndProcessIdForEveryCallActivity } from '@proceed/bpmn-helper';

export default function createProcessStore() {
  let processStoreResolver;

  /**
   * @see fileHandling.js:getProcessInfo (persistent attributes)
   * @see process.js (backend):init (non-persistent attributes)
   * There you find all attributes which are inside a process
   */
  const initialState = {
    processes: [],
    initialized: new Promise((resolve) => {
      processStoreResolver = resolve;
    }),
  };

  const getters = {
    initialized(state) {
      return state.initialized;
    },
    processes(state) {
      return state.processes;
    },
    processById(state) {
      return (id) => R.find(R.propEq('id', id))(state.processes);
    },
    xmlById(state, getters) {
      return async (id) => (await processInterface.getProcess(id)).bpmn;
    },
    xmlByVersion() {
      return async (id, version) => await processInterface.getProcessVersionBpmn(id, version);
    },
    htmlMappingById() {
      return async (id) => await processInterface.getUserTasksHTML(id);
    },
  };

  const actions = {
    async loadProcesses({ commit, state, rootGetters }) {
      const processes = await processInterface.getProcesses();
      if (processes.length)
        processes.map((object) => {
          const type = object.type[0].toUpperCase() + object.type.slice(1);
          return subject(type, object);
        });
      commit('setProcesses', processes);

      eventHandler.on('processAdded', ({ process }) => {
        if (!state.processes.some((p) => p.id === process.id)) {
          commit('add', { process });
        }
      });

      eventHandler.on('processRemoved', ({ processDefinitionsId }) => {
        commit('remove', { processDefinitionsId });
      });

      eventHandler.on('processUpdated', ({ oldId, updatedInfo }) => {
        const index = state.processes.findIndex((p) => p.id === oldId);

        if (index > -1) {
          commit('update', { foundProcessIdx: index, process: updatedInfo });
        }
      });

      // set user permissions for each process to adjust UI (each process contains permissions key, which is used to obtain user permissions)
      if (rootGetters['authStore/isAuthenticated']) {
        try {
          const permissions = await initResourcePermissions(processes);
          if (Object.keys(permissions).length)
            commit('authStore/SET_PERMISSIONS', permissions, { root: true });
        } catch (e) {
          throw new Error(e.toString());
        }
      }

      processStoreResolver();
    },
    async add({ state, commit, dispatch, rootGetters }, { process, bpmn, override }) {
      // if it is not explicitly defined if the process should be shared or not check if the user is currently logged in
      // yes => store the process in the backend (shared = true)
      // no  => store the process locally (shared = false)
      if (typeof process.shared !== 'boolean') {
        process.shared = !!rootGetters['authStore/isAuthenticated'];
      }

      // make sure that the process only contains expected entries
      process = mergeIntoObject(getDefaultProcessMetaInfo(), process, false, true, false);

      if (!R.find(R.propEq('id', process.id), state.processes)) {
        try {
          ({ metaInfo: process, bpmn } = await createProcess({ ...process, bpmn }));
        } catch (error) {
          console.error(error);
        }

        // This currently solves the following problem but the test is redundant
        // 1. adding to local store first -> some components update when the list changes and instantly try to pull data from the backend (but its not there)
        // 2. adding to backend first -> client adds process because of information from backend above and then again here
        await processInterface.addProcess({ ...process, bpmn });
        if (!state.processes.some((p) => p.id === process.id)) {
          commit('add', { process });
        }

        return { ...process, bpmn };
      } else if (override) {
        // if we specifically allow to override a process if it exists call update on it
        return await dispatch('update', { id: process.id, changes: process, bpmn });
      }
    },
    async remove({ state, commit }, { id }) {
      const foundProcess = R.find(R.propEq('id', id), state.processes);

      if (foundProcess) {
        const newProcessList = R.reject(R.propEq('id', id), state.processes);

        commit('setProcesses', newProcessList);

        await processInterface.removeProcess(id);
      }
    },
    async addVersion(_, { id, bpmn }) {
      await processInterface.addProcessVersion(id, bpmn);
    },
    async update({ state, commit, dispatch }, { id, changes, bpmn }) {
      const foundProcessIdx = R.findIndex(R.propEq('id', id), state.processes);

      if (foundProcessIdx >= 0) {
        const foundProcess = state.processes[foundProcessIdx];

        // if the process is supposed to be moved into the backend
        if (changes.shared === true && foundProcess.shared === false) {
          await dispatch('moveToBackend', { process: foundProcess });
        } else if (changes.shared === false && foundProcess.shared === true) {
          await dispatch('moveToLocalStorage', { process: foundProcess });
        }

        // if process is not shared anymore
        if (changes.shared_with && changes.shared_with.length === 0 && foundProcess.shared_with) {
          delete foundProcess.shared_with;
        }

        /**
         * if we want to overwrite the old process definition
         * makes sure the bpmn adheres to proceeds rules and get additional info from it, then send it to the backend
         * should be used with user provided/edited bpmn
         */
        if (bpmn) {
          ({ metaInfo: changes, bpmn } = await createProcess({ bpmn, ...changes, id }, true));
          processInterface.updateWholeXml(id, bpmn);
        } else {
          // make sure the bpmn gets updated if process name or description change
          if (changes.name && changes.name !== foundProcess.name) {
            await dispatch('updateProcessName', { id, name: changes.name });
          }
          if (
            changes.description !== undefined &&
            changes.description !== foundProcess.description
          ) {
            await dispatch('updateProcessDescription', { id, description: changes.description });
          }
        }

        // used so we are able to update information not in the bpmn (like departments, variables) in the backend
        await processInterface.updateProcessMetaData(id, changes);

        // merge changes into current process info
        let newProcessInfo = { ...foundProcess, lastEdited: new Date().toUTCString() };
        mergeIntoObject(newProcessInfo, changes, false, true, true);
        if (changes.shared_with && changes.shared_with.length > 0) {
          newProcessInfo = { ...newProcessInfo, shared_with: changes.shared_with };
        }
        commit('update', { foundProcessIdx, process: newProcessInfo });
        return newProcessInfo;
      }
      return null;
    },
    async updateBpmn({ state, dispatch }, { id, bpmn }) {
      const foundProcess = R.find(R.propEq('id', id), state.processes);

      if (foundProcess) {
        // get new info from bpmn
        const newData = await getProcessInfo(bpmn);

        processInterface.updateProcess(id, { bpmn });
        await dispatch('update', {
          id,
          changes: newData,
        });
        return bpmn;
      }
    },
    /** Moves a process from the local storage in the browser to the backend server */
    async moveToBackend({ state, dispatch }, { process }) {
      // recursively move all imports too to prevent problems on later deployment (if an import is missing in the backend the deployment will fail) or if another user tries to look at an import

      // get the bpmn for all versions of the process (including the latest version) which might include call activities referencing other processes
      const allBpmns = await asyncMap(
        process.versions,
        async ({ version }) => await getters.xmlByVersion()(process.id, version),
      );
      allBpmns.push(await getters.xmlById()(process.id));

      // get the definitionsIds of all imported processes in all versions (prevent infinite loops if a process imports another version of itself)
      const allImportInformations = await asyncMap(allBpmns, async (bpmn) => {
        const importInformation = await getDefinitionsAndProcessIdForEveryCallActivity(bpmn, true);
        return Object.values(importInformation).map(({ definitionId }) => definitionId);
      });
      const allUniqueReferencedProcesses = Array.from(new Set(allImportInformations.flat())).filter(
        (el) => el !== process.id,
      );

      // recursively update all imports to be stored in the backend (if they are not already)
      await asyncForEach(allUniqueReferencedProcesses, async (definitionId) => {
        const importedProcess = state.processes.find((p) => p.id === definitionId);
        if (!importedProcess.shared) {
          await dispatch('update', { id: importedProcess.id, changes: { shared: true } });
        }
      });

      await processInterface.pushToBackend(process.id);
    },
    async moveToLocalStorage(_, { process }) {
      throw new Error('Moving from backend to local storage currently not allowed!');
    },
    /**
     * Updates a process in the backend, if id exists
     * should be used by internal changes if we know the bpmn will be a valid proceed process
     */
    updateWholeXml({ state }, { id, bpmn }) {
      const foundProcess = R.find(R.propEq('id', id), state.processes);
      if (foundProcess) {
        processInterface.updateWholeXml(id, bpmn);
      }
    },
    async updateProcessName({ state }, { id, name }) {
      const foundProcess = R.find(R.propEq('id', id), state.processes);
      if (foundProcess) {
        await processInterface.updateProcessName(id, name);
      }
    },

    // TODO: used anywhere?
    async updateOwnership({ commit, state }, { id, name }) {
      const foundProcess = R.find(R.propEq('id', id), state.processes);
      const foundProcessIdx = R.findIndex(R.propEq('id', id), state.processes);
      if (foundProcess) {
        await processInterface.updateProcessName(id, name);
        const process = {
          ...foundProcess,
          lastEdited: new Date().toUTCString(),
          name,
        };
        commit('update', { foundProcessIdx, process });
      }
    },

    async updateProcessDescription({ state }, { id, description }) {
      const foundProcess = R.find(R.propEq('id', id), state.processes);
      if (foundProcess) {
        await processInterface.updateProcessDescription(
          id,
          foundProcess.processIds[0],
          description,
        );
      }
    },
    async updateConstraints({ state }, { processDefinitionsId, elementId, constraints }) {
      // only send constraint updates in the server version
      if (!process.env.IS_ELECTRON) {
        const foundProcess = R.find(R.propEq('id', processDefinitionsId), state.processes);

        // only send process updates for processes that are stored on the server
        if (foundProcess && foundProcess.shared) {
          processInterface.updateConstraints(processDefinitionsId, elementId, constraints);
        }
      }
    },
    saveUserTask({ state }, { processDefinitionsId, taskFileName, html }) {
      const foundProcess = R.find(R.propEq('id', processDefinitionsId), state.processes);

      if (foundProcess) {
        processInterface.saveUserTaskHTML(processDefinitionsId, taskFileName, html);
      }
    },
    deleteUserTask({ state }, { processDefinitionsId, taskFileName }) {
      const foundProcess = R.find(R.propEq('id', processDefinitionsId), state.processes);
      if (foundProcess) {
        processInterface.deleteUserTaskHTML(processDefinitionsId, taskFileName);
      }
    },
    async saveImage({ state }, { processDefinitionsId, imageFileName, image, isUserTaskImage }) {
      const foundProcess = R.find(R.propEq('id', processDefinitionsId), state.processes);

      if (foundProcess) {
        await processInterface.saveImage(
          processDefinitionsId,
          imageFileName,
          await scaleDownImage(image, isUserTaskImage ? 1500 : 500),
        );
      }
    },
    startEditingTask({ state }, { processDefinitionsId, taskId }) {
      const foundProcess = R.find(R.propEq('id', processDefinitionsId), state.processes);
      if (foundProcess && foundProcess.shared && taskId) {
        processInterface.blockTask(processDefinitionsId, taskId);
      }
    },

    stopEditingTask({ state }, { processDefinitionsId, taskId }) {
      const foundProcess = R.find(R.propEq('id', processDefinitionsId), state.processes);
      if (foundProcess && foundProcess.shared && taskId) {
        processInterface.unblockTask(processDefinitionsId, taskId);
      }
    },
  };

  const mutations = {
    setProcesses(state, processes) {
      state.processes = processes;
    },

    add(state, { process }) {
      state.processes = [...state.processes, process];
    },

    remove(state, { processDefinitionsId }) {
      state.processes = state.processes.filter((p) => p.id !== processDefinitionsId);
    },

    update(state, { process, foundProcessIdx }) {
      mergeIntoObject(state.processes[foundProcessIdx], process, true, true, true);
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
