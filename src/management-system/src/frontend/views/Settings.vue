<template>
  <div>
    <v-toolbar>
      <v-toolbar-title>Settings</v-toolbar-title>
      <v-spacer />
      <v-btn color="primary" @click="triggerSaving">Save</v-btn>
    </v-toolbar>

    <AlertWindow :popupData="onSavePopupData" />

    <v-container fluid>
      <v-row justify="center">
        <v-col class="text-center centered">
          <v-card>
            <v-tabs grow>
              <v-tab>Management System</v-tab>
              <v-tab>Engine</v-tab>
              <v-tab-item>
                <settings-list
                  :settings="config"
                  :save="saveConfig"
                  @valueChanged="commitChange('config', $event)"
                />
              </v-tab-item>
              <v-tab-item>
                <settings-list
                  :settings="engineConfig"
                  :save="saveEngineConfig"
                  @valueChanged="commitChange('engineConfig', $event)"
                />
              </v-tab-item>
            </v-tabs>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script>
import SettingsList from '@/frontend/components/settings/SettingsList.vue';
import AlertWindow from '@/frontend/components/universal/Alert.vue';

/**
 * @module views
 */
/**
 * @memberof module:views
 * @module Vue:Settings
 *
 * @vue-computed config
 * @vue-computed engineConfig
 * @vue-computed userPreferences
 */
export default {
  components: { SettingsList, AlertWindow },
  data() {
    return {
      /** */
      saveConfig: false,
      /** */
      saveEngineConfig: false,
      /** */
      onSavePopupData: {
        body: 'Changes saved',
        display: 'none',
        color: 'success',
      },
    };
  },
  computed: {
    config() {
      return this.$store.getters['configStore/config'];
    },
    engineConfig() {
      return this.$store.getters['configStore/engineConfig'];
    },
    userPreferences() {
      return this.$store.getters['userPreferencesStore/getUserConfig'];
    },
  },
  methods: {
    /** */
    openPopup() {
      this.onSavePopupData.display = 'block';
      setTimeout(() => {
        this.onSavePopupData.display = 'none';
      }, 2500);
    },
    /** */
    triggerSaving() {
      this.saveConfig = true;
      this.saveEngineConfig = true;

      this.openPopup();
    },
    /**
     * Saves the changed config values in our store and restarts the engine if necessary
     */
    async commitChange(target, updatedValues) {
      if (target === 'config') {
        this.$store.dispatch('configStore/changeConfigValues', updatedValues);
        this.saveConfig = false;
      } else if (target === 'engineConfig') {
        // wait until all config changes were applied to the engine
        await this.$store.dispatch('configStore/changeEngineConfigValues', updatedValues);

        // restart the engine if it is running to use possible config changes
        if (this.$root.engine.publishing) {
          await this.$root.engine.toggleSilentMode();
          await this.$root.engine.toggleSilentMode();
        }

        this.saveEngineConfig = false;
      }
    },
  },
};
</script>
<style lang="scss" scoped></style>
