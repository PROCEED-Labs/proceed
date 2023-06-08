<template>
  <div v-if="!!item">
    <div class="pt-2">
      <span class="font-weight-medium">Platform: </span>
      {{ item.os ? item.os.distro : '' }}
    </div>
    <div class="pt-2">
      <span class="font-weight-medium">Battery: </span>
      {{ item.battery ? item.battery.percent : '' }}%
    </div>
    <v-row>
      <v-col cols="12" sm="6">
        <div>
          <span class="font-weight-medium">Memory Info: </span>
          <v-divider />
          <canvas id="myMemoryChart" width="300" height="130"></canvas>
        </div>
      </v-col>
      <v-col cols="12" sm="6">
        <div>
          <span class="font-weight-medium">CPU Info: </span>
          <v-divider />
          <canvas id="myChart" width="300" height="130"></canvas>
        </div>
      </v-col>
    </v-row>
    <div>
      <span class="font-weight-medium"> CPU Load Last Minute: </span>{{ item.cpuLoadLastMinute }}%
    </div>
    <div>
      <span class="font-weight-medium"> CPU Load Last Ten Minutes: </span
      >{{ item.cpuLoadLastTenMinutes }}%
    </div>
    <div>
      <span class="font-weight-medium"> CPU Load Last Half Hour: </span
      >{{ item.cpuLoadLastHalfHour }}%
    </div>
    <div>
      <span class="font-weight-medium"> CPU Load Last Hour: </span>{{ item.cpuLoadLastHour }}%
    </div>
    <div>
      <span class="font-weight-medium"> CPU Load Last Half Day: </span
      >{{ item.cpuLoadLastHalfDay }}%
    </div>
    <div>
      <span class="font-weight-medium"> CPU Load Last Day: </span>{{ item.cpuLoadLastDay }}%
    </div>
    <div>
      <span class="font-weight-medium"> Inputs: </span
      >{{ item.inputs ? item.inputs.join(', ') : 'none' }}
    </div>
    <div>
      <span class="font-weight-medium"> Outputs: </span
      >{{ item.outputs ? item.outputs.join(', ') : 'none' }}
    </div>
    <div>
      <span class="font-weight-medium"> Domains: </span
      >{{ item.domains ? item.domains.join(', ') : 'none' }}
    </div>
    <div>
      <span class="font-weight-medium"> Currently connected environments: </span>
      {{
        item.currentlyConnectedEnvironments ? item.currentlyConnectedEnvironments.join(', ') : ''
      }}
    </div>
    <div v-if="item.display">
      <span class="font-weight-medium"> Displays: </span>
      <ul>
        <li min-height="10px" v-for="(display, i) in item.display" :key="i">
          {{ display.currentResX }}x{{ display.currentResY }}
        </li>
      </ul>
    </div>
    <div>
      <span class="font-weight-medium"> Classes: </span
      >{{ item.classes ? item.classes.join(', ') : '' }}
    </div>
    <div>
      <span class="font-weight-medium"> Online: </span>
      <v-icon class="mt-n1" v-if="item.online" color="success" small> mdi-wifi </v-icon>
      <v-icon class="mt-n1" v-else color="error" small>mdi-wifi-off</v-icon>
    </div>
    <div>
      <span class="font-weight-medium"> Online checking addresses: </span>
      {{ item.onlineCheckingAddresses ? item.onlineCheckingAddresses.join(', ') : '' }}
    </div>
    <div>
      <span class="font-weight-medium"> Accept User Tasks: </span>
      {{ item.acceptUserTasks ? 'Yes' : 'No' }}
    </div>
    <div>
      <span class="font-weight-medium"> Deactivate Process Execution: </span>
      {{ item.deactivateProcessExecution ? 'Yes' : 'No' }}
    </div>
    <div v-if="item.network">
      <span class="font-weight-medium"> Networks: </span>
      <v-card class="ml-1 mb-1" v-for="network in item.network" :key="network.mac">
        <div class="ml-2">Type: {{ network.type }}</div>
        <div class="ml-2">IP4: {{ network.ip4 }}</div>
        <div class="ml-2">Netmask V4: {{ network.netmaskv4 }}</div>
        <div class="ml-2">IP6: {{ network.ip6 }}</div>
        <div class="ml-2">Netmask V6: {{ network.netmaskv6 }}</div>
        <div class="ml-2">Mac: {{ network.mac }}</div>
      </v-card>
    </div>
    <div v-if="item.deployedProcesses">
      <span class="font-weight-medium"> Process Instances: </span>
      <span v-if="runningInstances.length">
        (Running: {{ runningInstances.length }})
        <v-btn color="error" @click="stopAllInstances()"> Stop All </v-btn>
      </span>
      <v-card class="ml-1" v-for="process in item.deployedProcesses" :key="process.definitionId">
        <div class="font-weight-medium">{{ process.name }} - {{ process.definitionId }}</div>
        <v-card class="ml-1">
          <v-row class="ml-2" v-for="instance in process.instances" :key="instance.id">
            {{ instance.processInstanceId }}({{ instance.instanceState[0] }})
          </v-row>
        </v-card>
      </v-card>
    </div>
    <div class="mt-3">
      <v-btn @click="$emit('showConfig')"> Show the configuration values of this machine </v-btn>
    </div>

    <LoggingInfo :show="loggingDialog" :logging="item.logs" @close="loggingDialog = false" />
    <div class="mt-3">
      <v-btn @click="loggingDialog = true"> Show the log entries of this machine </v-btn>
    </div>
  </div>
