<template>
  <v-container class="CustomProperties">
    <p class="font-weight-medium">Custom Properties</p>
    <v-row v-for="({ name, value }, index) in customPropertyRows" :key="index">
      <v-col cols="6">
        <v-text-field
          :key="index"
          :disabled="disableEditing"
          label="Name"
          :rules="[noDuplicate(index)]"
          :value="name"
          background-color="white"
          @blur="
            index === customPropertyRows.length - 1
              ? assignCustomProperty($event.target.value, value)
              : emitCustomPropertyChange($event.target.value, value, name)
          "
          filled
        />
      </v-col>
      <v-col cols="5">
        <v-text-field
          :key="index"
          :disabled="disableEditing"
          label="Value"
          :value="value"
          background-color="white"
          @blur="
            index === customPropertyRows.length - 1
              ? assignCustomProperty(name, $event.target.value)
              : emitCustomPropertyChange(name, $event.target.value)
          "
          filled
        />
      </v-col>
      <v-col v-if="index !== customPropertyRows.length - 1" cols="1" class="d-flex justify-end">
        <v-btn class="my-4" icon color="error" @click="deleteProperty(name)" small
          ><v-icon>mdi-delete</v-icon></v-btn
        >
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  name: 'CustomPropertyForm',
  components: {},
  props: ['meta', 'disableEditing'],
  data() {
    return {
      newCustomProperty: {
        name: '',
        value: null,
      },
      noDuplicate(index) {
        const self = this;
        return function (name) {
          const duplicateIndex = self.customPropertyRows.findIndex((row) => row.name === name);

          if (name.length > 0 && duplicateIndex !== -1 && duplicateIndex !== index) {
            return 'Name already exists';
          }

          return true;
        };
      },
    };
  },
  computed: {
    customPropertyRows() {
      const assignedCustomProperties = Object.keys(this.customMetaData).map(
        (customPropertyName) => {
          return {
            name: customPropertyName,
            value: this.customMetaData[customPropertyName],
          };
        }
      );
      return [...assignedCustomProperties, this.newCustomProperty];
    },
    customMetaData() {
      const {
        costsPlanned,
        timePlannedDuration,
        timePlannedOccurrence,
        timePlannedEnd,
        occurrenceProbability,
        orderNumber,
        orderName,
        orderCode,
        customerName,
        customerId,
        isUsing5i,
        overviewImage,
        defaultPriority,
        mqttServer,
        '_5i-Inspection-Plan-ID': inspectionPlanId,
        '_5i-Inspection-Plan-Title': inspectionPlanTitle,
        '_5i-API-Address': apiAddress,
        '_5i-Application-Address': applicationAddress,
        '_5i-Inspection-Order-ID': inspectionOrderId,
        '_5i-Inspection-Order-Code': inspectionOrderCode,
        '_5i-Inspection-Order-Shortdescription': inspectionOrderDescription,
        '_5i-Assembly-Group-ID': assemblyId,
        '_5i-Assembly-Group-Name': assemblyName,
        '_5i-Manufacturing-Step-ID': stepId,
        '_5i-Manufacturing-Step-Name': stepName,
        '_5i-Inspection-Plan-Template-ID': templateId,
        ...customMetaData
      } = this.meta;
      return { ...customMetaData };
    },
  },
  methods: {
    validateInput(newCustomPropertyName, newCustomPropertyValue) {
      return (
        newCustomPropertyName &&
        newCustomPropertyValue &&
        !this.customMetaData[newCustomPropertyName]
      );
    },
    deleteProperty(metaDataName) {
      this.$emit('change', metaDataName, null);
    },
    emitCustomPropertyChange(newCustomPropertyName, newCustomPropertyValue, oldCustomPropertyName) {
      if (newCustomPropertyName !== oldCustomPropertyName) {
        if (!this.customMetaData[newCustomPropertyName]) {
          this.deleteProperty(oldCustomPropertyName);
          this.$emit('change', newCustomPropertyName, newCustomPropertyValue);
        }
      } else {
        this.$emit('change', newCustomPropertyName, newCustomPropertyValue);
      }
    },
    assignCustomProperty(newCustomPropertyName, newCustomPropertyValue) {
      this.newCustomProperty.name = newCustomPropertyName;
      this.newCustomProperty.value = newCustomPropertyValue;

      if (this.validateInput(newCustomPropertyName, newCustomPropertyValue)) {
        this.$emit('change', newCustomPropertyName, newCustomPropertyValue);

        this.newCustomProperty.name = '';
        this.newCustomProperty.value = null;
      }
    },
  },
  watch: {
    meta: {
      handler(newMeta) {
        this.newCustomProperty.name = '';
        this.newCustomProperty.value = null;
      },
      immediate: true,
    },
  },
};
</script>
