<template>
  <Confirmation
    :title="title"
    :loading="loading"
    customTitle
    :continueButtonText="btnTitle"
    continueButtonColor="primary"
    :continueButtonDisabled="!selectedOption"
    :show="show"
    maxWidth="500px"
    @cancel="$emit('cancel')"
    @continue="$emit('continue', exportOption)"
  >
    {{ text }}
    <v-container>
      <v-row>
        <v-col>
          <v-radio-group v-model="selectedOption" column>
            <v-radio
              v-for="option in options"
              :key="option.label"
              :label="option.label"
              :value="option"
            ></v-radio>
          </v-radio-group>
        </v-col>

        <v-col cols="1" v-bind:style="{ display: 'inline-block', textAlign: 'center' }"
          ><v-divider vertical></v-divider
        ></v-col>

        <v-col>
          <v-container>
            <v-checkbox
              v-if="isUserTaskVisible"
              v-model="additionalBpmn"
              :key="'withUserTasks'"
              :label="'with User Tasks'"
              :value="!additionalBpmn"
            >
            </v-checkbox>
            <v-checkbox
              v-if="isPDFTitleVisible"
              v-model="additionalPdf"
              :key="'pdfwh'"
              :label="'with Title'"
              :value="!additionalPdf"
            ></v-checkbox>

            <v-checkbox
              v-if="isCallActivityVisible"
              v-model="additionalCallActivity"
              :key="`callActivity`"
              :value="!additionalCallActivity"
            >
              <template v-slot:label>
                <v-tooltip bottom>
                  <template v-slot:activator="{ on }">
                    <div v-on="on">with referenced Processes</div>
                  </template>
                  Also export all referenced Processes used in Call Activities
                </v-tooltip>
              </template>
            </v-checkbox>

            <v-checkbox
              v-if="isCollapsedSubprocessVisible"
              v-model="additionalCollapsedSubprocess"
              :key="`collapsedSubprocess`"
              :value="!additionalCollapsedSubprocess"
            >
              <template v-slot:label>
                <v-tooltip bottom>
                  <template v-slot:activator="{ on }">
                    <div v-on="on">with collapsed Subprocesses</div>
                  </template>
                  Also export content of all collapsed Subprocesses
                </v-tooltip>
              </template>
            </v-checkbox>

            <v-container v-if="isResolutionVisible">
              <span>Resolution</span>
              <v-slider
                v-model="resolutionValue"
                track-color="grey"
                always-dirty
                min="1"
                :tick-labels="ticksArray"
                :max="isPDFTitleVisible ? (max - 1 > 0 ? max - 1 : 1) : max"
              >
                <template v-slot:prepend>
                  <v-icon @click="resolutionValue--"> mdi-minus </v-icon>
                </template>

                <template v-slot:append>
                  <v-icon @click="resolutionValue++"> mdi-plus </v-icon>
                </template>
              </v-slider></v-container
            >
          </v-container>
        </v-col>
      </v-row>
    </v-container>
  </Confirmation>
</template>
<script>
import Confirmation from '@/frontend/components/universal/Confirmation.vue';

export default {
  components: {
    Confirmation,
  },
  computed: {
    btnTitle() {
      if (!this.selectedOption) return 'Export';

      return `Export ${this.selectedOption.format}`;
    },
    ticksArray() {
      let n = this.max - 2;
      if (this.isPDFTitleVisible) {
        n -= 1;
      }
      let ticks = Array(n).join('.').split('.');
      ticks.unshift('Min');
      ticks.push('Max');
      return ticks;
    },
  },
  data() {
    return {
      selectedOption: null,
      exportOption: null,
      additionalBpmn: false,
      additionalPdf: false,
      showMoreOptions: true,
      showBpmnOptions: false,
      showPdfOptions: false,
      showPngOptions: false,
      bpmnOption: null,
      resolutionValue: 2,
      additionalParam: {},
      isUserTaskVisible: false,
      isPDFTitleVisible: false,
      isResolutionVisible: false,
      isCallActivityVisible: false,
      isCollapsedSubprocessVisible: false,
      additionalCallActivity: false,
      additionalCollapsedSubprocess: false,
      options: [
        {
          label: 'BPMN',
          format: 'bpmn',
        },
        {
          label: 'PDF',
          format: 'pdf',
        },
        {
          label: 'SVG',
          format: 'svg',
        },
        {
          label: 'PNG',
          format: 'png',
        },
      ],
    };
  },
  updated:
    /**
     * - show additional export options depending on selected format
     * - add additional export options to emitted object
     */
    function () {
      if (this.selectedOption) {
        this.additionalParam = {};
        switch (this.selectedOption.format) {
          case 'bpmn':
            this.additionalPdf = false;
            this.isUserTaskVisible = true;
            this.isPDFTitleVisible = false;
            this.isResolutionVisible = false;
            this.isCallActivityVisible = true;
            this.isCollapsedSubprocessVisible = false;
            break;
          case 'pdf':
            this.additionalBpmn = false;
            this.isUserTaskVisible = false;
            this.isPDFTitleVisible = true;
            this.isResolutionVisible = true;
            this.isCallActivityVisible = true;
            this.isCollapsedSubprocessVisible = true;
            this.additionalParam.resolution = this.resolutionValue;
            break;
          case 'png':
            this.additionalBpmn = false;
            this.additionalPdf = false;
            this.additionalParam.resolution = this.resolutionValue;
            this.isUserTaskVisible = false;
            this.isPDFTitleVisible = false;
            this.isResolutionVisible = true;
            this.isCallActivityVisible = true;
            this.isCollapsedSubprocessVisible = true;
            break;
          default:
            this.additionalBpmn = false;
            this.additionalPdf = false;
            this.isUserTaskVisible = false;
            this.isPDFTitleVisible = false;
            this.isResolutionVisible = false;
            this.isCallActivityVisible = true;
            this.isCollapsedSubprocessVisible = true;
            break;
        }
        this.exportOption = this.selectedOption;
        this.exportOption.additionalParam = this.additionalParam;

        if (this.selectedOption.format == 'bpmn' && this.additionalBpmn == true) {
          this.exportOption.additionalParam.format = 'withUserTasks';
        }
        if (this.selectedOption.format == 'pdf' && this.additionalPdf == true) {
          this.exportOption.additionalParam.format = 'pdfwh';
        }
        if (this.additionalCallActivity == true) {
          this.exportOption.additionalParam.includeCallActivityProcess = true;
        }
        if (this.additionalCollapsedSubprocess == true) {
          this.exportOption.additionalParam.includeCollapsedSubprocess = true;
        }
      }
    },

  props: {
    title: String,
    text: String,
    error: String,
    max: Number,
    loading: {
      type: Boolean,
      default: false,
    },
    show: {
      type: Boolean,
      required: true,
    },
  },
};
</script>

<style scoped>
.container {
  padding: 0px;
}
</style>
