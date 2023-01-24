<script>
/**
 * @module components
 */
/**
 * @memberof module:components
 * @module processes
 */
/**
 * This mixin sets up callbacks that should be called by a preceding component
 *
 * @memberof module:components.module:processes
 * @module Vue:OnSubmitInjectorMixin
 *
 */
export default {
  /**
   * We use the callback system that was provided by the preceding component
   */
  inject: [
    'onBeforeSubmitValidation',
    'offBeforeSubmitValidation',
    'onBeforeSubmit',
    'offBeforeSubmit',
    'onAfterSubmit',
    'offAfterSubmit',
  ],
  data() {
    return {
      /**
       * These define the default priority of the before and after submit callbacks of every component using this mixin
       *
       * Redefine them inside a component if it is supposed to use another value
       */
      beforeSubmitValidationPriority: 1000,
      beforeSubmitPriority: 1000,
      afterSubmitPriority: 1000,
    };
  },
  /**
   * Register the callbacks with the preceding component if they are defined on the component using this mixin
   */
  mounted() {
    if (this.beforeSubmitValidation) {
      this.onBeforeSubmitValidation({
        callback: this.beforeSubmitValidation,
        priority: this.beforeSubmitValidationPriority,
      });
    }
    if (this.beforeSubmit) {
      this.onBeforeSubmit({ callback: this.beforeSubmit, priority: this.beforeSubmitPriority });
    }
    if (this.afterSubmit) {
      this.onAfterSubmit({ callback: this.afterSubmit, priority: this.afterSubmitPriority });
    }
  },
  /**
   * Unregister the callbacks from the preceding component if they are defined on the component using this mixin
   *
   * This should prevent the callbacks from being called after this component has stopped existing
   */
  beforeDestroy() {
    if (this.beforeSubmitValidation) {
      this.onBeforeSubmitValidation(this.beforeSubmitValidation);
    }
    if (this.beforeSubmit) {
      this.offBeforeSubmit(this.beforeSubmit);
    }
    if (this.afterSubmit) {
      this.offAfterSubmit(this.afterSubmit);
    }
  },
};
</script>
