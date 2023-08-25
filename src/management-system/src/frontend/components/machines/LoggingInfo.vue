<template>
  <v-dialog :value="show" max-width="900px" @input="$emit('close')" scrollable>
    <v-card style="overflow-x: hidden">
      <v-card-title>
        <v-icon class="mr-3">mdi-cellphone-link</v-icon>
        Log Entries
        <v-spacer />
        <span class="body-1">Adjust font size:</span>
        <v-icon @click="fontSize += 1.5">mdi-arrow-up</v-icon>
        <v-icon @click="fontSize -= 1.5">mdi-arrow-down</v-icon>
      </v-card-title>
      <v-card-text class="ml-3">
        <div v-for="(logTypeObj, logType) in logging" :key="logType">
          <div class="pt-2 font-weight-medium">
            {{
              logType == 'standard'
                ? 'Standard log messages:'
                : `Process log messages for process ${logType}:`
            }}
          </div>
          <div v-for="(entry, index) in logTypeObj" :key="index">
            <div v-for="(object, id) in entry" :key="id">
              <div id="logRows" :style="{ fontSize: fontSize + 'px' }">
                <span :class="colorCoding[object.level]">
                  {{ new Intl.DateTimeFormat('en-GB', options).format(new Date(object.time)) }}
                  {{ ' ' + object.level.toUpperCase() + ': ' }}
                </span>
                {{ object.moduleName }} {{ object.msg }}
              </div>
              <v-divider />
            </div>
          </div>
        </div>
      </v-card-text>
      <v-card-actions style="justify-content: right">
        <v-btn @click="$emit('close')">Cancel</v-btn>
        <v-btn :disabled="!$can('manage', 'Machine')" color="primary" @click="exportLoggingInfo()"
          >Export</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'LoggingInfo',
  props: {
    logging: {
      type: Object,
    },
    show: {
      type: Boolean,
      required: true,
    },
  },
  data() {
    return {
      fontSize: 12,
      options: {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      },
      colorCoding: {
        info: 'green--text',
        debug: 'blue--text',
        warn: 'orange--text',
        trace: 'light-blue--text',
        error: 'red--text',
        fatal: 'red-darken-4--text',
      },
      small: true,
    };
  },
  methods: {
    exportLoggingInfo() {
      let textFile = '';
      const logTypes = Object.keys(this.logging);
      logTypes.forEach((logType) => {
        this.logging[logType].forEach((entry) => {
          const ob = entry[Object.keys(entry)[0]];
          const row = `${new Intl.DateTimeFormat('en-GB', this.options).format(
            new Date(ob.time),
          )} [${ob.level.toUpperCase()}]: ${ob.moduleName} ${ob.msg}`;
          textFile += `${row}\n`;
        });
      });
      this.download('logging.txt', textFile);
    },
    download(filename, text) {
      const element = document.createElement('a');
      element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`);
      element.setAttribute('download', filename);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    },
  },
};
</script>
