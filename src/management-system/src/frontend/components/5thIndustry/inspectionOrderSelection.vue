<template>
  <layout v-if="_5iEnabled && showComponent">
    <template #type>Inspection Order</template>
    <template #content>
      <v-combobox
        id="inspectionOrderSelection"
        :items="inspectionOrders"
        item-text="inspectionDescriptionShort[0].value"
        item-value="_id"
        :loading="requestingOrders"
        :label="label"
        :return-object="false"
        :value="value['_5i-Inspection-Order-ID']"
        @change="emitOrderInfo"
        clearable
        outlined
        :disabled="disabled"
      >
        <template #selection="{ item: orderId }">{{ getOrderDescription(orderId) }}</template>
        <template #item="{ item, on, attrs }">
          <v-list-item v-bind="attrs" v-on="on">
            <v-list-item-content>
              <v-list-item-subtitle>
                {{ getGroupAndStepInformationText(item) }}
              </v-list-item-subtitle>
              <v-list-item-title>
                {{ getOrderInformationText(item._id) }}
              </v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </template>
      </v-combobox>

      <v-text-field disabled filled label="Order Id" :value="currentOrderId" />
      <v-text-field disabled filled label="Order Code" :value="currentOrderCode" />
      <v-text-field disabled filled label="Assembly Group" :value="currentAssemblyGroup" />
      <v-text-field disabled filled label="Manufacturing Step" :value="currentManufacturingStep" />
    </template>
  </layout>
</template>
<script>
import { fifthIndustryInterface } from '@/frontend/backend-api/index.js';

import Layout from './5thIndustryLayout.vue';

