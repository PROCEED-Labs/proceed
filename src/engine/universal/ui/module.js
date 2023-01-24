const TaskListTab = require('./src/display-items/tasklist/TaskList-DisplayItem.js');
const LoggingTab = require('./src/display-items/logging/Logging-DisplayItem.js');
const ConfigTab = require('./src/display-items/configuration/Configuration-DisplayItem.js');
const ui = require('./src/ui.js');

const engineUiSPA = {
  serve(management) {
    ui.addDisplayItem(new TaskListTab(management));
    ui.addDisplayItem(new ConfigTab());
    ui.addDisplayItem(new LoggingTab());
    ui.init(); // TODO: init is currently needed after addDisplayItem() -> make it dynamic
  },
};

module.exports = engineUiSPA;
