<template>
  <v-container id="loading-screen-container" fluid>
    <v-row id="row">
      <v-col id="col">
        <ProceedLogo :loading="true" id="proceed-logo" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import ProceedLogo from '@/frontend/icons/ProceedLogo.vue';

/**
 * @module views
 */
/**
 * @memberof module:views
 * @module Vue:LoadingScreen
 */
export default {
  components: {
    ProceedLogo,
  },
};
</script>
<style lang="scss" scoped>
#loading-screen-container {
  height: 100vh;
}

#row {
  height: 100%;
  align-content: center;
}

#col {
  height: auto;
}
#proceed-logo {
  height: auto;
  width: 100%;
  position: relative;
  top: -100px;
}
</style>
