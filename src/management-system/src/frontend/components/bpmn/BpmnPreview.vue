<template>
  <div>
    <v-hover v-if="viewerMode === 'viewer' && !isDeploymentMode" v-slot:default="{ hover }">
      <v-card outlined tile width="100%" height="100%" @click="$emit('editBpmn', process)">
        <BpmnJsWrapper
          v-if="xml"
          :viewerMode="viewerMode"
          :xml="xml"
          :subprocessId="subprocessId"
        ></BpmnJsWrapper>
        <v-fade-transition>
          <!-- BPMN Logo of the Viewer has an z-index of 100 -->
          <v-overlay v-if="!hover" absolute opacity="0.8" z-index="101">
            <span class="cta-text">{{ callToActionText }}</span>
          </v-overlay>
        </v-fade-transition>
      </v-card>
    </v-hover>
    <v-card v-else outlined tile width="100%" height="100%">
      <BpmnJsWrapper v-if="xml" :viewerMode="viewerMode" :xml="xml"></BpmnJsWrapper>
    </v-card>
  </div>
</template>

<script>
import BpmnJsWrapper from '@/frontend/components/bpmn/BpmnJsWrapper.vue';

export default {
  name: 'BpmnPreview',
  components: { BpmnJsWrapper },
  props: {
    process: {
      type: Object,
      required: false,
      validator: function (process) {
        return !!process && process.id;
      },
    },
    version: {
      type: Object,
    },
    bpmnFile: {
      type: String,
      required: false,
    },
    viewerMode: {
      type: String,
      required: false,
      default: 'viewer',
      validator: function (value) {
        // The value must match one of these strings
        return ['viewer', 'navigated-viewer'].includes(value);
      },
    },
    callToActionText: { type: String, required: false },
    isDeploymentMode: {
      type: Boolean,
      required: false,
      default: false,
    },
    subprocessId: {
      type: String,
      default: '',
    },
  },
  computed: {
    xml() {
      return this.bpmnFile ? this.bpmnFile : this.processBpmnFile;
    },
  },
  watch: {
    process() {
      this.setProcessBpmnFile();
    },
    version() {
      this.setProcessBpmnFile();
    },
  },
  data() {
    return {
      processBpmnFile: null,
    };
  },
  async created() {
    if (this.process) {
      await this.setProcessBpmnFile();
    }
  },
  methods: {
    async setProcessBpmnFile() {
      if (this.version) {
        this.processBpmnFile = await this.$store.getters['processStore/xmlByVersion'](
          this.process.id,
          this.version.version
        );
      } else {
        this.processBpmnFile = await this.$store.getters['processStore/xmlById'](this.process.id);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.cta-text {
  letter-spacing: 1px;
  font-weight: 400;
  text-transform: uppercase;
  font-size: 18px;
  color: #efefef;
}
</style>
