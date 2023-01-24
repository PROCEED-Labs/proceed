<template>
  <div>
    <tooltip-button @click="showDialog = true">
      <template #tooltip-text>Embed</template>
      mdi-share-outline
    </tooltip-button>
    <v-dialog v-model="showDialog" scrollable>
      <v-card>
        <v-card-title>Embed instance view</v-card-title>
        <v-card-text style="padding-top: 15px">
          <v-textarea
            id="iframe-code"
            v-model="iframeCode"
            rows="1"
            auto-grow
            readonly
          ></v-textarea>
          <v-text-field label="Width" v-model="width" :rules="[isPositive]"></v-text-field>
          <v-text-field label="Height" v-model="height" :rules="[isPositive]"></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" @click="copy">Copy</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script>
import TooltipButton from '@/frontend/components/universal/TooltipButton.vue';

export default {
  components: { TooltipButton },
  props: ['instanceId'],
  computed: {
    queryString() {
      let firstQuery = true;

      let queryString = Object.entries(this.queries).reduce((currentQuery, [key, value]) => {
        const prefix = firstQuery ? '?' : '&';

        if (value) {
          firstQuery = false;

          return `${currentQuery}${prefix}${key}=${value}`;
        } else {
          return currentQuery;
        }
      }, '');

      return queryString;
    },

    url() {
      return `${window.location}/instance/${this.instanceId}${this.queryString}`;
    },

    iframeCode() {
      return `<iframe frameborder="0" width="${this.width}" height="${this.height}" src="${this.url}"></iframe>`;
    },
  },
  data() {
    return {
      showDialog: false,
      queries: {},
      width: 560,
      height: 315,
    };
  },
  methods: {
    isPositive(num) {
      return num > 0;
    },
    copy() {
      const iframeCode = document.getElementById('iframe-code');
      iframeCode.select();
      iframeCode.setSelectionRange(0, 99999);
      document.execCommand('copy');
    },
  },
};
</script>
<style scoped></style>
