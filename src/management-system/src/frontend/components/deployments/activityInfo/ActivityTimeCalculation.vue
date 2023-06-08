<template>
  <div>
    <v-row dense class="mb-6">
      <v-col :cols="size === 'large' ? 4 : 6">
        <v-row dense>
          <v-col cols="auto">
            <span class="text-subtitle-2 font-weight-medium">
              <v-icon left>mdi-clock</v-icon>Started:
            </span>
          </v-col>
          <v-col>
            {{ start ? start.toLocaleString('en-US', location) : null }}
          </v-col>
        </v-row>
      </v-col>
      <v-col :cols="size === 'large' ? 4 : 6">
        <v-row dense>
          <v-col cols="auto">
            <span class="text-subtitle-2 font-weight-medium">
              <v-icon left>mdi-clock-outline</v-icon>Planned Start:
            </span>
          </v-col>
          <v-col>
            {{ plannedStart ? plannedStart.toLocaleString('en-US', location) : null }}
          </v-col>
        </v-row>
      </v-col>
      <v-col
        :cols="size === 'large' ? 4 : 6"
        :class="startDelay ? 'red--text text--lighten-2' : ''"
      >
        <v-row dense>
          <v-col cols="auto">
            <span class="text-subtitle-2 font-weight-medium">
              <v-icon :color="startDelay ? 'red lighten-2' : ''" left
                >mdi-clock-alert-outline</v-icon
              >Delay:
            </span>
          </v-col>
          <v-col>
            {{ startDelay }}
          </v-col>
        </v-row>
      </v-col>
    </v-row>
    <v-row dense class="mb-6">
      <v-col :cols="size === 'large' ? 4 : 6">
        <v-row dense>
          <v-col cols="auto">
            <span class="text-subtitle-2 font-weight-medium">
              <v-icon left>mdi-clock</v-icon>Duration:
            </span>
          </v-col>
          <v-col>
            {{ duration ? transformMilisecondsToTimeFormat(duration) : null }}
          </v-col>
        </v-row>
      </v-col>
      <v-col :cols="size === 'large' ? 4 : 6">
        <v-row dense>
          <v-col cols="auto">
            <span class="text-subtitle-2 font-weight-medium">
              <v-icon left>mdi-clock-outline</v-icon>Planned Duration:
            </span>
          </v-col>
          <v-col>
            {{ plannedDuration ? transformMilisecondsToTimeFormat(plannedDuration) : null }}
          </v-col>
        </v-row>
      </v-col>
      <v-col
        :cols="size === 'large' ? 4 : 6"
        :class="durationDelay ? 'red--text text--lighten-2' : ''"
      >
        <v-row dense>
          <v-col cols="auto">
            <span class="text-subtitle-2 font-weight-medium">
              <v-icon :color="durationDelay ? 'red lighten-2' : ''" left
                >mdi-clock-alert-outline</v-icon
              ><span>Delay:</span>
            </span>
          </v-col>
          <v-col>
            <span>{{ durationDelay }}</span>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
    <v-row dense>
      <v-col :cols="size === 'large' ? 4 : 6">
        <v-row dense>
          <v-col cols="auto">
            <span class="text-subtitle-2 font-weight-medium">
              <v-icon left>mdi-clock</v-icon>Ended:
            </span>
          </v-col>
          <v-col>
            {{ end ? end.toLocaleString('en-US', location) : null }}
          </v-col>
        </v-row>
      </v-col>
      <v-col :cols="size === 'large' ? 4 : 6">
        <v-row dense>
          <v-col cols="auto">
            <span class="text-subtitle-2 font-weight-medium">
              <v-icon left>mdi-clock-outline</v-icon>Planned End:
            </span>
          </v-col>
          <v-col>
            {{ plannedEnd ? plannedEnd.toLocaleString('en-US', location) : null }}
          </v-col>
        </v-row>
      </v-col>
      <v-col :cols="size === 'large' ? 4 : 6" :class="endDelay ? 'red--text text--lighten-2' : ''">
        <v-row dense>
          <v-col cols="auto">
            <span class="text-subtitle-2 font-weight-medium">
              <v-icon :color="endDelay ? 'red lighten-2' : ''" left>mdi-clock-alert-outline</v-icon
              >Delay:
            </span>
          </v-col>
          <v-col>
            {{ endDelay }}
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </div>
</template>
<script>
import { convertISODurationToMiliseconds } from '@proceed/bpmn-helper';
export default {
  props: {
    instance: Object,
    selectedElement: Object,
    location: Object,
    metaData: Object,
    size: { type: String, default: 'large' },
  },
  components: {},
  methods: {
    transformMilisecondsToTimeFormat(timeInMiliseconds) {
      let miliseconds = timeInMiliseconds;
      if (miliseconds > 0) {
        const days = Math.floor(miliseconds / (3600000 * 24));
        miliseconds -= days * (3600000 * 24);
        const hours = Math.floor(miliseconds / 3600000);
        miliseconds -= hours * 3600000;
        // Minutes part from the difference
        const minutes = Math.floor(miliseconds / 60000);
        miliseconds -= minutes * 60000;
        //Seconds part from the difference
        const seconds = Math.floor(miliseconds / 1000);
        miliseconds -= seconds * 1000;

        // Will display time in 10:30:23 format
        return `${days} Days, ${hours}h, ${minutes}min, ${seconds}s`;
      }
      return null;
    },
  },
  computed: {
    isRootElement() {
      return this.selectedElement && this.selectedElement.type === 'bpmn:Process';
    },
    plannedEnd() {
      if (this.selectedElement && this.metaData) {
        if (this.metaData.timePlannedEnd) {
          return new Date(this.metaData.timePlannedEnd);
        } else if (this.metaData.timePlannedOccurrence && this.metaData.plannedDuration) {
          const calculatedEndTime = new Date(this.plannedStart.getTime() + this.plannedDuration);
          return calculatedEndTime;
        }
      }
      return null;
    },
    plannedStart() {
      if (this.selectedElement && this.metaData) {
        if (this.metaData.timePlannedOccurrence) {
          return new Date(this.metaData.timePlannedOccurrence);
        } else if (this.metaData.timePlannedEnd && this.metaData.timePlannedDuration) {
          const calculatedStartTime = new Date(this.plannedEnd.getTime() - this.plannedDuration);
          return calculatedStartTime;
        }
      }
      return null;
    },
    plannedDuration() {
      if (this.selectedElement && this.metaData) {
        if (this.metaData.timePlannedDuration) {
          const plannedDurationInMs = convertISODurationToMiliseconds(
            this.metaData.timePlannedDuration
          );
          return plannedDurationInMs;
        } else if (this.metaData.timePlannedOccurrence && this.metaData.timePlannedEnd) {
          const calculatedDuration = this.plannedEnd.getTime() - this.plannedStart.getTime();
          return calculatedDuration;
        }
      }
      return null;
    },
    start() {
      if (this.isRootElement && this.instance) {
        return new Date(this.instance.globalStartTime);
      } else if (this.selectedElement && this.instance) {
        const elementInfo = this.instance.log.find(
          (l) => l.flowElementId == this.selectedElement.id
        );
        if (elementInfo) {
          return new Date(elementInfo.startTime);
        } else {
          const tokenInfo = this.instance.tokens.find(
            (l) => l.currentFlowElementId == this.selectedElement.id
          );
          return tokenInfo ? new Date(tokenInfo.currentFlowElementStartTime) : null;
        }
      }
      return null;
    },
    end() {
      if (this.isRootElement && this.instance) {
        const isEnded = this.instance.instanceState.every(
          (state) =>
            state !== 'RUNNING' &&
            state !== 'READY' &&
            state !== 'DEPLOYMENT-WAITING' &&
            state !== 'PAUSING' &&
            state !== 'PAUSED'
        );
        if (isEnded) {
          const lastLogEntry = this.instance.log[this.instance.log.length - 1];
          return new Date(lastLogEntry.endTime);
        }
      } else if (this.selectedElement && this.instance) {
        const elementInfo = this.instance.log.find(
          (l) => l.flowElementId == this.selectedElement.id
        );
        return elementInfo ? new Date(elementInfo.endTime) : null;
      }
      return null;
    },
    duration() {
      if (this.start) {
        const endTime = this.end || new Date();
        return endTime.getTime() - this.start.getTime();
      }
      return null;
    },
    startDelay() {
      if (this.plannedStart) {
        const startTime = this.start ? this.start.getTime() : new Date();
        const plannedStartTimeDifference = startTime - this.plannedStart.getTime();
        // only show delay if difference to planned start is at least one second
        return plannedStartTimeDifference >= 1000
          ? this.transformMilisecondsToTimeFormat(plannedStartTimeDifference)
          : null;
      }
      return null;
    },
    durationDelay() {
      if (this.plannedDuration && this.duration) {
        const plannedDurationDifference = this.duration - this.plannedDuration;
        // only show delay if difference to planned duration is at least one second
        return plannedDurationDifference >= 1000
          ? this.transformMilisecondsToTimeFormat(plannedDurationDifference)
          : null;
      }
      return null;
    },
    endDelay() {
      if (this.plannedEnd) {
        const endTime = this.end ? this.end.getTime() : new Date();
        const plannedEndTimeDifference = endTime - this.plannedEnd.getTime();
        // only show delay if difference to planned end is at least one second
        return plannedEndTimeDifference >= 1000
          ? this.transformMilisecondsToTimeFormat(plannedEndTimeDifference)
          : null;
      }
      return null;
    },
  },
};
</script>
