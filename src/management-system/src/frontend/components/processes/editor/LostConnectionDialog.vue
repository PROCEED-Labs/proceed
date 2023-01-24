<template>
  <popup :popupData="connectionWarningData" :centered="false" />
</template>
<script>
import AlertWindow from '@/frontend/components/universal/Alert.vue';

import { eventHandler } from '@/frontend/backend-api/index.js';

export default {
  components: { popup: AlertWindow },
  props: {
    process: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      connectionLostCallback: null,
      connectionRecoveredCallback: null,

      connectionWarningData: {
        body: '',
        display: 'none',
        color: 'error',
      },
    };
  },
  methods: {
    onConnectionLost() {
      if (this.process.shared) {
        this.connectionWarningData.body =
          'You seem to have lost connection to the server. You will not be able to edit the process anymore and will get the latest updates once you are back online';
        this.connectionWarningData.color = 'error';
      } else {
        this.connectionWarningData.body =
          "You seem to have lost connection to the server. You are still able to edit this process since it is not shared. You won't be able to edit shared processes.";
        this.connectionWarningData.color = 'primary';
      }

      this.connectionWarningData.display = 'block';
    },

    onConnectionRegained() {
      this.connectionWarningData.body =
        'You have regained a connection to the server. You will now be able to edit shared processes and will get the latest updates when they are change by others';
      this.connectionWarningData.color = 'success';
      this.connectionWarningData.display = 'block';
    },
  },
  mounted() {
    this.connectionLostCallback = eventHandler.on('connectionLost', async () => {
      this.$store.commit('processEditorStore/setLostConnection', true);

      this.onConnectionLost();

      // disabled editing if the process is shared
      if (this.process.shared) {
        this.$store.commit('processEditorStore/setEditingDisabled', true);
      }
    });

    this.connectionRecoveredCallback = eventHandler.on('reconnected', async () => {
      // get the newest version of the process if it was a shared process
      if (this.process.shared) {
        this.$store.dispatch('processEditorStore/loadProcessFromStore', {
          process: this.process,
          version: this.process.version,
          subprocessId: this.process.subprocessId,
        });
      }

      this.$store.commit('processEditorStore/setLostConnection', false);

      // check if editing can be enabled (might still be blocked for other reasons)
      this.$store.dispatch('processEditorStore/tryEnableEditing');

      this.onConnectionRegained();
    });
  },
  beforeDestroy() {
    if (this.connectionLostCallback) {
      eventHandler.off('connectionLost', this.connectionLostCallback);
      this.connectionLostCallback = null;
    }
    if (this.connectionRecoveredCallback) {
      eventHandler.off('reconnected', this.connectionRecoveredCallback);
      this.connectionRecoveredCallback = null;
    }
  },
};
</script>
