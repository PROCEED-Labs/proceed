import Vue from 'vue';
import axios from 'axios';
import App from './App.vue';
import Loading from './views/LoadingScreen.vue';
import router from './router.js';
import store from './store.js';
import vuetify from './plugins/vuetify.js';
import 'roboto-fontface/css/roboto/roboto-fontface.css';
import '@mdi/font/css/materialdesignicons.css';
import { engineInterface, eventHandler } from './backend-api/index.js';
import { abilitiesPlugin } from '@casl/vue';
import { oauthClient } from '@/frontend/backend-api/index.js';

const logging = {
  getLogger: () => ({
    log: console.log,
    debug: console.log,
    trace: console.log,
    error: console.error,
    info: console.log,
  }),
};

Vue.config.devtools = process.env.NODE_ENV === 'development';
Vue.http = axios;
Vue.prototype.$http = axios;
Vue.config.productionTip = false;

// export empty store object and wait for initialization of the engine to fill it
const dataStore = {};

// Displays loading screen and waits for engine to load before mounting the actual app
async function loadApp() {
  const response = await oauthClient.handleCallback();
  // display loading screen while engine is loading
  const loadingScreen = new Vue({
    render: (h) => h(Loading),
  }).$mount('#loading');

  await engineInterface.engineStarted;
  const publishing = await engineInterface.isEnginePublished();
  // make engine accessible in all components and views via this.$engine
  const engineWrapper = {
    publishing,
    changingState: false,
    async toggleSilentMode() {
      if (!this.changingState) {
        if (this.publishing) {
          await engineInterface.activateSilentMode();
        } else {
          await engineInterface.deactivateSilentMode();
        }
      }
    },
  };

  eventHandler.on('engineChangingState', () => {
    Vue.set(engineWrapper, 'changingState', true);
  });
  eventHandler.on('enginePublished', () => {
    Vue.set(engineWrapper, 'changingState', false);
    Vue.set(engineWrapper, 'publishing', true);
  });
  eventHandler.on('engineUnpublished', () => {
    Vue.set(engineWrapper, 'changingState', false);
    Vue.set(engineWrapper, 'publishing', false);
  });
  eventHandler.on('toggleSilentMode', () => {
    engineWrapper.toggleSilentMode();
  });

  // configStore needs a module of the engine so the engine has to be started
  // before we can initialize the store
  const VuexStore = await store();

  if (response.config) {
    VuexStore.commit('authStore/SET_CONFIG', response.config);
    Vue.prototype.$useAuthorization = response.config.useAuthorization;
    Vue.prototype.$useSessionManagement = response.config.useSessionManagement;
    Vue.prototype.$allowRegistrations = response.config.allowRegistrations;
  }

  // initialize casl ability instance
  Vue.use(abilitiesPlugin, VuexStore.getters['authStore/ability']);

  VuexStore.commit('authStore/SET_PERMISSIONS', response.permissions);
  VuexStore.commit('authStore/SET_USER', response.isLoggedIn ? response.user : null);

  // wait until store is filled with processes from backend
  await VuexStore.getters['processStore/initialized'];

  // make store accessible for all modules that import dataStore
  Object.keys(VuexStore).forEach((key) => {
    dataStore[key] = VuexStore[key];
  });

  const configObject = {
    moduleName: 'MS',
    consoleOnly: true,
  };
  // make logger accessible in all components and views via this.$logger
  const logger = await logging.getLogger(configObject);
  Vue.prototype.$logger = logger;

  // remove loading screen
  const { body } = document;
  const loadingScreenContainer = document.getElementById('loading-screen-container');
  body.removeChild(loadingScreenContainer);
  loadingScreen.$destroy();

  // display main app
  // variable 'app' is used for accessing the vue instance inside the console
  const app = new Vue({
    router,
    store: VuexStore,
    vuetify,
    render: (h) => h(App),
    data: {
      engine: engineWrapper,
    },
  }).$mount('#app');
}

loadApp();

export default dataStore;
