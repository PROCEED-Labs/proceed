<template>
  <layout v-if="_5iEnabled && showComponent">
    <template #type>Inspection Plan{{ processType === 'template' ? ' Template' : '' }}</template>
    <template #content>
      <v-switch
        v-model="isUsing"
        :disabled="locked || disabled"
        label="Use 5thIndustry as User Task App"
      ></v-switch>
      <div v-if="isUsing">
        <v-combobox
          id="inspectionPlanSelection"
          :items="processType === 'template' ? inspectionPlanTemplates : inspectionPlans"
          item-value="_id"
          :loading="loading"
          persistent-hint
          :messages="inputHint"
          :label="inputLabel"
          :return-object="false"
          :value="currentPlanId"
          :error-messages="error"
          @change="emitChange"
          :clearable="!locked"
          :readonly="locked"
          :disabled="disabled"
          outlined
        >
          <template v-if="showTemplates" #prepend-item>
            <v-list-item>
              <v-list-item-action style="width: 100%">
                <v-menu offset-y>
                  <template #activator="{ on, attrs }">
                    <v-btn style="width: 100%" color="primary" v-bind="attrs" v-on="on">
                      Create New IuT-Plan from IuT-Template
                    </v-btn>
                  </template>
                  <v-list>
                    <v-list-item v-for="(template, index) in inspectionPlanTemplates" :key="index">
                      <v-list-item-title @click="emitChange(template._id, true)">{{
                        `${template.title[0].value} - ${template.createdBy.createdAt}`
                      }}</v-list-item-title>
                      <v-list-item-action>
                        <v-btn color="primary" small icon @click="editPlan(template._id, true)">
                          <v-icon> mdi-wrench </v-icon>
                        </v-btn>
                      </v-list-item-action>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </v-list-item-action>
            </v-list-item>
          </template>
          <template #selection> {{ currentPlanName }} </template>
          <template v-if="currentPlanIsValidated" #append>
            <v-btn color="primary" small icon @click="editPlan(currentPlanId)">
              <v-icon> mdi-wrench </v-icon>
            </v-btn>
          </template>
          <template #item="{ item, on, attrs }">
            <v-list-item>
              <v-list-item-content>
                <v-list-item-title v-bind="attrs" v-on="on">{{
                  getCompletePlanInfo(item._id)
                }}</v-list-item-title>
              </v-list-item-content>

              <v-list-item-action>
                <v-btn color="primary" small icon @click="editPlan(item._id)">
                  <v-icon> mdi-wrench </v-icon>
                </v-btn>
              </v-list-item-action>
            </v-list-item>
          </template>
        </v-combobox>
        <div v-if="currentPlan">
          <v-text-field
            disabled
            :label="`${currentPlan.type === 'template' ? 'Template' : 'Plan'} Id`"
            filled
            :value="currentPlanId"
          />
          <v-text-field
            v-if="currentPlan.type !== 'template'"
            disabled
            label="Job Name"
            filled
            :value="currentJobName"
          />
          <v-text-field disabled label="Creation Time" filled :value="currentCreationTime" />
        </div>
      </div>
    </template>
  </layout>
</template>
<script>
import { fifthIndustryInterface } from '@/frontend/backend-api/index.js';

import { normalizeUrl } from '@/frontend/components/5thIndustry/5thIndustryHelper.js';

import Layout from './5thIndustryLayout.vue';

