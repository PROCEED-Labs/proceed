<template>
  <base-layout processType="template" title="Templates" @open="editBpmn">
    <template #after-table>
      <InactivityAlertWindow :popupData="inactivityWarningData" />
    </template>
  </base-layout>
</template>
<script>
import BaseLayout from '@/frontend/components/processes/ProcessViewsBaseLayout.vue';
import InactivityAlertWindow from '@/frontend/components/universal/InactivityAlert.vue';

/**
 * @module views
 */
/**
 * @memberof module:views
 * @module Vue:Template
 */
export default {
  components: {
    BaseLayout,
    InactivityAlertWindow,
  },
  data() {
    return {
      /** */
      inactivityWarningData: {
        display: 'none',
        color: 'info',
      },
    };
  },

  methods: {
    /** */
    editBpmn(id) {
      this.$router.push({ name: 'edit-template-bpmn', params: { id } });
    },
  },
  // created() {
  //   if (this.$store.getters['warningStore/showWarning'] == true) {
  //     this.inactivityWarningData.display = 'block';
  //     this.$store.commit('warningStore/setWarning', false);
  //   }
  // },
};
</script>