</template>
<script>
import Chart from 'chart.js';
import LoggingInfo from '@/frontend/components/machines/LoggingInfo.vue';
import { mapState } from 'vuex';
import { engineNetworkInterface, eventHandler } from '@/frontend/backend-api/index.js';

export default {
  props: {
    displayDetailed: String,
  },
  components: { LoggingInfo },
  data() {
    return {
      lastMemValue: 0,
      lastCpuValue: 0,
      chart: null,
      timeout: 5000,
      show: null,
      item: null,
      loggingDialog: false,
      memInitialized: false,
    };
  },
  computed: {
    machine() {
      return this.$store.getters['machineStore/machineById'](this.displayDetailed);
    },
    ...mapState({
      /**
       * Returns array with all instances that didn't finish yet for the displayed machine
       */
      runningInstances() {
        return Object.entries(this.item.deployedProcesses).reduce(
          (acc, [definitionId, deployment]) => {
            const runningInstances = deployment.instances.reduce((running, instance) => {
              if (instance.instanceState.includes('RUNNING')) {
                return [...running, instance];
              }

              return running;
            }, []);

            const instanceInfo = runningInstances.map((instance) => ({
              definitionId,
              ...instance,
            }));

            return acc.concat(instanceInfo);
          },
          []
        );
      },
    }),
  },
  methods: {
    changeTimeout(newTimeout) {
      this.timeout = newTimeout;
    },
    /**
     * Stops all running instances on the displayed machine
     */
    stopAllInstances() {
      this.runningInstances.forEach(async (instance) => {
        try {
          await engineNetworkInterface.stopInstance(instance.definitionId, instance.id);
        } catch (err) {
          this.$logger.error(`Failed to stop instance on ${this.item.name}: ${err}.`);
        }
      });
    },
    initMemoryChart(arr, mem) {
      const memoryCtx = document.getElementById('myMemoryChart').getContext('2d');
      this.memoryChart = new Chart(memoryCtx, {
        type: 'line',
        data: {
          labels: arr,
          datasets: [
            {
              label: 'Memory Load',
              borderColor: 'rgb(10, 150, 102)',
              data: new Array(60).fill(0),
              spanGaps: true,
            },
          ],
        },
        options: {
          animation: {
            duration: 0,
          },
          hover: {
            animationDuration: 0,
          },
          responsiveAnimationDuration: 0,
          elements: {
            point: {
              radius: 0,
            },
            line: {
              tension: 0,
            },
          },
          scales: {
            yAxes: [
              {
                ticks: {
                  suggestedMin: 0,
                  suggestedMax: mem.total,
                  callback: function (value, index, values) {
                    return (value / Math.pow(1024, 3)).toFixed(1) + ' GB';
                  },
                },
              },
            ],
            xAxes: [
              {
                scaleLabel: {
                  display: true,
                  labelString: 'values from the last 60s',
                },
                ticks: {
                  display: false,
                  autoSkip: true,
                  maxTicksLimit: 20,
                },
              },
            ],
          },
        },
      });
    },
  },
  async mounted() {
    // render the 2 charts for memory and cpu load, initially filled with zeros
    this.show = true;
    this.item = this.machine.machine;
    const arr = [];
    setTimeout(async () => {
      // eslint-disable-next-line no-plusplus
      for (let i = -59; i <= 0; i++) {
        arr.push(i);
      }
      const ctx = document.getElementById('myChart').getContext('2d');
      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: arr,
          datasets: [
            {
              label: 'CPU Current Load',
              borderColor: 'rgb(10, 140, 152)',
              data: new Array(60).fill(0),
              spanGaps: true,
            },
          ],
        },
        options: {
          animation: {
            duration: 0,
          },
          hover: {
            animationDuration: 0,
          },
          responsiveAnimationDuration: 0,
          elements: {
            point: {
              radius: 0,
            },
            line: {
              tension: 0,
            },
          },
          scales: {
            yAxes: [
              {
                ticks: {
                  suggestedMin: 0,
                  suggestedMax: 100,
                },
              },
            ],
            xAxes: [
              {
                scaleLabel: {
                  display: true,
                  labelString: 'values from the last 60s',
                },
                ticks: {
                  display: false,
                  autoSkip: true,
                  maxTicksLimit: 20,
                },
              },
            ],
          },
        },
      });
      if (this.item.mem) {
        this.initMemoryChart(arr, this.item.mem);
        this.memInitialized = true;
      }
    }, 0);

    eventHandler.on('newMachineInfo', ({ id, info }) => {
      if (!id || id !== this.displayDetailed || !info) {
        return;
      }

      if (info.error) {
        this.$logger.debug(info.error);
        return;
      }

      if (!this.memInitialized) {
        this.initMemoryChart(arr, info.mem);
        this.memInitialized = true;
      }

      for (let i = 1; i < this.timeout / 1000; i++) {
        this.memoryChart.data.datasets[0].data.push(null);
        this.chart.data.datasets[0].data.push(null);
      }
      this.memoryChart.data.datasets[0].data.push(info.mem.total - info.mem.free);
      this.chart.data.datasets[0].data.push(info.cpu.currentLoad);
      while (this.memoryChart.data.datasets[0].data.length > 60) {
        this.memoryChart.data.datasets[0].data.shift();
        this.chart.data.datasets[0].data.shift();
        if (this.memoryChart.data.datasets[0].data[0] !== null) {
          [this.lastMemValue] = this.memoryChart.data.datasets[0].data;
        }
        if (this.chart.data.datasets[0].data[0] !== null) {
          [this.lastCpuValue] = this.chart.data.datasets[0].data;
        }
      }
      if (this.memoryChart.data.datasets[0].data[0] === null) {
        this.memoryChart.data.datasets[0].data.shift();
        this.memoryChart.data.datasets[0].data.unshift(this.lastMemValue);
      }
      if (this.chart.data.datasets[0].data[0] === null) {
        this.chart.data.datasets[0].data.shift();
        this.chart.data.datasets[0].data.unshift(this.lastCpuValue);
      }
      this.item = {
        ...this.item,
        battery: { ...this.item.battery, percent: info.battery.percent },
        currentlyConnectedEnvironments: info.currentlyConnectedEnvironments,
        cpuLoadLastMinute: info.cpu.loadLastMinute,
        cpuLoadLastTenMinutes: info.cpu.loadLastTenMinutes,
        cpuLoadLastHalfHour: info.cpu.loadLastHalfHour,
        cpuLoadLastHour: info.cpu.loadLastHour,
        cpuLoadLastHalfDay: info.cpu.loadLastHalfDay,
        cpuLoadLastDay: info.cpu.loadLastDay,
      };
      this.chart.update();
      this.memoryChart.update();
    });

    eventHandler.on('newMachineLogs', ({ id, logs }) => {
      if (!id || id !== this.displayDetailed || !logs) {
        return;
      }

      this.item = { ...this.item, logs };
    });

    engineNetworkInterface.subscribeToMachine(this.displayDetailed);
  },
  beforeDestroy() {
    engineNetworkInterface.unsubscribeFromMachine(this.displayDetailed);
    engineNetworkInterface.unsubscribeFromMachineLogs(this.displayDetailed);
    this.show = false;
  },
  watch: {
    machine(newValue) {
      this.item = { ...this.item, ...newValue };
    },
    loggingDialog(showLog) {
      if (showLog) {
        engineNetworkInterface.subscribeToMachineLogs(this.displayDetailed);
      } else {
        engineNetworkInterface.unsubscribeFromMachineLogs(this.displayDetailed);
      }
    },
  },
};
</script>