export default {
  components: { Layout },

  props: ['use5i', 'planId', 'value', 'processType', 'disabled'],

  data() {
    return {
      inspectionOrders: [],
      label: 'Inspection Order',
      showComponent:
        this.processType === 'project' || this.processType === 'template' ? true : false,
      requestingOrders: false,
      orderRequestTimeout: undefined,
    };
  },
  computed: {
    _5iEnabled() {
      return !!(
        this.$store.getters['configStore/config']._5thIndustryApplicationURL &&
        this.$store.getters['configStore/config']._5thIndustryAPIURL
      );
    },
    currentOrderId() {
      return this.value['_5i-Inspection-Order-ID'];
    },
    currentOrderCode() {
      return this.value['_5i-Inspection-Order-Code'];
    },
    currentAssemblyGroup() {
      return this.value['_5i-Assembly-Group-Name'];
    },
    currentManufacturingStep() {
      return this.value['_5i-Manufacturing-Step-Name'];
    },
  },
  methods: {
    getGroupAndStepInformationText(item) {
      let text = '';

      if (!item.assemblyGroup.number && !item.assemblyGroup.name) {
        text += '(No assembly group information)';
      } else {
        text += item.assemblyGroup.number ? item.assemblyGroup.number : '(No assembly number)';
        text += ' ';
        text += item.assemblyGroup.name ? item.assemblyGroup.name : '(No assembly name)';
      }

      text += ' - ';

      if (!item.manufacturingStep.code && !item.manufacturingStep.name) {
        text += '(No manufacturing step information)';
      } else {
        text += item.manufacturingStep.code
          ? item.manufacturingStep.code
          : '(No manufacturing step number)';
        text += ' ';
        text += item.manufacturingStep.name
          ? item.manufacturingStep.name
          : '(No manufacturing step name)';
      }

      return text;
    },
    getOrderInformationText(orderId) {
      const orderDescription = this.getOrderDescription(orderId);
      const orderCode = this.getOrderCode(orderId);

      if (orderDescription !== orderCode) {
        return `${orderCode} ${orderDescription}`;
      } else {
        return orderCode;
      }
    },
    getOrderDescription(orderId) {
      const order = this.inspectionOrders.find((o) => o._id === orderId);

      if (order) {
        if (order.inspectionDescriptionShort && order.inspectionDescriptionShort.length) {
          return order.inspectionDescriptionShort[0].value.trim();
        }
        if (order.inspectionCode && order.inspectionCode.length) {
          return order.inspectionCode[0].value;
        }
      }

      return orderId;
    },
    getOrderCode(orderId) {
      const order = this.inspectionOrders.find((o) => o._id === orderId);

      if (order) {
        if (order.inspectionCode && order.inspectionCode.length) {
          return order.inspectionCode[0].value;
        }
      }

      return orderId;
    },
    emitOrderInfo(orderId = null) {
      const meta = { ...this.value };

      const order = this.inspectionOrders.find((o) => o._id === orderId);
      // use null as default value to make sure that changes that set a meta information to an empty value are correctly send to other machines
      // undefined is ignored when forwarding events to other machines
      let orderName = null;
      let orderCode = null;
      let assemblyGroupId = null;
      let assemblyGroupName = null;
      let manufacturingStepId = null;
      let manufacturingStepName = null;
      if (order) {
        if (order.inspectionDescriptionShort && order.inspectionDescriptionShort.length) {
          orderName = order.inspectionDescriptionShort[0].value;
        }
        if (order.inspectionCode && order.inspectionCode.length) {
          orderCode = order.inspectionCode[0].value;
        }
        assemblyGroupId = order.assemblyGroup.id;
        assemblyGroupName = order.assemblyGroup.name;
        manufacturingStepId = order.manufacturingStep.id;
        manufacturingStepName = order.manufacturingStep.name;
      }

      meta['_5i-Inspection-Order-ID'] = orderId;
      meta['_5i-Inspection-Order-Code'] = orderCode;
      meta['_5i-Inspection-Order-Shortdescription'] = orderName;
      meta['_5i-Assembly-Group-ID'] = assemblyGroupId;
      meta['_5i-Assembly-Group-Name'] = assemblyGroupName;
      meta['_5i-Manufacturing-Step-ID'] = manufacturingStepId;
      meta['_5i-Manufacturing-Step-Name'] = manufacturingStepName;

      this.$emit('input', meta);

      this.$emit('changed', [
        '_5i-Inspection-Order-ID',
        '_5i-Inspection-Order-Code',
        '_5i-Inspection-Order-Shortdescription',
        '_5i-Assembly-Group-ID',
        '_5i-Assembly-Group-Name',
        '_5i-Manufacturing-Step-ID',
        '_5i-Manufacturing-Step-Name',
      ]);
    },
    async requestOrders() {
      // prevent that this function executes more than once at the same time
      if (this.requestingOrders) {
        return;
      }
      this.requestingOrders = true;

      // remove a current timeout that would run the function in the future
      this.removeOrderRequestTimeout();

      this.label = 'Inspection Order';

      try {
        const inspectionPlanData = await fifthIndustryInterface.getInspectionPlanData(
          this.planId,
          this.processType === 'template' ? 'template' : 'entity',
        );

        if (inspectionPlanData.assemblyGroup) {
          const inspectionOrders = inspectionPlanData.assemblyGroup.flatMap((group) => {
            let groupName;

            if (Array.isArray(group.assemblyGroupName) && group.assemblyGroupName.length) {
              groupName = group.assemblyGroupName[0].value;
            }

            let groupNumber;

            if (Array.isArray(group.assemblyGroupNumber) && group.assemblyGroupNumber.length) {
              groupNumber = group.assemblyGroupNumber[0].value;
            }

            return group.manufacturingStep.flatMap((step) => {
              let stepName;

              if (Array.isArray(step.manufacturingStepName) && step.manufacturingStepName.length) {
                stepName = step.manufacturingStepName[0].value;
              }

              let stepCode;

              if (Array.isArray(step.manufacturingStepCode) && step.manufacturingStepCode.length) {
                stepCode = step.manufacturingStepCode[0].value;
              }

              return step.inspectionOrders.map((order) => ({
                ...order,
                assemblyGroup: {
                  name: groupName,
                  number: groupNumber,
                  id: group._id,
                },
                manufacturingStep: {
                  name: stepName,
                  code: stepCode,
                  id: step._id,
                },
              }));
            });
          });

          this.inspectionOrders = inspectionOrders;
        } else {
          this.inspectionOrders = [];
        }
      } catch (err) {
        this.label = err.message;
      }

      this.requestingOrders = false;

      // run the request again after a timeout
      this.orderRequestTimeout = setTimeout(() => {
        this.requestOrders();
      }, 10000);
    },
    removeOrderRequestTimeout() {
      if (this.orderRequestTimeout) {
        clearTimeout(this.orderRequestTimeout);
      }
    },
  },
  beforeDestroy() {
    this.removeOrderRequestTimeout();
  },
  watch: {
    planId: {
      handler() {
        if (this.planId) {
          this.requestOrders();
        } else {
          this.removeOrderRequestTimeout();
        }
      },
      immediate: true,
    },
  },
};
</script>