export default {
  components: { Layout },

  props: [
    'value',
    'enableTemplateSelection',
    'processType',
    'showTemplates',
    'isInProcessForm',
    'locked',
    'disabled',
  ],

  data() {
    return {
      inspectionPlans: [],
      inspectionPlanTemplates: [],
      isUsing:
        typeof this.value['_5i-Inspection-Plan-ID'] === 'string' ||
        typeof this.value['_5i-Inspection-Plan-Template-ID'] === 'string',
      loading: false,
      showComponent:
        this.processType === 'project' || this.processType === 'template' ? true : false,
      error: null,
    };
  },
  computed: {
    applicationURL() {
      return normalizeUrl(this.$store.getters['configStore/config']._5thIndustryApplicationURL);
    },
    apiURL() {
      return normalizeUrl(this.$store.getters['configStore/config']._5thIndustryAPIURL);
    },
    _5iEnabled() {
      return !!(this.applicationURL && this.apiURL);
    },
    currentPlanId() {
      return this.value['_5i-Inspection-Plan-ID'] || this.value['_5i-Inspection-Plan-Template-ID'];
    },
    currentPlan() {
      return this.getPlan(this.currentPlanId);
    },
    currentPlanIsValidated() {
      if (!this.currentPlanId) {
        return false;
      } else {
        return this.inspectionPlans.some((plan) => plan._id === this.currentPlanId);
      }
    },
    currentPlanName() {
      return this.getPlanName(this.currentPlanId);
    },
    currentJobName() {
      return this.getPlanJobName(this.currentPlanId);
    },
    currentCreationTime() {
      return this.getPlanCreationTime(this.currentPlanId);
    },
    inputHint() {
      // Show hint when submitting would automatically create a new plan in the 5thIndustry app
      if (this.isInProcessForm && this.processType === 'project') {
        if (!this.currentPlan) {
          return 'Since no existing IuT-Plan or IuT-Template was selected, pressing "Add Project" will create a new IuT-Plan within the Factory App.';
        } else if (this.currentPlan.type === 'template') {
          return 'Pressing "Add Project" will create an IuT-Plan within the Factory App using the the selected plan template!';
        }
      }

      return '';
    },
    inputLabel() {
      if (!this.currentPlan) {
        return this.processType === 'template' ? 'Select Template' : 'Select Plan';
      } else {
        return this.currentPlan.type === 'template' ? 'Template' : 'Plan';
      }
    },
  },
  methods: {
    getPlan(planId) {
      let plan;

      if (planId) {
        if (this.inspectionPlans) {
          plan = this.inspectionPlans.find((p) => p._id === planId);
        }

        if (!plan && this.inspectionPlanTemplates) {
          plan = this.inspectionPlanTemplates.find((t) => t._id === planId);
        }
      }

      return plan;
    },
    openPlanCreation(templateId) {
      window.open(`${this.applicationURL}/plans/build/${templateId}`);
    },
    editPlan(planId, isTemplate = this.processType === 'template') {
      if (!isTemplate) {
        window.open(`${this.applicationURL}/plans/edit/${planId}`);
      } else {
        window.open(`${this.applicationURL}/planTemplates/edit/${planId}`);
      }
    },
    getPlanName(planId) {
      const plan = this.getPlan(planId);

      if (plan) {
        return plan.title[plan.title.length - 1].value;
      }

      return planId;
    },
    getPlanJobName(planId) {
      const plan = this.getPlan(planId);

      if (plan && plan.type !== 'template') {
        return plan.jobName;
      }

      return undefined;
    },
    getPlanCreationTime(planId) {
      const plan = this.getPlan(planId);

      if (plan) {
        return new Date(plan.createdBy.createdAt).toUTCString();
      }

      return undefined;
    },
    getCompletePlanInfo(planId) {
      const plan = this.getPlan(planId);

      if (plan) {
        if (plan.type === 'template') {
          return `${this.getPlanName(planId)} - ${this.getPlanCreationTime(planId)}`;
        } else {
          return `${this.getPlanName(planId)} - ${this.getPlanJobName(
            planId
          )} - ${this.getPlanCreationTime(planId)}`;
        }
      }

      return planId;
    },
    emitChange(planId = null) {
      let meta = { ...this.value };

      let plan = this.getPlan(planId);

      // reset templateId and set with new value if plan with given id exists
      // use null as default value to make sure that changes that set a meta information to an empty value are correctly send to other machines
      // undefined is ignored when forwarding events to other machines
      let templateId = null;
      let title = null;
      let applicationAddress = null;
      let apiAddress = null;
      if (plan) {
        if (plan.type === 'template') {
          templateId = planId;
          planId = null;
        } else {
          templateId = plan.templateId;
        }

        apiAddress = this.apiURL;
        applicationAddress = this.applicationURL;
        title = plan.title[0].value;
      }

      meta['_5i-Inspection-Plan-ID'] = planId;
      meta['_5i-Inspection-Plan-Template-ID'] = templateId;
      meta['_5i-Inspection-Plan-Title'] = title;
      meta['_5i-API-Address'] = apiAddress;
      meta['_5i-Application-Address'] = applicationAddress;

      const changes = [
        '_5i-Inspection-Plan-ID',
        '_5i-Inspection-Plan-Template-ID',
        '_5i-Inspection-Plan-Title',
        '_5i-API-Address',
        '_5i-Application-Address',
      ];

      if (planId) {
        meta.orderCode = plan.jobName;
        meta.customerName = plan.customer;
        meta.orderNumber = plan.customerOrderNo;
        meta.orderName = title;
        changes.push('orderCode', 'customerName', 'orderNumber', 'orderName');
      }

      this.$emit('input', meta);
      this.$emit('changed', changes);
    },
    async requestPlans(type = this.processType === 'template' ? 'template' : 'entity') {
      this.loading = true;
      let plans = [];
      try {
        plans = await fifthIndustryInterface.getInspectionPlans(type);
      } catch (err) {
        this.error = err.message;
      }
      this.loading = false;
      plans = plans.map((plan) => ({ ...plan, type }));
      return plans;
    },
  },
  watch: {
    isUsing: {
      async handler() {
        this.value.isUsing5i = this.isUsing;
        if (this.isUsing) {
          this.$emit('input', this.value);
          this.inspectionPlans = await this.requestPlans();
          this.inspectionPlanTemplates = await this.requestPlans('template');
        } else {
          this.emitChange(undefined);
        }
      },
      immediate: true,
    },
    currentPlanId(newPlanId, oldPlanId) {
      // make sure to enable 5I usage if a plan is set from outside
      if (!oldPlanId && newPlanId) {
        this.isUsing = true;
      }
      // set toggle back to false if we switched to a process that isn't using 5i
      if (!newPlanId && !this.value.isUsing5i) {
        this.isUsing = false;
      }
    },
  },
};
</script>
