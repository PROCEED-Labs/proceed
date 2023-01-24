<template>
  <v-dialog v-model="dialog" hide-overlay max-width="500">
    <v-alert
      id="alertPopup"
      v-model="dialog"
      :type="alertType"
      :color="popupData.color"
      dark
      prominent
      dismissible
      class="ma-0"
      ><slot>{{ popupData.body }}</slot>
      <!-- use either slot or body -->
    </v-alert>
  </v-dialog>
</template>

<script>
export default {
  props: {
    popupData: Object,
  },
  data() {
    return {};
  },
  computed: {
    alertType() {
      const availableTypes = ['success', 'info', 'warning', 'error'];
      if (availableTypes.includes(this.popupData.color)) {
        return this.popupData.color;
      } else {
        return undefined;
      }
    },
    dialog: {
      get() {
        return this.popupData.display !== 'none';
      },
      set(newValue) {
        if (!newValue) {
          this.closeFunction();
        } else {
          this.popupData.display = 'block';
        }
      },
    },
  },
  methods: {
    closeFunction() {
      this.popupData.display = 'none';
      if (this.popupData.body === '--> Error importing BPMN XML') {
        this.$emit('close');
      }
    },
  },
  mounted() {},
};
</script>
