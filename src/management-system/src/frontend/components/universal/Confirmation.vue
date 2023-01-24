<template>
  <v-dialog :value="show" :max-width="maxWidth" @input="$emit('cancel')" scrollable persistent>
    <v-card>
      <v-card-title>
        <slot name="title">
          <div v-html="cardTitle" />
        </slot>
        <v-spacer />
        <v-btn v-if="noButtons" icon @click="$emit('cancel')">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text style="padding-top: 20px">
        <slot><div v-html="text" /></slot>
      </v-card-text>
      <v-card-actions v-if="!noButtons">
        <v-spacer></v-spacer>
        <slot name="actions">
          <v-btn :color="cancelButtonText" @click="$emit('cancel')">
            {{ cancelButtonText }}
          </v-btn>
          <v-btn
            :loading="loading"
            :color="continueButtonColor"
            :disabled="continueButtonDisabled"
            @click="$emit('continue')"
          >
            {{ continueButtonText }}
          </v-btn>
        </slot>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  props: {
    title: {
      type: String,
      required: false,
    },
    text: {
      type: String,
      required: false,
    },
    noButtons: {
      type: Boolean,
      required: false,
      default: false,
    },
    customTitle: {
      type: Boolean,
      required: false,
      default: false,
    },
    cancelButtonText: {
      type: String,
      required: false,
      default: 'Cancel',
    },
    cancelButtonColor: {
      type: String,
      required: false,
      default: '',
    },
    continueButtonText: {
      type: String,
      required: false,
      default: 'Continue',
    },
    continueButtonColor: {
      type: String,
      required: false,
      default: 'primary',
    },
    continueButtonDisabled: {
      type: Boolean,
      required: false,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    show: {
      type: Boolean,
      required: true,
    },
    maxWidth: {
      type: String,
      default: '750px',
    },
  },
  computed: {
    cardTitle() {
      if (this.customTitle) {
        return this.title;
      } else {
        return 'Are you sure you want to ' + this.title;
      }
    },
  },
};
</script>

<style scoped>
.v-card__text,
.v-card__title {
  word-break: normal;
}
</style>
