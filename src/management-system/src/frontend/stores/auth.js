import { oauthClient } from '@/frontend/backend-api/index.js';
import { Ability, createAliasResolver } from '@casl/ability';
import { mergeIntoObject } from '@/frontend/helpers/helpers.js';
import { iamInterface as api } from '@/frontend/backend-api/index.js';

// changes behaviour of casl (original behaviour: manage is special keyword to allow everything, new behaviour: manage is an alias for update, create and delete)
// admin is now the equivalent of the manage keyword from the original behaviour
const resolveAction = createAliasResolver(
  {
    manage: ['update', 'create', 'delete'],
  },
  { anyAction: 'admin', anySubjectType: 'All' },
);

// some userinfo endpoints are not returning standardized fields, so we have to make a standard for the MS
const standardizeUser = (user) => {
  if (user) {
    if (user.family_name) {
      user.lastName = user.family_name;
      delete user.family_name;
    }
    if (user.given_name) {
      user.firstName = user.given_name;
      delete user.given_name;
    }
    if (user.preferred_username) {
      user.username = user.preferred_username;
      delete user.preferred_username;
    }
    if (user.user_id) {
      user.id = user.user_id;
      delete user.user_id;
    }
    if (user.sub) {
      user.id = user.sub;
      delete user.sub;
    }
  }

  return user;
};

const INITIAL_USER = {
  id: '',
  username: '',
  firstName: '',
  lastName: '',
  email: '',
};

export default function createAuthStore() {
  const initialState = {
    user: INITIAL_USER,
    permissions: {},
    session: {},
    authenticated: false,
    config: {},
  };

  const getters = {
    getUser(state) {
      return state.user;
    },
    isAuthenticated(state) {
      return state.authenticated;
    },
    getSession(state) {
      return state.session;
    },
    getConfig(state) {
      return state.config;
    },
    getPermissions(state) {
      return state.permissions;
    },
    ability() {
      return new Ability([], {
        anyAction: 'admin',
        anySubjectType: 'All',
        resolveAction,
      });
    },
  };

  const actions = {
    // fetches the userinfo endpoint at idp via backend
    async loadUser({ commit }) {
      try {
        const userinfo = await oauthClient.getUserInformation();
        if (userinfo) {
          commit('SET_USER', userinfo);
        }
      } catch (e) {
        throw new Error(e);
      }
    },

    // update the user information in store
    async updateUser({ commit, state }, user) {
      try {
        await api.updateUser(state.user.id, user);
        commit('UPDATE_USER', user);
      } catch (e) {
        throw new Error(e);
      }
    },
  };

  const mutations = {
    SET_USER(state, value) {
      const user = standardizeUser(value);
      if (user) {
        state.authenticated = true;
        state.user = { ...state.user, ...user };
      } else {
        state.authenticated = false;
        state.user = INITIAL_USER;
      }
    },
    UPDATE_USER(state, value) {
      state.authenticated = true;
      state.user = { ...state.user, ...value };
    },
    SET_SESSION(state, session) {
      state.session = session;
    },
    SET_CONFIG(state, config) {
      state.config = config;
    },
    SET_PERMISSIONS(state, value) {
      if (value) {
        mergeIntoObject(state.permissions, value, true, false);
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
