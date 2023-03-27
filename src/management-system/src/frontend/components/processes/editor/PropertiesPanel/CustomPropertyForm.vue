<template>
  <v-container class="CustomProperties">
    <p class="font-weight-medium">Custom Properties</p>
    <v-row v-for="({ name, value }, index) in customPropertyRows" :key="index">
      <v-col cols="6">
        <v-text-field
          :key="index"
          :disabled="disableEditing"
          label="Name"
          :rules="index === customPropertyRows.length - 1 ? [inputRules.noDuplicate] : []"
          :value="name"
          background-color="white"
          @blur="
            index === customPropertyRows.length - 1
              ? assignCustomProperty({
                  name: $event.target.value,
                  value: value,
                })
              : emitCustomPropertyChange({ [$event.target.value]: value }, name)
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
              ? assignCustomProperty({
                  name: name,
                  value: $event.target.value,
                })
              : emitCustomPropertyChange({ [name]: $event.target.value })
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
  props: ['element', 'meta', 'disableEditing'],
  data() {
    return {
      newCustomProperty: {
        name: '',
        value: null,
      },
      inputRules: {
        noDuplicate: (name) => !this.customMetaData[name] || 'Name already exists',
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
    validateInput(customProperyInfo) {
      return (
        customProperyInfo &&
        customProperyInfo.name &&
        customProperyInfo.value &&
        !this.customMetaData[customProperyInfo.name]
      );
    },
    deleteProperty(metaDataName) {
      this.$emit('change', {
        [metaDataName]: null,
      });
    },
    emitCustomPropertyChange(newMetaData, oldMetaDataName) {
      const metaData = { ...newMetaData };

      if (oldMetaDataName && !newMetaData[oldMetaDataName]) {
        metaData[oldMetaDataName] = undefined;
      }

      this.$emit('change', metaData);
    },
    assignCustomProperty(newCustomPropertyInfo) {
      this.newCustomProperty.name = newCustomPropertyInfo.name;
      this.newCustomProperty.value = newCustomPropertyInfo.value;

      if (this.validateInput(newCustomPropertyInfo)) {
        this.$emit('change', {
          [this.newCustomProperty.name]: this.newCustomProperty.value,
        });

        this.newCustomProperty.name = '';
        this.newCustomProperty.value = null;
      }
    },
  },
  watch: {},
};
</script>
