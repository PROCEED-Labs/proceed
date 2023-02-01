<template>
  <v-container>
    <v-row v-if="instance" class="mb-6" justify="center">
      <v-col :cols="size === 'large' ? 4 : 8">
        <v-img
          v-if="image"
          height="170"
          class="mt-3"
          style="border-style: solid"
          :src="image"
        ></v-img>
      </v-col>
      <v-col :cols="size === 'large' ? 8 : 12">
        <v-row align="center">
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
        <v-row class="mt-n4" v-if="!isRootElement && currentProgress">
          <v-col cols="6"><span class="text-subtitle-1 font-weight-medium">Progress:</span></v-col>
          <v-col cols="6">
            <progress-setter
              :readOnly="!elementIsActive"
              :initialProgress="currentProgress"
              @submitProgress="setProgress"
            ></progress-setter>
          </v-col>
        </v-row>
        <v-row class="mt-n4" v-if="isUserTask">
          <v-col cols="6"><span class="text-subtitle-1 font-weight-medium">Priority:</span></v-col>
          <v-col cols="6">
            <span class="text-subtitle-1 font-weight-medium">{{ priority }}</span></v-col
          >
        </v-row>
        <v-row class="mt-n4">
          <v-col cols="6"
            ><span class="text-subtitle-1 font-weight-medium">Planned Costs:</span></v-col
          >
          <v-col cols="6">
            <span class="text-subtitle-1 font-weight-medium">{{ costsPlanned }}</span></v-col
          >
        </v-row>
        <v-row class="mt-n4" align="center" v-if="!isRootElement">
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
      settingState: false,
    };
  },
  computed: {
    isRootElement() {
      return this.selectedElement && this.selectedElement.type === 'bpmn:Process';
    },
    isUserTask() {
      return this.selectedElement && this.selectedElement.type === 'bpmn:UserTask';
    },
    elementIsActive() {
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
      return false;
    },
    image() {
      return this.metaData.overviewImage;
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
          return tokenInfo ? tokenInfo.state : 'WAITING';
        }
      }
      return null;
    },
    statusType() {
      return statusToType(this.statusText.toUpperCase());
    },
    costsCurrency() {
      const environmentConfigSettings = this.$store.getters['environmentConfigStore/settings'];
      return environmentConfigSettings.currency;
    },
    priority() {
      const priorityValue = this.metaData['priority'];
      return priorityValue || 1;
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
    async setRealCosts(costs) {
      this.settingRealCosts = false;
      const token = this.instance.tokens.find(
        (l) => l.currentFlowElementId == this.selectedElement.id
      );

      if (token) {
        engineNetworkInterface.updateToken(
          this.deployment.definitionId,
          this.instance.processInstanceId,
          token.tokenId,
          { costsRealSetByOwner: costs }
        );
      }
    },
    async setProgress(newProgress) {
      const token = this.instance.tokens.find(
        (l) => l.currentFlowElementId == this.selectedElement.id
      );

      if (token) {
        await engineNetworkInterface.updateToken(
          this.deployment.definitionId,
          this.instance.processInstanceId,
          token.tokenId,
          { currentFlowNodeProgress: newProgress }
        );

        if (newProgress.value === 100) {
          await engineNetworkInterface.completeUserTask(
            this.instance.processInstanceId,
            token.currentFlowElementId
          );
        }
      }
    },
  },
};
</script>

<style lang="scss" scoped></style>
