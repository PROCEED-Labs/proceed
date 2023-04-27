<template>
  <v-container>
    <p class="font-weight-medium">Messaging</p>
    <v-text-field
      label="Server Address"
      :disabled="editingDisabled"
      v-model="serverAddress"
      background-color="white"
      @blur="applyMessagingConfig"
      filled
    />
    <v-text-field
      label="Username"
      :disabled="editingDisabled"
      v-model="username"
      background-color="white"
      @blur="applyMessagingConfig"
      filled
    />
    <v-text-field
      label="Password"
      :disabled="editingDisabled"
      v-model="password"
      background-color="white"
      @blur="applyMessagingConfig"
      filled
    />
    <v-text-field
      label="Topic"
      :disabled="editingDisabled"
      v-model="topic"
      background-color="white"
      @blur="applyMessagingConfig"
      filled
    />
  </v-container>
</template>
<script>
import { getMessagingInfo } from '@/frontend/helpers/bpmn-modeler-events/getters.js';

export default {
  data() {
    return {
      serverAddress: '',
      username: '',
      password: '',
      topic: '',
    };
  },
  computed: {
    modeler() {
      return this.$store.getters['processEditorStore/modeler'];
    },
    selectedElement() {
      return this.$store.getters['processEditorStore/selectedElement'];
    },
    editingDisabled() {
      return this.$store.getters['processEditorStore/editingDisabled'];
    },
  },
  methods: {
    applyMessagingConfig() {
      this.modeler.get('customModeling').addMessagingInfo(this.selectedElement, {
        serverAddress: this.serverAddress,
        username: this.username,
        password: this.password,
        topic: this.topic,
      });
    },
  },
  watch: {
    modeler: {
      handler(newModeler) {
        if (newModeler) {
          newModeler
            .get('eventBus')
            .on('commandStack.element.updateProceedData.postExecute', ({ context }) => {
              const { elementId, messaging } = context;
              if (elementId === this.selectedElement.id && messaging) {
                // update the messaging data when it changes on the selected element
                this.serverAddress = messaging.serverAddress;
                this.username = messaging.username;
                this.password = messaging.password;
                this.topic = messaging.topic;
              }
            });
        }
      },
      immediate: true,
    },
    selectedElement: {
      handler(newSelection) {
        // re-initialize the messagingInfo
        if (newSelection || newSelection.type === 'bpmn:Process') {
          const { serverAddress, username, password, topic } = getMessagingInfo(newSelection);
          this.serverAddress = serverAddress;
          this.username = username;
          this.password = password;
          this.topic = topic;
        } else {
          this.serverAddress = '';
          this.username = '';
          this.password = '';
          this.topic = '';
        }
      },
      immediate: true,
    },
  },
};
</script>
