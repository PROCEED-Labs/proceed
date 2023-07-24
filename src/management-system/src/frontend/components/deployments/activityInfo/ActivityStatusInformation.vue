<template>
  <v-container>
    <v-row class="mb-6" :justify="currentImage ? 'center' : 'start'">
      <v-col :cols="size === 'large' ? 4 : 8" v-if="currentImage">
        <v-img height="170" style="border-style: solid" :src="currentImage"></v-img>
      </v-col>
      <v-col :cols="size === 'large' ? 8 : 12">
        <v-row class="mt-n4" align="center" v-if="instance">
          <v-col cols="6">
            <span class="text-subtitle-1 font-weight-medium">Current state:</span>
          </v-col>
          <v-col cols="5">
            <v-alert dense :type="statusType" text class="my-0">
              {{ statusText }}
            </v-alert>
          </v-col>
          <v-col cols="1">
            <v-icon v-if="elementIsActive" @click="settingState = true" dense>mdi-pencil</v-icon>
          </v-col>
        </v-row>
        <v-row class="mt-n4" align="center" v-if="!isRootElement">
          <v-col cols="6">
            <span class="text-subtitle-1 font-weight-medium">External:</span>
          </v-col>
          <v-col cols="6">
            <v-simple-checkbox disabled :value="isExternal"></v-simple-checkbox>
          </v-col>
        </v-row>
        <v-row class="mt-n4" v-if="instance && !isRootElement && currentProgress">
          <v-col cols="6"><span class="text-subtitle-1 font-weight-medium">Progress:</span></v-col>
          <v-col cols="6">
            <progress-setter
              :readOnly="!elementIsActive"
              :initialProgress="currentProgress"
              @submitProgress="setProgress"
            ></progress-setter>
          </v-col>
        </v-row>
        <v-row class="mt-n4" align="center" v-if="isUserTask">
          <v-col cols="6"><span class="text-subtitle-1 font-weight-medium">Priority:</span></v-col>
          <v-col cols="4">
            <v-text-field
              v-if="settingPriority"
              ref="priority"
              type="number"
              min="0"
              max="10"
              :value="priority"
              :rules="[inputRules.valueBetween1And10]"
              autofocus
              dense
              @blur="setPriority($event.target.value)"
            />
            <div v-else>
              <span v-if="priority" class="text-subtitle-1 font-weight-medium mr-2"
                >{{ priority }}
              </span>
              <v-icon v-if="elementIsActive" dense class="mb-1" @click="settingPriority = true"
                >mdi-pencil</v-icon
              >
            </div>
          </v-col>
        </v-row>
        <v-row class="mt-n4">
          <v-col cols="6"
            ><span class="text-subtitle-1 font-weight-medium">Planned Costs:</span></v-col
          >
          <v-col cols="6">
            <span class="text-subtitle-1 font-weight-medium">{{ costsPlanned }}</span></v-col
          >
        </v-row>
        <v-row class="mt-n4" align="center" v-if="instance && !isRootElement">
          <v-col cols="6"
            ><span class="text-subtitle-1 font-weight-medium">Real Costs:</span></v-col
          >
          <v-col cols="4">
            <v-text-field
              v-if="settingRealCosts"
              :value="realCosts"
              :prefix="costsCurrency.symbol"
              autofocus
              dense
              hide-details
              @blur="setRealCosts($event.target.value)"
            ></v-text-field>
            <div v-else>
              <span v-if="realCosts" class="text-subtitle-1 font-weight-medium mr-2"
                >{{ realCosts }}{{ costsCurrency.symbol }}
              </span>
              <v-icon v-if="elementIsActive" dense class="mb-1" @click="settingRealCosts = true"
                >mdi-pencil</v-icon
              >
            </div>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
    <v-row class="mb-6">
      <v-col :cols="size === 'large' ? 4 : 12"
        ><span class="text-subtitle-1 font-weight-medium">Documentation:</span></v-col
      >
      <v-col :cols="size === 'large' ? 8 : 12"
        ><span class="text-subtitle-1 font-weight-medium">{{ documentation }}</span></v-col
      >
    </v-row>
    <activity-time-calculation
      :instance="instance"
      :location="location"
      :selectedElement="selectedElement"
      :metaData="metaData"
      :size="size"
    />
    <v-row>
      <v-col>
        <slot name="process-preview"></slot>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import ActivityTimeCalculation from '@/frontend/components/deployments/activityInfo/ActivityTimeCalculation.vue';
import ProgressSetter from '@/frontend/components/deployments/activityInfo/ProgressSetter.vue';
import { engineNetworkInterface } from '@/frontend/backend-api/index.js';
import { statusToType } from '@/frontend/helpers/instance-information';
import { getDocumentation } from '@/frontend/helpers/bpmn-modeler-events/getters.js';
import { processInterface } from '@/frontend/backend-api/index.js';

