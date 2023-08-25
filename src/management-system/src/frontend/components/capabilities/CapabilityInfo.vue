<template>
  <v-card class="text-left my-2">
    <v-card-text>
      <div>
        <span class="font-weight-medium">Capability: </span>
        <a @click.prevent="openInBrowser(capability.schema)">
          {{ capability.schema }}
        </a>
      </div>
      <v-divider class="my-2" />
      <div class="subheading">Parameters:</div>
      <div v-for="(p, index) in capability.parameters" :key="'detailParameters' + index">
        <v-divider v-if="index != 0" class="mt-2 ml-3" />
        <div class="body-2 my-2 pl-3">{{ p.kindOfParameter | formatted }}</div>
        <v-card class="mb-2 ml-3">
          <div class="pt-2">
            <span class="font-weight-medium">Kind of Parameter: </span>
            <a @click.prevent="openInBrowser(p.schema)">{{ p.schema }}</a>
          </div>
          <div>
            <span class="font-weight-medium">Data Type: </span>
            {{ p.type }}
          </div>
          <div v-if="p.subTypes">
            <span class="font-weight-medium">Sub Types: </span>
            <ul>
              <li v-for="type in p.subTypes" :key="capability.schema + index + type.name">
                <a @click="$emit('parameterClick', type)">
                  {{ type.name }}
                </a>
              </li>
            </ul>
          </div>
          <div><span class="font-weight-medium">Unit: </span>{{ p.unit }}</div>
          <div>
            <span class="font-weight-medium">Encoding: </span>
            {{ p.encoding ? p.encoding : 'No special encoding' }}
          </div>
          <div>
            <span class="font-weight-medium">Default Value: </span>
            {{ p.default }}
          </div>
          <div>
            <span class="font-weight-medium">Validators: </span>
            <ul>
              <li v-for="v in p.validators" :key="capability.schema + index + v.rule">
                {{ v.type }}: {{ v.rule }}
              </li>
            </ul>
          </div>
        </v-card>
      </div>
      <div class="subheading">Return Value:</div>
      <div v-for="(r, index) in capability.returnValues" :key="'detailReturnValues' + index">
        <v-divider v-if="index != 0" class="mt-2 ml-3" />
        <v-card class="mb-2 ml-3">
          <div class="pt-2">
            <span class="font-weight-medium">Kind of Parameter: </span>
            <a @click.prevent="openInBrowser(r.schema)">{{ r.schema }}</a>
          </div>
          <div><span class="font-weight-medium">Data Type: </span>{{ r.type }}</div>
          <div v-if="r.subTypes">
            <span class="font-weight-medium">Sub Types: </span>
            <ul>
              <li v-for="type in r.subTypes" :key="r.schema + index + type.name">
                <a @click="$emit('parameterClick', type)">
                  {{ type.name }}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <span class="font-weight-medium">Unit: </span>
            {{ r.unit }}
          </div>
          <div>
            <span class="font-weight-medium">Encoding: </span>
            {{ r.encoding ? r.encoding : 'No special encoding' }}
          </div>
          <div>
            <span class="font-weight-medium">Default Value: </span>
            {{ r.default }}
          </div>
          <div>
            <span class="font-weight-medium">Validators: </span>
            <ul>
              <li v-for="(v, index) in r.validators" :key="r.schema + index + v.rule">
                {{ v.type }}: {{ v.rule }}
              </li>
            </ul>
          </div>
        </v-card>
      </div>
      <div v-if="machinesByIds(capability.machineIds).length != 0">
        <span class="font-weight-medium mb-2">Machines: </span>
        <div v-for="(machine, index) in machinesByIds(capability.machineIds)" :key="index">
          <span>
            <a @click.prevent="$emit('machineClick', machine)">
              {{ machine.optionalName || machine.name }}
            </a>
          </span>
        </div>
      </div>
      <div v-else>
        <span class="font-weight-medium mb-2">Machines: </span>
        <span>Currently not available on any machines</span>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  props: {
    capability: Object,
  },
  methods: {
    machinesByIds(ids) {
      if (!Array.isArray(ids)) {
        return [this.$store.getters['machineStore/machineById'](ids)];
      }
      return this.$store.getters['machineStore/machines'].filter((machine) =>
        ids.some((id) => machine.id === id),
      );
    },
    /**
     * Open the clicked item in browser, if it is a proper link, otherwise show a warning
     * @param url The link to be opened
     */
    openInBrowser(url) {
      let linkToOpen = url;
      // eslint-disable-next-line no-useless-escape
      const pattern = /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=.]+$/gm;
      if (pattern.test(url)) {
        if (!url.startsWith('https://') && !url.startsWith('http://')) {
          if (!url.startsWith('www.')) {
            linkToOpen = 'https://www.'.concat(url);
          } else {
            linkToOpen = 'https://'.concat(url);
          }
        }
        window.open(linkToOpen);
      } else {
        this.$emit('openpopup');
      }
    },
  },
  filters: {
    /**
     * Display parameters without the URI, as a string if an array of elements provided
     * @param value the element to be formatted
     */
    // eslint-disable-next-line consistent-return
    formatted(value) {
      if (Array.isArray(value)) {
        return value
          .map((x) => x.kindOfValue.split('/').pop())
          .toString()
          .replace(/,/g, ', ');
      }
      if (typeof value === 'string') {
        return value.split('/').pop();
      }
    },
  },
};
</script>
