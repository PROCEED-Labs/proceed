<script>
/**
 * Class representing a list of callbacks ordered following a provided priority
 *
 * Ordering is from highest to lowest priority
 */
class PriorityCallbackList {
  constructor() {
    this.callbacks = [];
  }

  /**
   * Inserts a new callback into the callbacks list
   *
   * @param {Number} priority defines the priority with which this callback should be executed (higher is better
   * @param {Function} callback the callback that should be inserted
   */
  insert(priority, callback) {
    // search for the index where the new element should be inserted
    let firstLowerIndex = this.callbacks.findIndex((entry) => entry.priority < priority);
    firstLowerIndex = firstLowerIndex === -1 ? this.callbacks.length : firstLowerIndex;

    // will enter the new entry at the previously found index
    this.callbacks.splice(firstLowerIndex, 0, { callback, priority });
  }

  /**
   * Removed a callback from the list
   *
   * @param {Function} callback the callback to remove
   */
  remove(callback) {
    this.callbacks = this.callbacks.filter((entry) => entry.callback !== callback);
  }

  /**
   * Allows iteration over this class
   * Implementation from: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#the_iterator_protocol
   */
  [Symbol.iterator]() {
    let index = 0;

    return {
      next: () => {
        if (index < this.callbacks.length) {
          return { value: this.callbacks[index++], done: false };
        } else {
          return { done: true };
        }
      },
    };
  }
}

/**
 * @module components
 */
/**
 * @memberof module:components
 * @module processes
 */
/**
 * This mixin provides a way for nested components inside the component using it to register callbacks that will be called by the component
 *
 * @memberof module:components.module:processes
 * @module Vue:OnSubmitProviderMixin
 *
 */
export default {
  data() {
    return {
      /**
       * Callbacks set by other components that should be called to check if the data inside the form is valid and can be submitted
       */
      beforeSubmitValidatorCallbacks: new PriorityCallbackList(),
      /**
       * Callbacks set by other components that should be called before the data is submitted to the store
       */
      beforeSubmitCallbacks: new PriorityCallbackList(),
      /**
       * Callbacks set by other components that should be called after the data is submitted to the store
       */
      afterSubmitCallbacks: new PriorityCallbackList(),
    };
  },
  provide() {
    return {
      onBeforeSubmitValidation: this.registerBeforeSubmitValidator,
      offBeforeSubmitValidation: this.unregisterBeforeSubmitValidator,
      onBeforeSubmit: this.registerBeforeSubmit,
      offBeforeSubmit: this.unregisterBeforeSubmit,
      onAfterSubmit: this.registerAfterSubmit,
      offAfterSubmit: this.unregisterAfterSubmit,
    };
  },
  methods: {
    registerBeforeSubmitValidator({ callback, priority }) {
      this.beforeSubmitValidatorCallbacks.insert(priority, callback);
    },
    unregisterBeforeSubmitValidator(callback) {
      this.beforeSubmitValidatorCallbacks.remove(callback);
    },
    registerBeforeSubmit({ callback, priority }) {
      this.beforeSubmitCallbacks.insert(priority, callback);
    },
    unregisterBeforeSubmit(callback) {
      this.beforeSubmitCallbacks.remove(callback);
    },
    registerAfterSubmit({ callback, priority }) {
      this.afterSubmitCallbacks.insert(priority, callback);
    },
    unregisterAfterSubmit(callback) {
      this.afterSubmitCallbacks.remove(callback);
    },

    async executeValidatorCallbacks(...params) {
      for (const { callback } of this.beforeSubmitValidatorCallbacks) {
        await callback(...params);
      }
    },

    async executeBeforeSubmitCallbacks(...params) {
      for (const { callback } of this.beforeSubmitCallbacks) {
        await callback(...params);
      }
    },

    async executeAfterSubmitCallbacks(...params) {
      try {
        for (let { callback } of this.afterSubmitCallbacks) {
          await callback(...params);
        }
      } catch (err) {
        this.$logger.debug(err);
      }
    },
  },
};
</script>
