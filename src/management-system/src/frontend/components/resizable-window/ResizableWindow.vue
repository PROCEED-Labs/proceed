<template>
  <div
    class="resizable-window"
    :id="title + 'window'"
    :style="[position(), windowSize(), { minWidth, minHeight }]"
    @mousedown="handleMousedown($event)"
  >
    <div style="height: 100%; overflow: hidden" id="content">
      <v-toolbar id="xml-toolbar" dense flat @mousedown="canDrag = true">
        <slot name="header">
          <v-toolbar-title small>{{ title }}</v-toolbar-title>
        </slot>
        <v-spacer />
        <v-icon @click="$emit('close')">mdi-close</v-icon>
      </v-toolbar>
      <v-divider></v-divider>
      <slot></slot>
    </div>
  </div>
</template>

<script>
export default {
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
    return {
      initialWidth: '100%',
      initialHeight: '100%',
      contentHeight: 0,
      widthChange: 0,
      heightChange: 0,
      initialRight: 0,
      initialLeft: 0,
      intialTop: 0,
      verticalOffset: 0,
      horizontalOffset: 0,
      lastMousePos: { x: 0, y: 0 },
      canDrag: false,
      dragging: false,
      resizing: false,
      sides: [],
      oldHeight: 0,
      oldWidth: 0,
      oldLeft: 0,
      oldTop: 0,
      fullscreen: false,
    };
  },
  methods: {
    convertPixelToVw(valueInPixel) {
      return 100 * (valueInPixel / window.innerWidth);
    },
    convertPixelToVh(valueInPixel) {
      return 100 * (valueInPixel / window.innerHeight);
    },
    position() {
      if (this.initialMeasurements.hasOwnProperty('right')) {
        return {
          right: `calc(${this.initialRight} - ${this.horizontalOffset}px)`,
          top: `calc(${this.initialTop} + ${this.verticalOffset}px)`,
        };
      }
      return {
        left: `calc(${this.initialLeft} + ${this.horizontalOffset}px)`,
        top: `calc(${this.initialTop} + ${this.verticalOffset}px)`,
      };
    },
    windowSize() {
      const size = {
        width: `calc(${this.initialWidth} + ${this.convertPixelToVw(this.widthChange)}vw)`,
        height: `calc(${this.initialHeight} + ${this.convertPixelToVh(this.heightChange)}vh)`,
      };

      if (this.fullscreenOnly) {
        size.width = '100%';
        size.height = this.getCanvasHeight();
      }
      return size;
    },
    handleMousedown(event) {
      if (!this.fullscreenOnly) {
        const window = document.getElementById(`${this.title}window`);
        // gives us the absolute positions of the window relative to the viewport
        const rect = window.getBoundingClientRect();
        if (event.clientX - rect.left <= 10) {
          this.resizing = true;
          this.sides.push('left');
        }
        if (event.clientY - rect.top <= 10) {
          this.resizing = true;
          this.sides.push('top');
        }
        if (rect.right - event.clientX <= 10) {
          this.resizing = true;
          this.sides.push('right');
        }
        if (rect.bottom - event.clientY <= 10) {
          this.resizing = true;
          this.sides.push('bottom');
        }
        if (!this.resizing && this.canDrag) {
          this.dragging = true;
        }

        document.body.addEventListener('selectstart', this.disableSelect);
        document.body.addEventListener('mouseup', this.handleMouseup);

        this.lastMousePos.x = event.clientX;
        this.lastMousePos.y = event.clientY;
      }
    },
    handleMousemove(event) {
      if (!this.fullscreenOnly) {
        if (this.resizing) {
          this.resizeWindow(event);
        } else if (this.dragging) {
          this.moveWindow(event);
        } else {
          this.conditionalCursorChange(event);
        }
      }
    },
    disableSelect(event) {
      event.preventDefault();
    },
    getCanvasMeasurements() {
      let canvas = {};
      if (this.canvasID) {
        const boundingClientRect = document.getElementById(this.canvasID).getBoundingClientRect();
        canvas = {
          top: boundingClientRect.top,
          bottom: boundingClientRect.bottom,
          left: boundingClientRect.left,
          right: boundingClientRect.right,
          width: boundingClientRect.width,
          height: boundingClientRect.height,
        };
      }
      if (this.canvas) {
        canvas = { ...canvas, ...this.canvas };
      }
      return canvas;
    },
    getCanvasHeight() {
      const canvas = this.getCanvasMeasurements();
      return `${canvas.height}px`;
    },
    initMeasurements() {
      const canvas = this.getCanvasMeasurements();

      this.initialTop = this.initialMeasurements.top || 0;
      if (this.initialMeasurements.hasOwnProperty('right')) {
        this.initialRight = this.initialMeasurements.right;
      } else {
        this.initialLeft = this.initialMeasurements.left || 0;
      }
      this.initialWidth = this.initialMeasurements.width || canvas.width;
      this.initialHeight = this.initialMeasurements.height || canvas.height;
      this.widthChange = 0;
      this.heightChange = 0;
      this.verticalOffset = 0;
      this.horizontalOffset = 0;
    },
    enterFullscreen() {
      const window = document.getElementById(`${this.title}window`);
      const canvas = this.getCanvasMeasurements();

      if (!this.fullscreen) {
        this.fullscreen = true;
        window.style.height = `${canvas.height}px`;
        window.style.width = '100%';
        this.initialLeft = 0;
        this.initialTop = canvas.top;
      } else {
        this.fullscreen = false;
        this.initMeasurements();
      }
      this.updateWidthOfFormBuilderBlocks();
    },
    moveWindow(event) {
      if (!this.fullscreenOnly) {
        const canvas = this.getCanvasMeasurements();
        const window = document.getElementById(`${this.title}window`);
        const rect = window.getBoundingClientRect();
        const mouseDiffX = event.clientX - this.lastMousePos.x;
        const mouseDiffY = event.clientY - this.lastMousePos.y;

        if (!(rect.right + mouseDiffX > canvas.right) && !(rect.left + mouseDiffX < canvas.left)) {
          this.horizontalOffset = this.horizontalOffset + mouseDiffX;
        }

        if (!(rect.bottom + mouseDiffY > canvas.bottom) && !(rect.top + mouseDiffY < canvas.top)) {
          this.verticalOffset = this.verticalOffset + mouseDiffY;
        }

        this.lastMousePos.x = event.clientX;
        this.lastMousePos.y = event.clientY;
        this.$emit('move', {
          verticalOffset: this.verticalOffset,
          horizontalOffset: this.horizontalOffset,
          widthChange: this.widthChange,
          heightChange: this.heightChange,
        });
      }
    },
    updateWidthOfFormBuilderBlocks() {
      if (!this.fullscreenOnly) {
        let blockBar = document.getElementsByClassName('gjs-blocks-c')[0];
        if (blockBar) {
          blockBar = blockBar.getBoundingClientRect();
          const blocks = document.getElementsByClassName('gjs-block');
          if (blockBar.width < 130) {
            Array.prototype.forEach.call(blocks, (block) => {
              block.style.width = '100%';
            });
          } else {
            Array.prototype.forEach.call(blocks, (block) => {
              block.style.removeProperty('width');
            });
          }
        }
      }
    },
    resizeWindow(event) {
      if (!this.fullscreenOnly) {
        this.fullscreen = false;

        const canvas = this.getCanvasMeasurements();
        const window = document.getElementById(`${this.title}window`);
        const rect = window.getBoundingClientRect();
        const mouseDiffX = event.clientX - this.lastMousePos.x;
        const mouseDiffY = event.clientY - this.lastMousePos.y;

        if (this.sides.includes('left') && !(rect.left + mouseDiffX < canvas.left)) {
          this.widthChange = this.widthChange - mouseDiffX;
          if (this.initialMeasurements.hasOwnProperty('left')) {
            this.horizontalOffset = this.horizontalOffset + mouseDiffX;
          }
        }

        if (this.sides.includes('right') && !(rect.right + mouseDiffX > canvas.right)) {
          this.widthChange = this.widthChange + mouseDiffX;
          if (this.initialMeasurements.hasOwnProperty('right')) {
            this.horizontalOffset = this.horizontalOffset + mouseDiffX;
          }
        }

        if (this.sides.includes('top') && !(rect.top + mouseDiffY < canvas.top)) {
          this.heightChange = this.heightChange - mouseDiffY;
          if (this.initialMeasurements.hasOwnProperty('top')) {
            this.verticalOffset = this.verticalOffset + mouseDiffY;
          }
        }

        if (this.sides.includes('bottom') && !(rect.bottom + mouseDiffY > canvas.bottom)) {
          this.heightChange = this.heightChange + mouseDiffY;
          if (this.initialMeasurements.hasOwnProperty('bottom')) {
            this.verticalOffset = this.verticalOffset + mouseDiffY;
          }
        }

        this.lastMousePos.x = event.clientX;
        this.lastMousePos.y = event.clientY;
        this.updateWidthOfFormBuilderBlocks();
        this.$emit('resize', {
          verticalOffset: this.verticalOffset,
          horizontalOffset: this.horizontalOffset,
          widthChange: this.widthChange,
          heightChange: this.heightChange,
        });
      }
    },
    handleMouseup() {
      if (!this.fullscreenOnly) {
        this.canDrag = false;
        this.dragging = false;
        this.resizing = false;
        this.sides = [];
        document.body.removeEventListener('mouseup', this.handleMouseup);
        document.body.removeEventListener('selectstart', this.disableSelect);
      }
    },
    conditionalCursorChange(event) {
      if (!this.fullscreenOnly) {
        const window = document.getElementById(`${this.title}window`);
        const rect = window.getBoundingClientRect();

        if (event.clientX - rect.left <= 5 && event.clientY - rect.top <= 5) {
          window.style.cursor = 'nwse-resize';
        } else if (event.clientY - rect.top <= 5 && rect.right - event.clientX <= 5) {
          window.style.cursor = 'nesw-resize';
        } else if (rect.right - event.clientX <= 5 && rect.bottom - event.clientY <= 5) {
          window.style.cursor = 'nwse-resize';
        } else if (rect.bottom - event.clientY <= 5 && event.clientX - rect.left <= 5) {
          window.style.cursor = 'nesw-resize';
        } else if (event.clientX - rect.left <= 5) {
          window.style.cursor = 'ew-resize';
        } else if (event.clientY - rect.top <= 5) {
          window.style.cursor = 'ns-resize';
        } else if (rect.right - event.clientX <= 5) {
          window.style.cursor = 'ew-resize';
        } else if (rect.bottom - event.clientY <= 5) {
          window.style.cursor = 'ns-resize';
        } else {
          window.style.cursor = 'auto';
        }
      }
    },
  },
  mounted() {
    if (!this.fullscreenOnly) {
      this.initMeasurements();
      document.body.addEventListener('mousemove', this.handleMousemove);
    } else {
      this.enterFullscreen();
    }
  },
  updated() {
    if (!this.fullscreenOnly) {
      const rect = document.getElementById('content').getBoundingClientRect();
      this.contentHeight = rect.bottom - rect.top;
      let window = document.getElementById(`${this.title}window`);
      window = window.getBoundingClientRect();
      const canvas = this.getCanvasMeasurements();
      if (canvas.width !== window.width) {
        this.fullscreen = false;
      }
    }
  },
  beforeDestroy() {
    document.body.removeEventListener('mousemove', this.handleMousemove);
  },
  watch: {
    initialMeasurements() {
      this.initMeasurements();
    },
  },
};
</script>
<style scoped>
.readonly {
  background-color: #f0f0f0 !important;
}
.resizable-window {
  z-index: 5;
  position: absolute;
  overflow-y: hidden;
  overflow-x: hidden;
  border: 1px solid lightgray;
}
</style>
