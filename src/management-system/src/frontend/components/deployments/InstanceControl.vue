<template>
  <toolbar-group v-if="instance">
    <popup :popupData="popupData" />
    <tooltip-button
      color="error"
      :loading="isStoppingInstance || showStopDialog"
      :disabled="!instanceIsRunning || engineOffline"
      @click.stop="showStopDialog = true"
    >
      <template #tooltip-text>
        {{ stopHints.tooltip }}
      </template>
      mdi-stop-circle-outline
    </tooltip-button>
    <tooltip-button
      color="success"
      :loading="isResumingInstance || showResumeDialog"
      :disabled="engineOffline"
      v-if="instanceIsPausing || instanceIsPaused"
      @click.stop="showResumeDialog = true"
    >
      <template #tooltip-text>{{ resumeHints.tooltip }}</template>
      mdi-play-circle-outline
    </tooltip-button>
    <tooltip-button
      color="warning"
      :loading="isPausingInstance || showPauseDialog"
      v-else
      :disabled="!instanceIsRunning || engineOffline"
      @click.stop="showPauseDialog = true"
    >
      <template #tooltip-text>{{ pauseHints.tooltip }}</template>
      mdi-pause-circle-outline
    </tooltip-button>
    <v-divider v-if="instanceIsPausing && !engineOffline" vertical inset />
    <div v-if="instanceIsPausing && !engineOffline" class="py-1">
      <v-progress-circular indeterminate color="black" size="28" width="2">
        <v-tooltip right>
          <template v-slot:activator="{ on }">
            <v-icon v-on="on" @click="resumeInstance()">mdi-close</v-icon>
          </template>
          Abort pausing
        </v-tooltip>
      </v-progress-circular>
      Pausing...
    </div>

    <confirmation
      :title="stopHints.title"
      :continueButtonText="stopHints.confirm"
      continueButtonColor="error"
      :show="showStopDialog"
      maxWidth="500px"
      @cancel="showStopDialog = false"
      @continue="stopInstance"
    >
      <div>
        Currently running Scripts can not be stopped, thus they are executed until their end.
      </div>
    </confirmation>

    <confirmation
      :title="pauseHints.title"
      :continueButtonText="pauseHints.confirm"
      continueButtonColor="primary"
      :show="showPauseDialog"
      maxWidth="500px"
      @cancel="showPauseDialog = false"
      @continue="pauseInstance"
    >
      <div>
        Hint: Currently running activities can not be paused. Therefore the {{ type }} is paused
        after the running activities finished their task.
      </div>
    </confirmation>

    <confirmation
      :title="resumeHints.title"
      :continueButtonText="resumeHints.confirm"
      continueButtonColor="primary"
      :show="showResumeDialog"
      maxWidth="500px"
      @cancel="showResumeDialog = false"
      @continue="resumeInstance"
    >
      <div>Paused tokens will resume at their current location.</div>
    </confirmation>
  </toolbar-group>
</template>
<script>
import AlertWindow from '@/frontend/components/universal/Alert.vue';
import ToolbarGroup from '@/frontend/components/universal/toolbar/ToolbarGroup.vue';
import TooltipButton from '@/frontend/components/universal/TooltipButton.vue';
import Confirmation from '@/frontend/components/universal/Confirmation.vue';

import { engineNetworkInterface } from '@/frontend/backend-api/index.js';

