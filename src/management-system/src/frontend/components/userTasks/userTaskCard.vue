<template>
  <v-card
    @click.stop="$emit('click')"
    class="task rounded-lg"
    :color="isSelected ? '#0094a0' : !isUserTaskActive ? 'grey' : ''"
    :style="{ border: isSelected ? '1px solid #0094a0' : '1px solid lightgrey' }"
    :class="{
      'white--text': isSelected || !isUserTaskActive,
    }"
  >
    <div class="taskTitle">
      <v-tooltip top>
        <template v-slot:activator="{ on, attrs }">
          <span v-bind="attrs" v-on="on">{{ title }}</span>
        </template>
        <span>{{ title }}</span>
      </v-tooltip>
      <v-spacer></v-spacer>
      <v-tooltip top v-if="userTask.progress > 0">
        <template v-slot:activator="{ on, attrs }">
          <div v-bind="attrs" v-on="on">
            <v-progress-circular
              v-show="userTask.progress < 100"
              :value="userTask.progress"
              rotate="270"
              size="25"
              width="2"
              ><span class="progressText">{{
                Math.floor(userTask.progress)
              }}</span></v-progress-circular
            >
            <v-icon
              v-show="userTask.progress == 100"
              :color="isSelected || !isUserTaskActive ? 'white' : ''"
              >mdi-check-circle</v-icon
            >
          </div>
        </template>
        <span v-if="userTask.progress < 100">Current Progress of User Task</span>
        <span v-else>Maximal Progress of User Task</span>
      </v-tooltip>
    </div>
    <div class="mainInfo">
      <div class="leftCol">
        <div class="user">
          <v-tooltip top>
            <template v-slot:activator="{ on, attrs }">
              <div v-bind="attrs" v-on="on">
                <v-icon :color="isSelected || !isUserTaskActive ? 'white' : ''">mdi-account</v-icon>
                <span class="name" v-bind="attrs" v-on="on"> {{ owner }}</span>
              </div>
            </template>
            <span> {{ `Owner of User Task: ${owner}` }}</span>
          </v-tooltip>
        </div>
        <div class="priority">
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <div v-bind="attrs" v-on="on">
                <v-icon :color="isSelected || !isUserTaskActive ? 'white' : ''"
                  >mdi-alpha-p-circle</v-icon
                >
                <span> {{ userTask.priority }}/10</span>
              </div>
            </template>
            Priority of User Task
          </v-tooltip>
        </div>
        <div class="status">
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <div v-bind="attrs" v-on="on">
                <v-icon :color="isSelected || !isUserTaskActive ? 'white' : ''">mdi-tire</v-icon>
                <span>{{ userTask.state === 'READY' ? ' NEW' : ` ${userTask.state}` }}</span>
              </div>
            </template>
            Current Status of User Task
          </v-tooltip>
        </div>
      </div>
      <div class="rightCol">
        <div class="added">
          <v-tooltip top>
            <template v-slot:activator="{ on, attrs }">
              <div v-bind="attrs" v-on="on">
                <v-icon :color="isSelected || !isUserTaskActive ? 'white' : ''"
                  >mdi-calendar</v-icon
                >
                <span>
                  {{
                    new Date(userTask.startTime).toLocaleString(undefined, {
                      year: '2-digit',
                      month: '2-digit',
                      day: '2-digit',
                      hour: 'numeric',
                      minute: 'numeric',
                    })
                  }}</span
                >
              </div>
            </template>
            Start Time of User Task
          </v-tooltip>
        </div>
        <div class="runningTime">
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <div v-bind="attrs" v-on="on">
                <v-icon :color="isSelected || !isUserTaskActive ? 'white' : ''">mdi-timer</v-icon>
                <span>{{ calculateRunningTime(userTask.startTime) }}</span>
              </div>
            </template>
            Running Time of User Task
          </v-tooltip>
        </div>
        <div class="due">
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <div v-bind="attrs" v-on="on">
                <v-icon :color="isSelected || !isUserTaskActive ? 'white' : ''"
                  >mdi-calendar-alert</v-icon
                >
                <span>{{
                  userTask.endTime
                    ? new Date(userTask.endTime).toLocaleString(undefined, {
                        year: '2-digit',
                        month: '2-digit',
                        day: '2-digit',
                        hour: 'numeric',
                        minute: 'numeric',
                      })
                    : ' Not specified'
                }}</span>
              </div>
            </template>
            Deadline of User Task
          </v-tooltip>
        </div>
      </div>
    </div>
  </v-card>
</template>
<script>
export default {
  components: {},
  props: ['userTask', 'isSelected'],
  data() {
    return {};
  },
  computed: {
    isUserTaskActive() {
      return this.userTask.state === 'READY' || this.userTask.state === 'ACTIVE';
    },
    title() {
      return this.userTask.name || this.userTask.id;
    },
    shortTitle() {
      let title = this.title;
      if (title.length > 20) {
        title = title.slice(0, 19) + '...';
      }
      return title;
    },
    owner() {
      return 'Max Mustermann';
    },
    shortOwner() {
      let owner = this.owner;
      if (owner.length > 15) {
        owner = owner.slice(0, 14) + '...';
      }
      return owner;
    },
  },
  methods: {
    calculateRunningTime(startTime) {
      const runningTimeInMs = +new Date() - startTime;
      const days = runningTimeInMs / (1000 * 60 * 60 * 24);
      const hours = (days - Math.floor(days)) * 24;
      const minutes = (hours - Math.floor(hours)) * 60;

      const daysString = days >= 1 ? `${Math.floor(days)}d` : '';
      const hoursString = hours >= 1 ? `${Math.floor(hours)}h` : '';
      return `${daysString} ${hoursString} ${Math.floor(minutes)}min`;
    },
  },
  watch: {},
};
</script>
<style lang="scss" scoped>
.progressText {
  font-size: 0.8em;
}

.v-icon {
  font-size: 1.2em !important;
  vertical-align: text-bottom !important;
}

.task {
  max-width: 320px;
  color: #868686;
}

.task {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  cursor: pointer;
  border-radius: inherit;
  padding: 8px;
  line-height: 1;
  font-family: sans-serif;
}

.task .taskTitle {
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 1em;
  margin-bottom: 10px;

  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

.task .mainInfo {
  display: flex;
  flex-direction: row;
  font-size: 0.8em;

  .user {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    max-width: 150px;
  }
}

.task .leftCol,
.task .rightCol {
  display: flex;
  flex-direction: column;
  margin: 0px 5px;
}

.task .leftCol > div,
.task .rightCol > div {
  margin: 2px 0px;
}

@media (max-width: 768px) {
  .task {
    padding: 6px;
  }
}
</style>
