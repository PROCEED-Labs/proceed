<template>
  <v-list-item dense>
    <v-list-item-avatar>
      <v-icon class="grey lighten-1" dark> mdi-open-in-new </v-icon>
    </v-list-item-avatar>
    <v-list-item-content>
      <v-list-item-title v-text="'Share internal link'" class="text-left"></v-list-item-title>
      <v-list-item-subtitle class="text-left">
        <a
          class="text-decoration-none font-weight-medium"
          color="primary"
          :href="getLink"
          target="_blank"
          >Open link <v-icon small color="primary">mdi-open-in-new</v-icon></a
        >
      </v-list-item-subtitle>
    </v-list-item-content>
    <v-list-item-action>
      <v-tooltip left>
        <template v-slot:activator="{ on, attrs }">
          <v-btn icon @click.prevent="copyToClipboard" v-bind="attrs" v-on="on">
            <v-icon>mdi-clipboard-text-outline</v-icon>
          </v-btn>
        </template>
        <span>Copy link</span>
      </v-tooltip>
    </v-list-item-action>
  </v-list-item>
</template>

<script>
export default {
  props: {
    process: {
      type: Object,
    },
  },
  computed: {
    getLink() {
      return `${window.location.href}/bpmn/${this.process.id}`;
    },
  },
  methods: {
    // copies content of artifact json to clipboard
    copyToClipboard() {
      try {
        navigator.clipboard.writeText(`${window.location.href}/bpmn/${this.process.id}`);
      } catch (e) {
        throw new Error('Unable to copy to clipboard.');
      }
    },
  },
};
</script>
