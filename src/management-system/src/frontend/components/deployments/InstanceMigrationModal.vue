<template>
  <v-dialog :value="show" max-width="98%" max-height="98%" persistent>
    <v-card v-if="show" style="height: 90vh">
      <hovering-toolbar>
        <toolbar-group>
          <v-toolbar-title> Migrate Instances </v-toolbar-title>
          <v-divider vertical inset />
          <span>Version: {{ sourceVersion.versionName }}</span>
          <tooltip-button
            color="success"
            v-if="selectedTargetVersion && selectedInstances.length"
            @click.stop="migrate"
          >
            <template #tooltip-text>Apply Migration</template>
            mdi-send-circle-outline
          </tooltip-button>
        </toolbar-group>
        <v-spacer />
        <toolbar-group>
          <v-select
            dense
            v-model="selectedTargetVersion"
            :items="selectableVersions"
            item-value="version"
            item-text="versionName"
            placeholder="Select a target version"
            hide-details
            :menu-props="{ offsetY: true }"
          >
            <template #selection="{ item, index }">
              <span v-if="index === 0">{{ item.versionName }}</span>
            </template>
            <template #message></template>
          </v-select>
        </toolbar-group>
        <toolbar-group>
          <v-select
            dense
            v-model="selectedInstances"
            :items="selectableInstances"
            item-value="processInstanceId"
            placeholder="Select the instances to migrate"
            multiple
            hide-details
            :menu-props="{ offsetY: true }"
            style="width: auto"
          >
            <template #selection="{ index }">
              <span v-if="index === 0"> {{ selectedInstances.length }} selected </span>
            </template>
            <template #message></template>
          </v-select>
        </toolbar-group>
        <toolbar-group>
          <tooltip-button @click.stop="$emit('close')">
            <template #tooltip-text>Close</template>
            mdi-close-circle-outline
          </tooltip-button>
        </toolbar-group>
      </hovering-toolbar>
      <v-card-text style="height: 100%; padding: 0">
        <v-container style="height: 100%; width: 100%; max-width: 100%">
          <v-row style="height: 100%">
            <v-col>
              <bpmn-wrapper
                v-if="sourceXml"
                viewerMode="navigated-viewer"
                :xml="sourceXml"
                @element:click="handleSourceClick"
              >
              </bpmn-wrapper>
            </v-col>
            <v-divider vertical></v-divider>
            <v-col>
              <bpmn-wrapper
                v-if="targetXml"
                viewerMode="navigated-viewer"
                :xml="targetXml"
                :flowElementsStyling="flowElementsStyling"
                @element:click="handleTargetClick"
              >
              </bpmn-wrapper>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
<script>
import HoveringToolbar from '@/frontend/components/universal/toolbar/HoveringToolbar.vue';
import ToolbarGroup from '@/frontend/components/universal/toolbar/ToolbarGroup.vue';
import TooltipButton from '@/frontend/components/universal/TooltipButton.vue';

import BpmnWrapper from '@/frontend/components/bpmn/BpmnJsWrapper.vue';

import { engineNetworkInterface } from '@/frontend/backend-api/index.js';

import { getAllBpmnFlowElements } from '@proceed/bpmn-helper';

export default {
  components: {
    BpmnWrapper,
    HoveringToolbar,
    ToolbarGroup,
    TooltipButton,
  },
  props: {
    show: {
      type: Boolean,
      required: true,
    },
    deployment: {
      type: Object,
    },
    sourceVersion: {
      type: Object,
    },
    versions: {
      type: Array,
    },
    selectableInstances: {
      type: Array,
    },
  },
  computed: {
    selectableVersions() {
      if (!this.versions || !this.sourceVersion) return [];

      return this.versions.filter(({ version }) => version !== this.sourceVersion.version);
    },
    flowElementsStyling() {
      if (this.selectedSourceElement && this.flowElementMapping) {
        if (this.flowElementMapping[this.selectedSourceElement.id]) {
          return this.flowElementMapping[this.selectedSourceElement.id].map((target) => ({
            elementId: target,
            color: 'green',
          }));
        }
      }

      return [];
    },
    selectedTargetVersionInfo() {
      if (!this.selectedTargetVersion) {
        return undefined;
      }

      return this.selectableVersions.find(({ version }) => version === this.selectedTargetVersion);
    },
  },
  data() {
    return {
      selectedInstances: [],
      selectedTargetVersion: null,

      sourceXml: null,
      targetXml: null,

      flowElementMapping: {},

      sourceFlowElements: [],
      targetFlowElements: [],

      selectedSourceElement: null,
    };
  },
  methods: {
    handleSourceClick({ element }) {
      if (element.type === 'bpmn:Process') {
        this.selectedSourceElement = null;
      } else {
        this.selectedSourceElement = element;
      }
    },
    handleTargetClick({ element }) {
      if (element.type === 'bpmn:Process') return;

      if (this.selectedSourceElement && this.flowElementMapping[this.selectedSourceElement.id]) {
        // add the element if it was not yet selected else remove it
        const targets = this.flowElementMapping[this.selectedSourceElement.id];
        if (targets.includes(element.id)) {
          this.flowElementMapping[this.selectedSourceElement.id] = targets.filter(
            (el) => el !== element.id,
          );
        } else {
          targets.push(element.id);
        }
      }
    },
    async migrate() {
      await engineNetworkInterface.migrateInstances(
        this.deployment.definitionId,
        this.sourceVersion.version,
        this.selectedTargetVersion,
        this.selectedInstances,
        { flowElementMapping: this.flowElementMapping },
      );

      this.$emit(
        'done',
        this.selectableVersions.find(({ version }) => version === this.selectedTargetVersion),
      );
      this.$emit('close');
    },
  },
  watch: {
    show() {
      this.selectedInstances = [];
      this.selectedTargetVersion = null;
      this.flowElementMapping = {};
    },
    sourceVersion: {
      async handler(newVersion) {
        if (newVersion) {
          this.sourceXml = this.sourceVersion.bpmn;

          this.sourceFlowElements = await getAllBpmnFlowElements(this.sourceXml);
        }
      },
      immediate: true,
    },
    async selectedTargetVersionInfo(newVersionInfo) {
      if (newVersionInfo) {
        this.targetXml = newVersionInfo.isLocal
          ? await this.$store.getters['processStore/xmlByVersion'](
              this.deployment.definitionId,
              newVersionInfo.version,
            )
          : newVersionInfo.bpmn;

        this.targetFlowElements = await getAllBpmnFlowElements(this.targetXml);

        this.flowElementMapping = this.sourceFlowElements.reduce((curr, sElement) => {
          // map every flow element that still exists to itself
          if (this.targetFlowElements.some((tElement) => tElement.id === sElement.id)) {
            curr[sElement.id] = [sElement.id];
          } else {
            curr[sElement.id] = [];
          }

          return curr;
        }, {});
      }
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
