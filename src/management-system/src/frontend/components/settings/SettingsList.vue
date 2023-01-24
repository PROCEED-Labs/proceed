<template>
  <div>
    <v-dialog v-model="showAddMemberDialog" max-width="350px">
      <v-card>
        <v-card-title> Enter the name of the member </v-card-title>
        <v-card-text>
          <v-text-field v-model="newMemberName" />
        </v-card-text>
        <v-card-actions style="justify-content: flex-end">
          <v-btn @click="showAddMemberDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="newObjectMember()">Add</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-list>
      <!-- name will be the key if currentSettings is an object, index will be the index of the key in the object -->
      <!-- name will be the index of the element if currentSettings is an array, index will be undefined -->
      <div
        v-for="(value, name, index) in currentSettings"
        :key="index !== undefined ? index : name"
      >
        <v-list-item id="setting-item" v-if="typeof value !== 'object' || value === null">
          <v-list-item-content v-if="index !== undefined">
            <v-list-item-title v-text="name" />
          </v-list-item-content>

          <v-list-item-action style="flex-direction: row; align-items: center">
            <v-switch
              v-if="typeof value === 'boolean'"
              :input-value="value"
              @change="handleChange(name, $event)"
            ></v-switch>

            <v-tooltip v-else-if="typeof value === 'string' && name === 'processEngineUrl'" bottom>
              <template v-slot:activator="{ on, attrs }">
                <v-text-field
                  v-bind="attrs"
                  v-on="on"
                  :value="value"
                  @change="handleChange(name, $event)"
                />
              </template>
              IPv4 address with port required. 'localhost' is not allowed, enter IP address instead
            </v-tooltip>

            <v-text-field
              v-else-if="typeof value === 'string'"
              :value="value"
              @change="handleChange(name, $event)"
            />
            <v-text-field
              v-else-if="typeof value === 'number'"
              :value="value + ''"
              type="number"
              @change="handleChange(name, parseFloat($event))"
            />
            <v-select v-else :items="types" label="Select a type" @change="setType(name, $event)" />
            <v-btn color="error" v-if="index === undefined" icon @click="removeArrayEntry(name)"
              ><v-icon>mdi-delete</v-icon></v-btn
            >
          </v-list-item-action>
        </v-list-item>
        <v-list-group v-else>
          <template v-slot:activator>
            <v-list-item-title>{{ name }}</v-list-item-title>
          </template>

          <v-row justify="center" style="background-color: #fafafa">
            <v-col cols="10">
              <v-card>
                <settings-list
                  :settings="value"
                  :isTopLevel="false"
                  @valueChanged="handleObjectChange(name, value, $event)"
                />
              </v-card>
            </v-col>
          </v-row>
        </v-list-group>
      </div>
      <v-list-item v-if="Array.isArray(settings)" style="justify-content: center">
        <v-list-item-action>
          <v-btn @click="handleNewElement">Add new Element</v-btn>
        </v-list-item-action>
      </v-list-item>
    </v-list>
  </div>
</template>

