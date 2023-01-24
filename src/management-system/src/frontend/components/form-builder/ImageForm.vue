<template>
  <v-card>
    <v-card-title class="pr-3">
      <span>Select Image</span>
      <v-spacer></v-spacer>
      <v-icon @click="$emit('close')">mdi-close</v-icon>
    </v-card-title>
    <v-divider></v-divider>
    <v-card-text class="pa-0">
      <v-row class="ma-0" style="height: 400px">
        <v-col cols="4">
          <v-file-input
            ref="upload"
            dense
            accept="image/png image/svg+xml image/jpeg"
            placeholder="Pick an image"
            prepend-icon="mdi-camera"
            @change="selectUploadImage"
          ></v-file-input
        ></v-col>
        <v-divider vertical></v-divider>
        <v-col cols="8" class="fill-height d-flex flex-column">
          <div class="d-flex justify-center">
            <v-text-field dense v-model="imageURL" class="mr-4"></v-text-field>
            <v-icon class="mb-4" @click="selectImageUrl">mdi-plus</v-icon>
          </div>
          <v-img
            v-if="displayedImage"
            class="flex-shrink-1"
            :src="displayedImage"
            @error="resetImage"
          ></v-img>
        </v-col>
      </v-row>
    </v-card-text>
    <v-divider></v-divider>
    <v-card-actions class="justify-end">
      <v-btn :disabled="!previewImage" color="primary" outlined @click="emitImage()"
        >Add Image</v-btn
      >
    </v-card-actions>
  </v-card>
</template>

<script>
export default {
  name: 'ImageForm',
  props: ['initialImage'],
  data() {
    return {
      imageURL: null,
      uploadedImage: null,
      previewImage: null,
    };
  },
  methods: {
    resetImage() {
      this.$refs.upload.reset();
      this.imageURL = null;
      this.uploadedImage = null;
      this.previewImage = null;
    },
    async convertImageToBase64(image) {
      const reader = new FileReader();
      return new Promise((resolve) => {
        reader.onloadend = () => {
          resolve(reader.result);
        };
        reader.readAsDataURL(image);
      });
    },
    async selectUploadImage(image) {
      if (image) {
        this.imageURL = null;
        this.uploadedImage = image;
        const base64Image = await this.convertImageToBase64(image);
        this.previewImage = base64Image;
      }
    },
    async selectImageUrl() {
      this.$refs.upload.reset();
      this.previewImage = this.imageURL;
      this.uploadedImage = null;
    },
    emitImage() {
      if (this.imageURL) {
        this.$emit('selected', this.imageURL);
      } else if (this.uploadedImage) {
        this.$emit('selected', this.uploadedImage);
      }
      this.resetImage();
    },
  },
  computed: {
    displayedImage() {
      return this.previewImage || this.initialImage;
    },
  },
};
</script>
