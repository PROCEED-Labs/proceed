<template>
  <div>
    <div id="canvas"></div>
    <v-btn @click="download(processName)"> Download BPMN </v-btn>
  </div>
</template>

<script>
import BpmnJS from 'bpmn-js/dist/bpmn-modeler.production.min.js';

export default {
  name: 'BPMN',
  props: ['bpmnString', 'processName'],

  mounted() {
    this.viewer = new BpmnJS({
      container: '#canvas',
    });
    this.canvas = this.viewer.get('canvas');
    this.displayProcess(this.bpmnString);
  },

  data: () => ({
    viewer: undefined,
    canvas: undefined,
  }),

  watch: {
    bpmnString: {
      handler() {
        this.displayProcess(this.bpmnString);
      },
    },
  },

  methods: {
    async displayProcess(bpmnString) {
      console.log('render BPMN');
      this.viewer.importXML(bpmnString).then((result) => {
        this.canvas.zoom('fit-viewport');
        console.log(result);
      });
    },
    download(processName) {
      this.viewer.saveXML({ format: true }, function (err, xml) {
        // console.log(xml)
        const a = document.createElement('a');
        const blob = new Blob([xml], { type: 'xml' });
        const url = URL.createObjectURL(blob);
        a.setAttribute('href', url);
        a.setAttribute('download', processName + '.bpmn');
        a.click();
      });
    },
  },
};
</script>
<style scoped>
div {
  height: 100%;
}
#canvas {
  height: 96%;
}
button {
  background-color: #84c767 !important;
  width: 100%;
}

@import 'bpmn-js/dist/assets/diagram-js.css';
@import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
</style>
