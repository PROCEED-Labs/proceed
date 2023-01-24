<template>
  <AlertWindow :popupData="popupData" :centered="false">
    <p>Project Editor closed due to inactivity.</p>
    <p>
      This is necessary to allow a collaborative process editing. For further information,
      <a href="https://docs.proceed-labs.org/concepts/collaborative-editing">see here</a>
    </p>
  </AlertWindow>
</template>

<script>
import AlertWindow from '@/frontend/components/universal/Alert.vue';
export default {
  components: {
    AlertWindow,
  },
  props: {
    popupData: Object,
  },
  data() {
    return {};
  },
};
</script>

<style lang="scss" scoped>
a {
  color: white !important;
}
</style>