<script>
export default {
  name: 'settings-list',
  props: {
    // The settings object or array we want to display
    settings: [Object, Array],
    // Decides if we propagate changes upwards or not
    isTopLevel: {
      type: Boolean,
      default: true,
    },
    // see below in watch
    save: Boolean,
  },
  data() {
    return {
      types: ['string', 'boolean', 'number', 'array', 'object'],
      changedElements: {}, // list of items that were changed since the last save
      showAddMemberDialog: false,
      newMemberName: '',
    };
  },
  computed: {
    /**
     * Function that computes the the final rendered settings list
     * this list contains the given settings overridden by changes made by the user
     *
     * @returns {object} - the list that shall be rendered
     */
    currentSettings() {
      /**
       * Since we propagate changes to the upper level we don't need to compare
       * against changedElements in lower level settings-lists
       */
      if (!this.isTopLevel) {
        return this.settings;
      }

      // create an object that contains all elements in settings updated by values in changedElements
      const currentSettings = {};

      Object.keys(this.settings).forEach((key) => {
        if ({}.propertyIsEnumerable.call(this.changedElements, key)) {
          currentSettings[key] = this.changedElements[key];
        } else {
          currentSettings[key] = this.settings[key];
        }
      });

      return currentSettings;
    },
  },
  methods: {
    /**
     * function that is used for settings that don't have a default value
     * we set the value of the settings entry to a base value for a type that was selected by the user
     *
     * @param {string} name the name of the settings entry we want to change
     * @param {*} type the type selected by the user
     */
    setType(name, type) {
      const changedEl = {};

      switch (type) {
        case 'string':
          changedEl[name] = '';
          break;
        case 'boolean':
          changedEl[name] = false;
          break;
        case 'number':
          changedEl[name] = 0;
          break;
        case 'array':
          changedEl[name] = [];
          break;
        case 'object':
          changedEl[name] = {};
          break;
        default:
          break;
      }

      if (this.isTopLevel) {
        this.changedElements = { ...this.changedElements, ...changedEl };
      } else {
        // propagate changes in lower level list to top level
        this.$emit('valueChanged', changedEl);
      }
    },

    /**
     * Function that is supposed to be called when an 'atomic' entry i.e. not an array or an object gets changed
     *
     * @params {string} name the name of the changed entry
     * @params {*} val the new value of the entry
     */
    handleChange(name, val) {
      const changedEl = { [name]: val };

      if (this.isTopLevel) {
        this.changedElements = { ...this.changedElements, ...changedEl };
      } else {
        // propagate changes in lower level list to top level
        this.$emit('valueChanged', changedEl);
      }
    },
    /**
     * Function that is supposed to be called whenever a nested settings-list thows an valueChanged event
     * updates the object containing the change and saves to changedElements or further propagates it
     *
     * @params {string} name the name of the array or object in which the change occured
     * @params {array|object} container the array or object on which the change occured
     * @params {object} changedMember an object containing key and value of the changed member
     */
    handleObjectChange(containerName, container, changedMember) {
      let changedContainer;

      if (Array.isArray(this.currentSettings[containerName])) {
        changedContainer = container;
        const index = parseInt(Object.keys(changedMember)[0], 10);
        if (index === this.currentSettings[containerName].length) {
          changedContainer.push(changedMember[index]);
        } else {
          if (changedMember[index] === undefined) {
            changedContainer.splice(index, 1);
          } else {
            this.$set(changedContainer, index, changedMember[index]);
          }
        }
      } else {
        changedContainer = { ...container, ...changedMember };
      }

      const changedEl = { [containerName]: changedContainer };

      if (this.isTopLevel) {
        this.changedElements = { ...this.changedElements, ...changedEl };
      } else {
        this.$emit('valueChanged', changedEl);
      }
    },
    /**
     * Called when add new element button is clicked
     *
     * Array: just emit the index of the new element
     * Object: show dialog so the user can enter a name for the new member
     */
    handleNewElement() {
      if (Array.isArray(this.settings)) {
        const newEntry = { [this.settings.length]: null };
        this.$emit('valueChanged', newEntry);
      } else {
        this.showAddMemberDialog = true;
        this.newMemberName = '';
      }
    },
    /**
     * Called when the remove button of a specific entry is clicked
     *
     * Will signal the removal of a specific array entry
     */
    removeArrayEntry(index) {
      if (Array.isArray(this.settings)) {
        const removeEntry = { [index]: undefined };
        this.$emit('valueChanged', removeEntry);
      }
    },
    /**
     * Called when the user confirms the name he entered in the new member dialog
     *
     * propagates the change upwards
     */
    newObjectMember() {
      const newElement = { [this.newMemberName]: null };
      this.$emit('valueChanged', newElement);
      this.showAddMemberDialog = false;
    },
  },
  watch: {
    /**
     * Watches the save prop for changes and emits all changed elements when it changes to true
     */
    save() {
      if (this.save) {
        this.$logger.info('Saving Settings.');
        this.$emit('valueChanged', this.changedElements);
        this.changedElements = {};
      }
    },
  },
};
</script>

<style lang="scss">
#setting-item {
  justify-content: center;
}

#setting-item .v-list-item__content {
  flex: 0 0 50% !important;
  justify-content: center;
}

#setting-item .v-list-item__action {
  flex: 0 0 50% !important;
  justify-content: center;
}

#setting-item .v-list-item__action .v-input {
  flex: initial;
}
</style>
