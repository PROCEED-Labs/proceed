<template>
  <toolbar-group>
    <v-toolbar-title>
      {{ title }}
    </v-toolbar-title>

    <slot></slot>

    <v-divider vertical inset />
    <toolbar-menu
      v-model="selectedColorMode"
      :items="colorModeItems"
      itemTextattribute="text"
      hideSelectedText
    >
      <template #open-hint>
        <span>
          <v-row class="mb-n3">
            <v-col>Process Colors: the original colors of the bpmn diagram</v-col>
          </v-row>
          <v-row class="mb-n3">
            <v-col
              >No Colors: all activities are white, only the tokens show the current execution
              progress</v-col
            >
          </v-row>
          <v-row class="mb-n3">
            <v-col
              >Time Colors: show the progress of each activity depending on their planned start and
              duration
              <ul>
                <li>White: the activity has no planned duration</li>
                <li>
                  Green: the activity was either completed or less than 70% of the planned duration
                  has passed
                </li>
                <li>Orange: there is less than 30% of the planned duration left</li>
                <li>Red: the planned duration has been exceeded</li>
              </ul>
            </v-col>
          </v-row>
          <v-row class="mb-n1">
            <v-col
              >Execution Colors: show the state of an already executed activity
              <ul>
                <li>White: the activity was not executed yet</li>
                <li>Green: the activity was executed successfully</li>
                <li v-if="showInstanceRecoveryFeature">
                  Green-Yellow: the activity was executed successfully after its execution had been
                  interrupted
                </li>
                <li>Red: the activity could not be executed successfully</li>
              </ul>
            </v-col>
          </v-row>
        </span>
      </template>
      <template #open-icon>mdi-palette-outline</template>
    </toolbar-menu>
    <embed-config v-if="isServer && instanceId" :instanceId="instanceId" />
  </toolbar-group>
</template>

<script>
import ToolbarGroup from '@/frontend/components/universal/toolbar/ToolbarGroup.vue';
import ToolbarMenu from '@/frontend/components/universal/toolbar/ToolbarMenu.vue';

import EmbedConfig from './EmbedConfigurator.vue';

import { interruptedInstanceRecovery } from '../../../../../../FeatureFlags';

export default {
  components: {
    ToolbarGroup,
    ToolbarMenu,
    EmbedConfig,
  },
  props: {
    title: {
      type: String,
      required: true,
    },
    instance: {
      type: Object,
    },
  },
  data() {
    return {
      showInstanceRecoveryFeature: interruptedInstanceRecovery,
    };
  },
  computed: {
    colorModeItems() {
      const allItems = [
        { value: 'processColors', text: 'Process Colors' },
        { value: 'noColors', text: 'No Colors' },
        { value: 'timeColors', text: 'Time Colors' },
        { value: 'executionColors', text: 'Execution Colors' },
      ];

      if (!this.instance) {
        return allItems.slice(0, 2);
      }

      return allItems;
    },
    selectedColorMode: {
      get() {
        const type = this.$store.getters['userPreferencesStore/getExecutionColorMode'];
        return this.colorModeItems.find((mode) => mode.value === type);
      },
      set(newValue) {
        this.$store.dispatch('userPreferencesStore/setExecutionColorMode', newValue.value);
      },
    },
    instanceId() {
      if (this.instance) {
        return this.instance.processInstanceId;
      }

      return undefined;
    },
    isServer() {
      return !process.env.IS_ELECTRON;
    },
  },
};
</script>
<style scoped>
.v-divider--vertical.v-divider--inset {
  margin-left: 8px;
  margin-right: 8px;
}
</style>
