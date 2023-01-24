<template>
  <div class="wrapper">
    <v-dialog v-model="showCurrencyCreationDialog" max-width="400px" scrollable>
      <v-card>
        <v-card-title>
          <span class="headline mx-0">Create Currency</span>
        </v-card-title>
        <v-card-text>
          <v-form ref="currency-form" v-model="isFormValid" @submit.prevent>
            <v-text-field v-model="newCurrency.name" label="Name" required />
            <v-text-field v-model="newCurrency.cc" label="Currency Code" required />
            <v-text-field v-model="newCurrency.symbol" label="Symbol" required />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn small @click="showCurrencyCreationDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            small
            :disabled="
              !isFormValid || !newCurrency.name || !newCurrency.symbol || !newCurrency.symbol
            "
            @click="addCurrency()"
          >
            Add
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-toolbar>
      <v-toolbar-title>Environment</v-toolbar-title>
    </v-toolbar>
    <div class="d-flex fill-height">
      <v-list class="pt-0" style="border-right: 1px solid lightgrey">
        <v-list-item-group mandatory v-model="selectedConfig" color="primary">
          <v-list-item v-for="(item, i) in configSection" :key="i" class="px-6">
            <v-list-item-content>
              <v-list-item-title v-text="item.text"></v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </v-list-item-group>
      </v-list>
      <CompanyInfo
        v-if="
          configSection[selectedConfig] && configSection[selectedConfig].text === 'Company Info'
        "
      ></CompanyInfo>
      <Milestones
        v-if="configSection[selectedConfig] && configSection[selectedConfig].text === 'Milestones'"
      >
      </Milestones>
      <Resources
        v-if="configSection[selectedConfig] && configSection[selectedConfig].text === 'Resources'"
      ></Resources>
      <corporate-structure
        v-if="
          configSection[selectedConfig] &&
          configSection[selectedConfig].text === 'Corporate Structure'
        "
      ></corporate-structure>
      <v-container
        v-if="configSection[selectedConfig] && configSection[selectedConfig].text === 'Settings'"
      >
        <v-card class="text-center" style="border-style: solid">
          <v-tabs grow>
            <v-tab>
              <v-spacer />
              Settings
              <v-spacer />
              <v-btn color="primary" @click="saveChanges()">SAVE</v-btn>
            </v-tab>
            <v-tab-item>
              <v-list-item id="setting-item">
                <v-list-item-content>
                  <v-list-item-title>Currency</v-list-item-title>
                </v-list-item-content>

                <v-list-item-action style="flex-direction: row; align-items: center">
                  <v-autocomplete
                    v-model="settingsCopy.currency"
                    return-object
                    :items="availableCurrencies"
                    :item-text="(item) => `${item.name} (${item.cc}) - ${item.symbol}`"
                  >
                    <template v-slot:no-data>
                      <v-list-item @click.stop="showCurrencyCreationDialog = true">
                        <v-list-item-title>No result found. Create new currency?</v-list-item-title>
                        <v-list-item-action><v-icon>mdi-plus</v-icon></v-list-item-action>
                      </v-list-item>
                    </template>
                  </v-autocomplete>
                </v-list-item-action>
              </v-list-item>
            </v-tab-item>
          </v-tabs>
        </v-card>
      </v-container>
    </div>
  </div>
</template>

<script>
import worldCurrencies from '@/frontend/assets/worldCurrencies.json';
import Milestones from '@/frontend/components/environment/Milestones.vue';
import Resources from '@/frontend/components/environment/Resources.vue';
import CorporateStructure from '@/frontend/components/environment/CorporateStructure.vue';
import CompanyInfo from '@/frontend/components/environment/CompanyInfo.vue';
export default {
  components: { CompanyInfo, Resources, CorporateStructure, Milestones },
  data() {
    return {
      showCurrencyCreationDialog: false,
      isFormValid: false,
      newCurrency: {},
      selectedConfig: 0,
      configSection: [
        { text: 'Company Info' },
        { text: 'Milestones' },
        { text: 'Resources' },
        { text: 'Corporate Structure' },
        { text: 'Settings' },
      ],
      settingsCopy: { ...this.settings },
      worldCurrencies: worldCurrencies,
    };
  },
  computed: {
    availableCurrencies() {
      if (this.settingsCopy.currency) {
        return [...this.worldCurrencies, this.settingsCopy.currency];
      }
      return this.worldCurrencies;
    },
    settings() {
      return this.$store.getters['environmentConfigStore/settings'];
    },
  },
  mounted() {
    this.settingsCopy = { ...this.settings };
  },
  methods: {
    addCurrency() {
      this.$set(this.settingsCopy, 'currency', this.newCurrency);
      this.showCurrencyCreationDialog = false;
    },
    saveChanges() {
      this.$store.dispatch('environmentConfigStore/updateSettings', this.settingsCopy);
    },
  },
  watch: {
    settings(newSettings) {
      this.settingsCopy = { ...newSettings };
    },
  },
};
</script>
<style lang="scss" scoped>
.wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