export default {
  components: { ActivityTimeCalculation, ProgressSetter },
  props: {
    metaData: Object,
    instance: Object,
    deployment: Object,
    selectedElement: Object,
    title: String,
    location: Object,
    milestones: Array,
    size: { type: String, default: 'large' },
  },
  data() {
    return {
      settingRealCosts: false,
      settingPriority: false,
      settingState: false,
      currentImage: null,
      inputRules: {
        valueBetween1And10: (value) =>
          !value || (value >= 1 && value <= 10) || 'Priority must be between 1 and 10',
      },
    };
  },
  computed: {
    processDefinitionsId() {
      return this.$router.currentRoute.params.id;
    },
    processIsShared() {
      return this.$store.getters['processStore/processById'](this.processDefinitionsId).shared;
    },
    isRootElement() {
      return this.selectedElement && this.selectedElement.type === 'bpmn:Process';
    },
    isUserTask() {
      return this.selectedElement && this.selectedElement.type === 'bpmn:UserTask';
    },
    elementIsActive() {
      if (this.instance) {
        const elementToken = this.instance.tokens.find(
          (l) => l.currentFlowElementId == this.selectedElement.id
        );

        if (elementToken) {
          const activeStates = [
            'PAUSED',
            'RUNNING',
            'READY',
            'ACTIVE',
            'DEPLOYMENT-WAITING',
            'WAITING',
          ];
          const elementIsActive = activeStates.includes(elementToken.currentFlowNodeState);
          return elementIsActive;
        }
      }
      return false;
    },
    documentation() {
      return getDocumentation(this.selectedElement);
    },
    statusText() {
      if (this.isRootElement && this.instance) {
        return this.instance.instanceState[0];
      } else if (this.selectedElement && this.instance) {
        const elementInfo = this.instance.log.find(
          (l) => l.flowElementId == this.selectedElement.id
        );
        if (elementInfo) {
          return elementInfo.executionState;
        } else {
          const tokenInfo = this.instance.tokens.find(
            (l) => l.currentFlowElementId == this.selectedElement.id
          );
          return tokenInfo ? tokenInfo.currentFlowNodeState : 'WAITING';
        }
      }
      return null;
    },
    statusType() {
      return statusToType(this.statusText.toUpperCase());
    },
    isExternal() {
      return (
        this.selectedElement &&
        this.selectedElement.businessObject &&
        this.selectedElement.businessObject.external
      );
    },
    costsCurrency() {
      const environmentConfigSettings = this.$store.getters['environmentConfigStore/settings'];
      return environmentConfigSettings.currency;
    },
    priority() {
      if (this.instance) {
        const token = this.instance.tokens.find(
          (l) => l.currentFlowElementId == this.selectedElement.id
        );

        const logInfo = this.instance.log.find(
          (logEntry) => logEntry.flowElementId === this.selectedElement.id
        );

        if (token) {
          return token.priority;
        } else if (logInfo) {
          return logInfo.priority;
        }
      } else {
        const priority = this.metaData['defaultPriority'];
        return priority;
      }
      return null;
    },
    costsPlanned() {
      const costsValue = this.metaData['costsPlanned'];
      if (costsValue) {
        return `${costsValue}${this.costsCurrency.symbol}`;
      }
      return '';
    },
    realCosts() {
      const token = this.instance.tokens.find(
        (l) => l.currentFlowElementId == this.selectedElement.id
      );

      const logInfo = this.instance.log.find(
        (logEntry) => logEntry.flowElementId === this.selectedElement.id
      );

      if (token) {
        return token.costsRealSetByOwner;
      } else if (logInfo) {
        return logInfo.costsRealSetByOwner;
      }
      return null;
    },
    currentProgress() {
      const token = this.instance.tokens.find(
        (l) => l.currentFlowElementId == this.selectedElement.id
      );

      const logInfo = this.instance.log.find(
        (logEntry) => logEntry.flowElementId === this.selectedElement.id
      );

      if (token && token.currentFlowNodeProgress) {
        let milestoneCalculatedProgress = 0;
        if (token.milestones && Object.keys(token.milestones).length > 0) {
          const milestoneProgressValues = Object.values(token.milestones);
          milestoneCalculatedProgress =
            milestoneProgressValues.reduce((acc, milestoneVal) => acc + milestoneVal) /
            milestoneProgressValues.length;
        }

        return {
          ...token.currentFlowNodeProgress,
          milestoneCalculatedProgress,
        };
      } else if (logInfo) {
        return logInfo.progress;
      }
      return 0;
    },
  },
  methods: {
    async updateToken(updatedInfoObj) {
      const token = this.instance.tokens.find(
        (l) => l.currentFlowElementId == this.selectedElement.id
      );

      if (token) {
        await engineNetworkInterface.updateToken(
          this.deployment.definitionId,
          this.instance.processInstanceId,
          token.tokenId,
          updatedInfoObj
        );
      }
    },
    async setRealCosts(costs) {
      this.settingRealCosts = false;
      await this.updateToken({ costsRealSetByOwner: costs });
    },
    async setPriority(newPriority) {
      this.settingPriority = false;
      const valid = this.$refs['priority'].validate();
      if (valid && newPriority) {
        await this.updateToken({ priority: parseInt(newPriority) });
      }
    },
    async setProgress(newProgress) {
      const token = this.instance.tokens.find(
        (l) => l.currentFlowElementId == this.selectedElement.id
      );

      if (token && newProgress.value === 100) {
        await this.updateToken({ currentFlowNodeProgress: newProgress });
        await engineNetworkInterface.completeUserTask(
          this.instance.processInstanceId,
          token.currentFlowElementId
        );
      }
    },
  },
  watch: {
    metaData: {
      async handler(newMetaData) {
        if (newMetaData.overviewImage && !this.processIsShared) {
          const imageFileName = newMetaData.overviewImage.split('/').pop();
          const localImage = await processInterface.getImage(
            this.processDefinitionsId,
            imageFileName
          );
          this.currentImage = localImage;
        } else if (newMetaData.overviewImage && this.processIsShared) {
          this.currentImage = newMetaData.overviewImage;
        } else {
          this.currentImage = null;
        }
      },
      immediate: true,
    },
  },
};
</script>

<style lang="scss" scoped></style>
