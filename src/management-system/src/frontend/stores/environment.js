import * as R from 'ramda';
import { dataInterface, eventHandler } from '@/frontend/backend-api/index.js';

export default function createEnvironmentProfileStore() {
  const initialState = {
    environmentProfiles: [],
  };

  const getters = {
    environmentProfiles(state) {
      return state.environmentProfiles;
    },
    profileById(state) {
      return (id) => R.find(R.propEq('id', id), state.environmentProfiles);
    },
    profileJSONById(state, getters) {
      return (id) => dataInterface.getEnvProfileJSON(id, getters.profileById(id).type);
    },
  };

  const actions = {
    async loadEnvProfiles({ commit, state }) {
      const envProfiles = await dataInterface.get('environmentProfiles');
      commit('setEnvProfiles', envProfiles);

      eventHandler.on('environmentProfilesChanged', (environmentProfiles) => {
        commit('setEnvProfiles', environmentProfiles);
      });

      eventHandler.on('environmentProfileAdded', ({ environmentProfile }) => {
        commit('add', environmentProfile);
      });

      eventHandler.on('environmentProfileRemoved', ({ environmentProfileId }) => {
        commit('remove', { profileId: environmentProfileId });
      });

      eventHandler.on('environmentProfileUpdated', ({ oldId, updatedInfo }) => {
        const storedProfileIndex = state.environmentProfiles.findIndex((p) => oldId === p.id);

        if (storedProfileIndex > -1) {
          commit('update', { foundProfileIdx: storedProfileIndex, metadata: updatedInfo });
        }
      });
    },
    add({ commit, state }, { environmentProfile, type }) {
      if (!R.find(R.propEq('id', environmentProfile.id), state.environmentProfiles)) {
        const profile = {
          name: environmentProfile.name,
          id: environmentProfile.id,
          type,
        };
        commit('add', profile);
        dataInterface.addToStore('environmentProfiles', profile);
        dataInterface.saveEnvProfile(
          environmentProfile.id,
          type,
          JSON.stringify(environmentProfile)
        );
      }
    },
    update({ state, commit }, { profile, type }) {
      const foundProfileIdx = R.findIndex(R.propEq('id', profile.id), state.environmentProfiles);
      if (foundProfileIdx >= 0) {
        const metaData = {
          name: profile.name,
          id: profile.id,
          type,
        };
        commit('update', { foundProfileIdx, metaData });
        dataInterface.updateInStore('environmentProfiles', profile.id, metaData);
        dataInterface.saveEnvProfile(profile.id, type, JSON.stringify(profile));
      }
    },
    remove({ state, commit }, { id, type }) {
      const profile = state.environmentProfiles.find((p) => p.id === id);
      if (profile) {
        commit('remove', { profileId: id });
        dataInterface.removeFromStore('environmentProfiles', id);
        dataInterface.deleteEnvProfile(id, type);
      }
    },
  };

  const mutations = {
    setEnvProfiles(state, envProfiles) {
      state.environmentProfiles = envProfiles;
    },

    add(state, profile) {
      state.environmentProfiles = [...state.environmentProfiles, profile];
    },

    update(state, { foundProfileIdx, metaData }) {
      state.environmentProfiles = [
        ...R.take(foundProfileIdx, state.environmentProfiles),
        metaData,
        ...R.drop(foundProfileIdx + 1, state.environmentProfiles),
      ];
    },

    remove(state, { profileId }) {
      const newProfiles = R.reject(R.propEq('id', profileId), state.environmentProfiles);
      if (newProfiles.length !== state.environmentProfiles.length) {
        state.environmentProfiles = newProfiles;
      }
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
