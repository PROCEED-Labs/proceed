import { defineRules } from '@/frontend/helpers/iam/permissions/casl-abilities.js';

const setAbilities = async (ability, store) => {
  const rules = store.getters['authStore/getPermissions']
    ? await defineRules(
        store.getters['authStore/getPermissions'],
        store.getters['authStore/getUser'].id,
        store.getters['authStore/getConfig'].useAuthorization
      )
    : [];
  ability.update(rules);
};

// runs everytime a commit to 'authStore/SET_PERMISSIONS' or 'authStore/SET_USER' happens
export default (store) => {
  const ability = store.getters['authStore/ability'];
  return store.subscribe(async (mutation) => {
    switch (mutation.type) {
      case 'authStore/SET_PERMISSIONS':
        await setAbilities(ability, store);
        break;
      case 'authStore/SET_USER':
        const isAuthenticated = store.getters['authStore/isAuthenticated'];
        await setAbilities(ability, store);
        await Promise.all([
          // store.dispatch('capabilityStore/loadCapabilities'),
          ability.can('view', 'Machine') ? store.dispatch('machineStore/loadMachines') : null,
          store.dispatch('configStore/loadConfig'),
          ability.can('view', 'EnvConfig')
            ? store.dispatch('environmentStore/loadEnvProfiles')
            : null,
          ability.can('view', 'EnvConfig')
            ? store.dispatch('environmentConfigStore/loadEnvironmentConfig')
            : null,
          store.dispatch('processStore/loadProcesses'),
          isAuthenticated || !store.getters['authStore/getConfig'].useAuthorization
            ? store.dispatch('userPreferencesStore/loadUserPreferences')
            : null,
          store.dispatch('deploymentStore/init'),
        ]);
        break;
      default:
        break;
    }
  });
};
