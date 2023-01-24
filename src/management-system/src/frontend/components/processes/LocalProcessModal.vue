<template>
  <v-dialog :value="isLoggedIn && !!localProcesses.length" max-width="960px" scrollable persistent>
    <v-card>
      <v-card-title> You have {{ lowerCaseType }} stored in your browser. </v-card-title>
      <v-card-text>
        <v-container>
          <v-row>
            <v-col>
              Please select the {{ lowerCaseType }} to be stored as your private
              {{ lowerCaseType }} on the server. All {{ lowerCaseType }} that were not selected will
              be deleted!
            </v-col>
          </v-row>
          <v-row>
            <v-col>
              <process-data-table
                :processes="localProcesses"
                noActions
                :selected.sync="selected"
              ></process-data-table>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
      <v-card-actions style="justify-content: end">
        <v-btn color="error" @click="handleLocalProcesses">Continue</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
<script>
import ProcessDataTable from './datatable/ProcessDatatable.vue';

export default {
  components: { ProcessDataTable },
  props: {
    processType: { type: String, required: true },
    processes: { type: Array, required: true },
  },
  computed: {
    lowerCaseType() {
      return this.processType.toLowerCase();
    },
    localProcesses() {
      return this.processes.filter((process) => process.shared === false && !process.owner);
    },
    isLoggedIn() {
      return this.$store.getters['authStore/isAuthenticated'];
    },
  },
  data() {
    return {
      selected: [],
    };
  },
  methods: {
    async handleLocalProcesses() {
      // get information for selected processes
      const { id: owner } = this.$store.getters['authStore/getUser'];
      const selectedProcessDataPromises = this.selected.map(async (p) => {
        const process = { ...p, owner };
        const bpmn = await this.$store.getters['processStore/xmlById'](p.id);
        const htmlMapping = await this.$store.getters['processStore/htmlMappingById'](p.id);
        return { processInformation: { process, bpmn }, htmlMapping };
      });
      const selectedProcessData = await Promise.all(selectedProcessDataPromises);
      // delete all processes from local storage
      const deletePromises = this.localProcesses.map(async (process) => {
        await this.$store.dispatch('processStore/remove', process);
      });
      await Promise.all(deletePromises);

      // readd all selected processes under as owned by the current user
      const addPromises = selectedProcessData.map(async ({ processInformation, htmlMapping }) => {
        await this.$store.dispatch('processStore/add', processInformation);

        Object.entries(htmlMapping).forEach(async ([taskFileName, html]) => {
          await this.$store.dispatch('processStore/saveUserTask', {
            processDefinitionsId: processInformation.process.id,
            taskFileName,
            html,
          });
        });
      });

      await Promise.all(addPromises);
    },
  },
};
</script>