export default {
  components: { ToolbarGroup, TooltipButton, popup: AlertWindow, Confirmation },
  data() {
    return {
      activeStates: ['PAUSED', 'RUNNING', 'READY', 'DEPLOYMENT-WAITING', 'WAITING'],

      /** */
      isStoppingInstance: false,
      /** */
      isPausingInstance: false,
      /** */
      isResumingInstance: false,

      showPauseDialog: false,
      showResumeDialog: false,
      showStopDialog: false,

      popupData: {
        body: '',
        display: 'none',
        color: '',
      },
    };
  },
  props: {
    deployment: {
      type: Object,
      required: true,
    },
    instance: {
      type: Object,
      required: true,
    },
    isProject: {
      type: Boolean,
    },
    engineOffline: {
      type: Boolean,
    },
  },
  computed: {
    type() {
      return this.isProject ? 'project' : 'instance';
    },
    upperCaseType() {
      return this.type.charAt(0).toUpperCase() + this.type.slice(1);
    },
    /**
     * If the selected instance is currently running
     */
    instanceIsRunning() {
      if (this.instance) {
        return this.instance.instanceState.some((state) => this.activeStates.includes(state));
      } else {
        return false;
      }
    },
    instanceIsPausing() {
      if (this.instance) {
        return this.instance.instanceState.some((state) => state === 'PAUSING');
      } else {
        return false;
      }
    },
    instanceIsPaused() {
      if (this.instance) {
        return this.instance.instanceState.some((state) => state === 'PAUSED');
      } else {
        return false;
      }
    },

    stopHints() {
      return {
        success: this.type === 'instance' ? 'Stopped process instance' : 'Canceled project',
        error: `Error stopping the ${this.type}`,
        title: this.type === 'instance' ? 'stop the process instance' : 'cancel the project?',
        tooltip:
          this.type === 'instance'
            ? 'Stop instance'
            : this.engineOffline
            ? 'Project Engine is not reachable'
            : 'Cancel project',
        confirm: this.type === 'instance' ? 'Stop Instance' : `Cancel Project`,
      };
    },
    pauseHints() {
      return {
        success: `Paused ${this.type}`,
        error: `Error pausing the ${this.type}`,
        title: `pause the ${this.type}?`,
        tooltip: this.engineOffline ? 'Project Engine is not reachable' : `Pause ${this.type}`,
        confirm: `Pause ${this.upperCaseType}`,
      };
    },
    resumeHints() {
      return {
        success: `Resume ${this.type}`,
        error: `Error resuming the ${this.type}`,
        title: `resume the ${this.type}?`,
        tooltip: this.engineOffline ? 'Project Engine is not reachable' : `Resume ${this.type}`,
        confirm: `Resume ${this.upperCaseType}`,
      };
    },
  },
  methods: {
    /**
     * Stops the selected instance
     */
    async stopInstance() {
      this.showStopDialog = false;
      this.isStoppingInstance = true;
      try {
        await engineNetworkInterface.stopInstance(
          this.deployment.definitionId,
          this.instance.processInstanceId,
        );
        this.popupData.body = this.stopHints.success;
        this.popupData.color = 'primary';
      } catch (err) {
        this.popupData.body = this.stopHints.error;
        this.popupData.color = 'error';
        console.error(err);
      }
      this.isStoppingInstance = false;
      this.openPopup();
    },
    /**
     * Pauses the selected instance
     */
    async pauseInstance() {
      this.showPauseDialog = false;
      this.isPausingInstance = true;
      try {
        await engineNetworkInterface.pauseInstance(
          this.deployment.definitionId,
          this.instance.processInstanceId,
        );
        this.popupData.body = this.pauseHints.success;
        this.popupData.color = 'primary';
      } catch (err) {
        this.popupData.body = this.pauseHints.error;
        this.popupData.color = 'error';
        console.error(err);
      }
      this.isPausingInstance = false;
      this.openPopup();
    },
    /**
     * Resumes the selected instance
     */
    async resumeInstance() {
      this.showResumeDialog = false;
      this.isResumingInstance = true;
      try {
        await engineNetworkInterface.resumeInstance(
          this.deployment.definitionId,
          this.instance.processInstanceId,
        );
        this.popupData.body = this.resumeHints.success;
        this.popupData.color = 'primary';
      } catch (err) {
        this.popupData.body = this.resumeHints.error;
        this.popupData.color = 'error';
        console.error(err);
      }

      this.isResumingInstance = false;
      this.openPopup();
    },
    /** */
    openPopup(timeout) {
      this.popupData.display = 'block';
      setTimeout(() => {
        this.popupData.display = 'none';
      }, 3000);
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
