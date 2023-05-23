<template>
  <div>
    <v-dialog v-model="showImageForm" max-width="800px">
      <image-form
        @selected="applySelection"
        :initialImage="currentImage"
        @close="showImageForm = false"
      ></image-form>
    </v-dialog>
    <v-row>
      <v-col cols="6">
        <div class="image-container">
          <v-hover v-if="currentImage" v-slot="{ hover }">
            <div style="width: 100%; height: 100%" class="d-flex justify-center align-center">
              <v-img
                :src="currentImage"
                @click="showImageForm = true"
                style="max-height: 100%; border: 2px solid lightgrey"
              ></v-img>
              <v-fade-transition>
                <v-overlay v-if="hover" absolute>
                  <v-btn plain text @click="showImageForm = true">Edit Image</v-btn>
                </v-overlay>
              </v-fade-transition>
            </div>
          </v-hover>
          <div
            v-else
            style="width: 100%; height: 100%; border: 2px solid lightgrey"
            class="d-flex justify-center align-center"
          >
            <v-btn plain text @click="showImageForm = true">Add Image</v-btn>
          </div>
        </div>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { v4 } from 'uuid';
import ImageForm from '@/frontend/components/form-builder/ImageForm.vue';
import { getMetaData } from '@/frontend/helpers/bpmn-modeler-events/getters.js';
import { processInterface } from '@/frontend/backend-api/index.js';
export default {
  name: 'ImageSelection',
  components: { ImageForm },
  data: () => ({
    showImageForm: false,
    currentImage: null,
    filename: null,
  }),
  computed: {
    processDefinitionsId() {
      return this.$store.getters['processEditorStore/id'];
    },
    modeler() {
      return this.$store.getters['processEditorStore/modeler'];
    },
    selectedElement() {
      return this.$store.getters['processEditorStore/selectedElement'];
    },
    customModeling() {
      return this.modeler.get('customModeling');
    },
    processIsShared() {
      return this.$store.getters['processStore/processById'](this.processDefinitionsId).shared;
    },
  },
  methods: {
    async applySelection(image) {
      let imagePath;
      if (typeof image === 'string') {
        imagePath = image;
      } else {
        const imageType = image.type.split('image/').pop();
        const imageFileName = `${
          this.filename || this.selectedElement.id
        }_image${v4()}.${imageType}`;
        imagePath = `/resources/process/${this.processDefinitionsId}/images/${imageFileName}`;

        // store image in backend
        await this.$store.dispatch('processStore/saveImage', {
          processDefinitionsId: this.processDefinitionsId,
          imageFileName: imageFileName,
          image,
        });

        if (!this.processIsShared) {
          // show local image as base64
          this.currentImage = await processInterface.getImage(
            this.processDefinitionsId,
            imageFileName
          );
        }
      }
      this.customModeling.updateMetaData(this.selectedElement.id, { overviewImage: imagePath });

      this.showImageForm = false;
    },
  },
  watch: {
    modeler: {
      handler(newModeler) {
        if (newModeler) {
          const eventBus = newModeler.get('eventBus');

          // update the current image when the meta data entry for the image changes for in the element
          eventBus.on('commandStack.element.updateProceedData.postExecuted', ({ context }) => {
            const { metaData, element } = context;

            if (
              metaData &&
              metaData.overviewImage &&
              element === this.selectedElement &&
              this.processIsShared
            ) {
              this.currentImage = metaData.overviewImage;
            }
          });

          eventBus.on('commandStack.element.updateProperties.postExecuted', ({ context }) => {
            const { element, properties } = context;

            if (properties.fileName && element === this.selectedElement) {
              this.filename = properties.fileName;
            }
          });
        }
      },
      immediate: true,
    },
    selectedElement: {
      async handler(newSelection) {
        // update the current image when the selected element changes
        if (newSelection) {
          const overviewImage = getMetaData(newSelection).overviewImage;
          if (overviewImage && !this.processIsShared) {
            const imageFileName = overviewImage.split('/').pop();
            const localImage = await processInterface.getImage(
              this.processDefinitionsId,
              imageFileName
            );
            this.currentImage = localImage;
          } else {
            this.currentImage = overviewImage;
          }
          this.filename = newSelection.businessObject.fileName;
        } else {
          this.currentImage = null;
          this.filename = null;
        }
      },
    },
  },
};
</script>
<style lang="scss">
.image-container {
  position: relative;
  height: 150px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
}
</style>
