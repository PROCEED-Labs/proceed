import Vue from 'vue';
import Vuetify from 'vuetify/lib';

import ProcessIcon from '../icons/ProcessElementLogo.vue';
import ScriptIcon from '../icons/ScriptIcon.vue';

Vue.use(Vuetify);

export default new Vuetify({
  theme: {
    options: {
      customProperties: true,
    },
  },
  iconfont: 'mdi',
  icons: {
    values: {
      product: {
        component: ProcessIcon, // you can use string here if component is registered globally
      },
      scriptTask: {
        component: ScriptIcon,
      },
    },
  },
});
