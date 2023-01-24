<template>
  <resizable-window
    :title="title"
    :fullscreenOnly="fullscreenOnly"
    :canvasID="canvasID"
    :canvas="canvas"
    :initialMeasurements="initialMeasurements"
    :minWidth="minWidth"
    :minHeight="minHeight"
    @close="$emit('close')"
    @resize="resize"
    @move="move"
  >
    <template #header>
      <slot name="header"></slot>
    </template>
    <slot></slot>
  </resizable-window>
</template>

<script>
import ResizableWindow from '@/frontend/components/resizable-window/ResizableWindow.vue';
export default {
  name: 'ViewportRelativeResizableWindow',
  components: {
    ResizableWindow,
  },
  props: {
    title: String,
    fullscreenOnly: { type: Boolean, default: false },
    canvasID: { type: String, required: false },
    canvas: { type: Object, required: false },
    initialMeasurements: { type: Object, required: false },
    minWidth: { type: String, default: '100px', required: false },
    minHeight: { type: String, default: '100px', required: false },
  },
  data() {
    return {};
  },
  methods: {
    convertPixelToVw(valueInPixel) {
      return 100 * (valueInPixel / window.innerWidth);
    },
    convertPixelToVh(valueInPixel) {
      return 100 * (valueInPixel / window.innerHeight);
    },
    calculateWindowMeasurements(changes) {
      const width =
        parseFloat(
          this.initialMeasurements.width.substring(0, this.initialMeasurements.width.indexOf('vw'))
        ) + this.convertPixelToVw(changes.widthChange);
      const height =
        parseFloat(
          this.initialMeasurements.height.substring(
            0,
            this.initialMeasurements.height.indexOf('vh')
          )
        ) + this.convertPixelToVh(changes.heightChange);
      const top =
        parseFloat(
          this.initialMeasurements.top.substring(0, this.initialMeasurements.top.indexOf('vh'))
        ) + this.convertPixelToVh(changes.verticalOffset);
      const right =
        parseFloat(
          this.initialMeasurements.right.substring(0, this.initialMeasurements.right.indexOf('vw'))
        ) - this.convertPixelToVw(changes.horizontalOffset);

      return {
        width: `${width}vw`,
        height: `${height}vh`,
        top: `${top}vh`,
        right: `${right}vw`,
      };
    },
    resize(changes) {
      const measurements = this.calculateWindowMeasurements(changes);
      this.$emit('resize', measurements);
    },
    move(changes) {
      const measurements = this.calculateWindowMeasurements(changes);
      this.$emit('move', measurements);
    },
  },
};
</script>
