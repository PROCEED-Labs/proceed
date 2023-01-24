/* global window document console PROCEED_DATA */
import '../pure-base-min.css';
import '../style-buttons.css';
import '../style-forms.css';
import '../style-colors.css';
import './style.css';

import { appendElem } from '../helpers.js';

let doRefresh = true;
function toggleRefresh() {
  document.getElementById('toggleBtn').innerHTML = mapVal(!doRefresh ? 'pause' : 'play');
  doRefresh = !doRefresh;
}

window.toggleRefresh = toggleRefresh;

let charMap = {
  info: '➤',
  debug: '🛠',
  error: '⚠',
  trace: '🛡',

  CORE: '◉',
  SYSTEM: '⚙',

  pause: '⏸',
  play: '▶',
};

function mapVal(val) {
  let mapped = charMap[val];
  if (mapped) return mapped;
  return val;
}
function optMapVal(val) {
  let mapedVal = mapVal(val);
  if (mapedVal === val) {
    return '';
  } else {
    return mapedVal;
  }
}

const LogRoot = document.getElementById('LogRoot');

const tableSelection = document.getElementById('table-select');
tableSelection.addEventListener('change', ({ target }) => {
  selectedInstance = 'No instance';
  setSelectedTable(target[target.selectedIndex].value);
  renderData(currentData);
});

const instanceSelection = document.getElementById('instance-select');
instanceSelection.addEventListener('change', ({ target }) => {
  selectedInstance = target[target.selectedIndex].value;
  renderData(currentData);
});

function refreshData() {
  if (LogRoot && doRefresh) {
    window.PROCEED_DATA.get('/logging/api/log').then((e) => {
      renderData(e);
    });
  }
}
refreshData();
window.setInterval(refreshData, 2000);

let currentData;
let selectedTable = 'standard';

function setSelectedTable(tableName) {
  selectedTable = tableName;

  if (tableName === 'standard') {
    instanceSelection.style.display = '';
  } else {
    instanceSelection.style.display = 'block';
  }
}

/**
 * Checks if there are new tables or tables were removed
 *
 * @param {Object} data new logging data
 * @returns {Boolean} if the list of tables changed
 */
function tablesChanged(data) {
  if (!currentData) {
    return true;
  }

  const currentTables = Object.keys(currentData);
  const newTables = Object.keys(data);

  // early return if number of tables changed
  if (currentTables.length !== newTables.length) {
    return true;
  }

  // see if both lists contain the same elements
  return currentTables.some((table) => !newTables.includes(table));
}

function renderData(data) {
  // rerender table selection if some table was removed or added
  // TODO: only add new entries
  if (tablesChanged(data)) {
    renderSelection(Object.keys(data), tableSelection, selectedTable);
  }

  currentData = data;

  LogRoot.innerHTML = '';

  if (!data[selectedTable]) {
    setSelectedTable('standard');
  }
  if (selectedTable === 'standard') {
    renderStandardLogs(data['standard']);
  } else {
    renderProcessLogs(data[selectedTable]);
  }
}

function renderStandardLogs(logs) {
  logs.forEach((log) => {
    const [entry] = Object.values(log);
    LogRoot.appendChild(createLogElem(entry));
  });
}

let selectedInstance;

function renderProcessLogs(logs) {
  const instances = {};

  // sort logs by instance
  logs.forEach((log) => {
    [log] = Object.values(log);

    if (!instances[log.instanceId]) {
      instances[log.instanceId] = [];
    }

    instances[log.instanceId].push(log);
  });

  renderSelection(['No instance', ...Object.keys(instances)], instanceSelection, selectedInstance);

  // render log entries for instances
  Object.values(instances).forEach((instance) => {
    if (
      selectedInstance &&
      selectedInstance !== 'No instance' &&
      selectedInstance !== instance[0].instanceId
    ) {
      return;
    }

    const instanceContainer = appendElem(LogRoot, 'div', {
      class: 'container instance-container',
    });
    const title = appendElem(instanceContainer, 'div', {
      class: 'title-container',
    });
    title.textContent = instance[0].instanceId;

    instance.forEach((log) => {
      instanceContainer.appendChild(createLogElem(log));
    });
  });
}

function renderSelection(data, selectElement, currentValue) {
  selectElement.innerHTML = '';

  data.forEach((entry) => {
    const option = appendElem(selectElement, 'option', {
      value: entry,
    });

    if (entry === currentValue) {
      option.setAttribute('selected', true);
    }

    option.textContent = entry;
  });
}

function createLogElem(logElement) {
  let { msg, level, time, moduleName } = logElement;
  time = new Intl.DateTimeFormat('en-GB', {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(new Date(time));

  let LogElem = appendElem(null, 'div', { class: `LogElem log-${level}` });

  appendElem(LogElem, 'div', {
    class: 'data level icon',
  }).textContent = optMapVal(level);
  appendElem(LogElem, 'div', { class: 'data level time' }).textContent = time;
  appendElem(LogElem, 'div', { class: 'data level text' }).textContent = `${level.toUpperCase()}: `;

  appendElem(LogElem, 'div', {
    class: 'data moduleName text',
  }).textContent = moduleName;
  appendElem(LogElem, 'div', { class: 'data msg' }).textContent = msg;

  return LogElem;
}
