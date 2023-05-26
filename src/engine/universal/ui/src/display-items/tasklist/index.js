/* eslint-disable no-use-before-define */
/* eslint-disable no-undef */
import './style.css';

async function showUserTask(event) {
  const prev = document.querySelector('.tasks .task.form');
  if (prev) {
    closeUserTask(prev);
  }

  let curr = event.target;
  while (!curr.classList.contains('task')) {
    curr = curr.parentElement;
  }

  curr.removeEventListener('click', showUserTask);

  document.querySelectorAll('.tasks .task').forEach((task) => {
    task.classList.add('hidden');
  });

  const hiddenReturnButton = document.querySelector('.return.hidden');
  if (hiddenReturnButton) {
    hiddenReturnButton.classList.remove('hidden');
  }

  await updateUserTaskForm({
    id: curr.dataset.id,
    instanceID: curr.dataset.instanceid,
    state: curr.dataset.state,
  });

  curr.classList.add('form');
}

async function updateUserTaskForm(task) {
  const formView = document.querySelector('.formView');

  const html = await window.PROCEED_DATA.get('/tasklist/api/userTask', {
    instanceID: task.instanceID,
    userTaskID: task.id,
  });

  const form = document.createElement('iframe');
  form.className = `form ${task.state.toLowerCase()}`;
  form.id = `form_${task.id}`;
  formView.replaceChildren(form);
  form.contentWindow.document.open();
  form.contentWindow.document.write(html);
  form.contentWindow.PROCEED_DATA = window.PROCEED_DATA;
  form.contentWindow.document.close();

  if (task.state === 'PAUSED') {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';

    const h3 = document.createElement('h3');
    h3.innerText = 'This task is paused!';

    const p = document.createElement('p');
    p.innerText = 'This task was paused by your supervisor.';

    overlay.append(h3, p);
    formView.appendChild(overlay);
  } else if (task.state === 'COMPLETED') {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';

    const h3 = document.createElement('h3');
    h3.innerText = 'This task is completed!';

    overlay.append(h3);
    formView.appendChild(overlay);
  }
}

/**
 * Removes the displayed form of a user task (does nothing if it isn't currently displayed)
 *
 * @param {String} taskId id of the user task of which we want to remove the form
 */
function removeUserTaskForm(taskId) {
  const formView = document.querySelector('.formView');
  const taskForm = formView.querySelector(`#form_${taskId}`);
  if (taskForm) {
    formView.removeChild(taskForm);

    const returnButton = document.querySelector('.return:not(.hidden)');
    returnButton.classList.add('hidden');
  }
}

function closeUserTask(task) {
  const formView = document.querySelector('.formView');
  formView.replaceChildren();
  task.classList.remove('form');
  document
    .querySelectorAll('.task.hidden')
    .forEach((hiddenTask) => hiddenTask.classList.remove('hidden'));

  const returnButton = document.querySelector('.return:not(.hidden)');
  returnButton.classList.add('hidden');

  // Add show function again
  task.addEventListener('click', showUserTask);
}

function showTaskList(tasks) {
  const returnButton = document.querySelector('.return');
  returnButton.onclick = function () {
    const openTask = document.querySelector('.tasks .task.form');
    closeUserTask(openTask);
  };

  const sortItems = document.querySelectorAll('.sort .items > div');
  const selectedSortItem = Array.from(sortItems).find((sortItem) => {
    return sortItem.classList.contains('selected');
  });

  const stateCheckboxes = document.querySelectorAll('.selection .status input');
  const selectedState = [];
  Array.from(stateCheckboxes).forEach((checkbox) => {
    if (checkbox.checked) {
      selectedState.push(checkbox.value.toUpperCase());
    }
  });

  const prioritySliders = document.querySelectorAll('.selection .priority input');
  let lowerPrioritySliderValue = 1;
  let upperPrioritySliderValue = 10;
  Array.from(prioritySliders).forEach((prioritySlider) => {
    if (prioritySlider.classList.contains('lower')) {
      lowerPrioritySliderValue = prioritySlider.value;
    } else if (prioritySlider.classList.contains('upper')) {
      upperPrioritySliderValue = prioritySlider.value;
    }
  });

  const progressSliders = document.querySelectorAll('.selection .progress input');
  let lowerProgressSliderValue = 0;
  let upperProgressSliderValue = 100;
  Array.from(progressSliders).forEach((progressSlider) => {
    if (progressSlider.classList.contains('lower')) {
      lowerProgressSliderValue = progressSlider.value;
    } else if (progressSlider.classList.contains('upper')) {
      upperProgressSliderValue = progressSlider.value;
    }
  });

  const tasksDiv = document.querySelector('.tasks');
  const currentTasks = Array.from(tasksDiv.querySelectorAll('.task')).map((task) => ({
    id: task.dataset.id,
    instanceID: task.dataset.instanceid,
    state: task.dataset.state,
    progress: task.dataset.progress,
    priority: task.dataset.priority,
    performers: task.dataset.performers,
  }));

  tasks.forEach((task) => {
    let isCurrentTask = false;
    const showTask =
      selectedState.includes(task.state) &&
      task.priority >= lowerPrioritySliderValue &&
      task.priority <= upperPrioritySliderValue &&
      task.progress >= lowerProgressSliderValue &&
      task.progress <= upperProgressSliderValue;

    for (const cTask of currentTasks) {
      isCurrentTask = cTask.id === task.id && cTask.instanceID === task.instanceID;
      if (isCurrentTask) {
        if (!showTask) {
          removeTask(task);
        } else if (
          cTask.state !== task.state ||
          cTask.progress != task.progress ||
          cTask.priority != task.priority
        ) {
          updateTask(task);
        }
        break;
      }
    }

    if (!isCurrentTask && showTask) {
      addTask(task);
    }
  });

  // Removed tasks are all tasks that are currently displayed but not in the
  // updated tasklist (currentTasks \ tasks)
  const removedTasks = currentTasks.filter((cTask) =>
    tasks.every((task) => task.id !== cTask.id || task.instanceID !== cTask.instanceID)
  );

  // Remove tasks
  removedTasks.forEach((task) => {
    removeTask(task);
  });

  const currentTasksAfterUpdate = Array.from(tasksDiv.querySelectorAll('.task'));

  if (currentTasksAfterUpdate.length === 0) {
    if (currentTasks.length !== 0) {
      tasksDiv.innerHTML = `
      <div class="infoBox">There are currently no tasks in your queue.</div>
      `;
    }
    return;
  }

  sortTasks(
    currentTasksAfterUpdate,
    selectedSortItem.id,
    selectedSortItem.classList.contains('ascending')
  );

  currentTasksAfterUpdate.forEach((task, index) => {
    task.style.order = index + 1;
  });

  // Hide no tasks info
  if (currentTasks.length === 0 && tasksDiv.firstElementChild !== null) {
    tasksDiv.removeChild(tasksDiv.firstElementChild);
  }
}

function sortTasks(tasks, property, ascending) {
  switch (property) {
    case 'startTime':
      tasks.sort((a, b) => {
        if (a.dataset.startTime === b.dataset.startTime) {
          return ascending
            ? a.dataset.priority - b.dataset.priority
            : b.dataset.priority - a.dataset.priority;
        }
        return ascending
          ? a.dataset.startTime - b.dataset.startTime
          : b.dataset.startTime - a.dataset.startTime;
      });
      break;
    case 'deadline':
      tasks.sort((a, b) => {
        if (a.dataset.endTime === b.dataset.endTime) {
          return ascending
            ? a.dataset.startTime - b.dataset.startTime
            : b.dataset.startTime - a.dataset.startTime;
        }
        return ascending
          ? a.dataset.endTime - b.dataset.endTime
          : b.dataset.endTime - a.dataset.endTime;
      });
      break;
    case 'progress':
      tasks.sort((a, b) => {
        if (a.dataset.progress === b.dataset.progress) {
          return ascending
            ? a.dataset.startTime - b.dataset.startTime
            : b.dataset.startTime - a.dataset.startTime;
        }
        return ascending
          ? a.dataset.progress - b.dataset.progress
          : b.dataset.progress - a.dataset.progress;
      });
      break;
    case 'priority':
      tasks.sort((a, b) => {
        if (a.dataset.priority === b.dataset.priority) {
          return ascending
            ? a.dataset.startTime - b.dataset.startTime
            : b.dataset.startTime - a.dataset.startTime;
        }
        return ascending
          ? a.dataset.priority - b.dataset.priority
          : b.dataset.priority - a.dataset.priority;
      });
      break;
    case 'state':
      tasks.sort((a, b) => {
        const stateOrder = ['READY', 'ACTIVE', 'PAUSED', 'COMPLETED'];
        if (a.dataset.state === b.dataset.state) {
          return ascending
            ? a.dataset.startTime - b.dataset.startTime
            : b.dataset.startTime - a.dataset.startTime;
        }

        const indexA = stateOrder.findIndex((state) => a.dataset.state === state);
        const indexB = stateOrder.findIndex((state) => b.dataset.state === state);
        return ascending ? indexA - indexB : indexB - indexA;
      });
      break;
  }
}

function removeTask(task) {
  const tasksDiv = document.querySelector('.tasks');
  tasksDiv
    .querySelector(`.task[data-instanceid="${task.instanceID}"][data-id="${task.id}"]`)
    .remove();
  removeUserTaskForm(task.id);
}

function addTask(task) {
  const taskDiv = document.createElement('div');
  taskDiv.dataset.id = task.id;
  taskDiv.dataset.instanceid = task.instanceID;
  taskDiv.dataset.state = task.state;
  taskDiv.dataset.priority = task.priority;
  taskDiv.dataset.progress = task.progress;
  taskDiv.dataset.endTime = task.endTime;
  taskDiv.dataset.startTime = task.startTime;

  taskDiv.className = task.state === 'READY' ? 'task new' : `task ${task.state.toLowerCase()}`;
  taskDiv.innerHTML = getUserTaskContent(task);
  taskDiv.addEventListener('click', showUserTask);
  document.querySelector('.tasks').appendChild(taskDiv);
}

function updateTask(task) {
  const tasksDiv = document.querySelector('.tasks');
  const taskDiv = tasksDiv.querySelector(
    `.task[data-instanceid="${task.instanceID}"][data-id="${task.id}"]`
  );
  taskDiv.classList.remove('new', 'active', 'paused', 'completed');
  taskDiv.classList.add(task.state.toLowerCase());
  taskDiv.dataset.state = task.state;
  taskDiv.dataset.progress = task.progress;
  taskDiv.dataset.priority = task.priority;
  taskDiv.innerHTML = getUserTaskContent(task);

  const formView = document.querySelector('.formView');
  const taskForm = formView.querySelector(`#form_${task.id}`);
  if (taskForm) {
    updateUserTaskForm(task);
  }
}

function getUserTaskContent(task) {
  const startTime = new Date(task.startTime).toLocaleString(undefined, {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: 'numeric',
  });
  const endTime = task.endTime
    ? new Date(task.endTime).toLocaleString(undefined, {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: 'numeric',
        minute: 'numeric',
      })
    : 'Not specified';
  const runningTimeInMs = +new Date() - task.startTime;
  const days = runningTimeInMs / (1000 * 60 * 60 * 24);
  const hours = (days - Math.floor(days)) * 24;
  const minutes = (hours - Math.floor(hours)) * 60;
  const daysString = days >= 1 ? `${Math.floor(days)}d` : '';
  const hoursString = hours >= 1 ? `${Math.floor(hours)}h` : '';
  const runningTimeString = `${daysString} ${hoursString} ${Math.floor(minutes)}min`;
  const stateLabel = task.state === 'READY' ? 'NEW' : task.state;
  const progress = parseInt(task.progress);

  const taskContent = `
  <div class="taskTitle" title="${task.name || task.id}">
    <span>${task.name || task.id}</span>
    <div class="progress-circular ${
      progress > 0 ? 'visible' : ''
    }" style="height: 25px; width: 25px;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="21.73913043478261 21.73913043478261 43.47826086956522 43.47826086956522" style="transform: rotate(270deg);">
        <circle fill="transparent" cx="43.47826086956522" cy="43.47826086956522" r="20" stroke-width="3.4782608695652177" stroke-dasharray="125.664" stroke-dashoffset="0" class="progress-circular__underlay"></circle>
        <circle fill="transparent" cx="43.47826086956522" cy="43.47826086956522" r="20" stroke-width="3.4782608695652177" stroke-dasharray="125.664" stroke-dashoffset="${
          125.664 * (1 - progress / 100)
        }px" class="progress-circular__overlay"></circle>
      </svg>
      <div class="progress-circular__info">
        <span class="progressText">${Math.floor(progress)}</span>
      </div>
    </div>
  </div>
  <div class="mainInfo"> 
    <div class="leftCol"> 
      <div class="user" title="Owner of User Task: Max Mustermann"><svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="user" class="svg-inline--fa fa-user fa-w-14" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" /></svg> <span class="name">Max Mustermann</span> </div>
      <div class="priority" title="Priority of User Task"><svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="user" class="svg-inline--fa fa-user fa-w-14" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9,7V17H11V13H13A2,2 0 0,0 15,11V9A2,2 0 0,0 13,7H9M11,9H13V11H11V9M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2Z" /></svg> <span>${
        task.priority
      }/10</span> </div>
      <div class="status" title="Current Status of User Task"><svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="user" class="svg-inline--fa fa-user fa-w-14" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19.66 9.64L19.3 8.7L21.16 8C20.24 5.88 18.6 4.18 16.54 3.14L15.74 4.92L14.82 4.5L15.62 2.7C14.5 2.26 13.28 2 12 2C10.94 2 9.92 2.22 8.96 2.5L9.64 4.34L8.7 4.7L8 2.84C5.88 3.76 4.18 5.4 3.14 7.46L4.92 8.26L4.5 9.18L2.7 8.38C2.26 9.5 2 10.72 2 12C2 13.06 2.22 14.08 2.5 15.04L4.34 14.36L4.7 15.3L2.84 16C3.76 18.12 5.4 19.82 7.46 20.86L8.26 19.08L9.18 19.5L8.38 21.3C9.5 21.74 10.72 22 12 22C13.06 22 14.08 21.78 15.04 21.5L14.36 19.66L15.3 19.3L16 21.16C18.12 20.24 19.82 18.6 20.86 16.54L19.08 15.74L19.5 14.82L21.3 15.62C21.74 14.5 22 13.28 22 12C22 10.94 21.78 9.92 21.5 8.96L19.66 9.64M14.3 17.54C11.24 18.8 7.72 17.36 6.46 14.3S6.64 7.72 9.7 6.46 16.28 6.64 17.54 9.7C18.82 12.76 17.36 16.28 14.3 17.54Z" /></svg> <span>${stateLabel}</span></div>
    </div>
    <div class="rightCol"> 
      <div class="added" title="Start Time of User Task"><svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="user" class="svg-inline--fa fa-user fa-w-14" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1M17,12H12V17H17V12Z" /></svg> <span>${startTime}</span> </div>
      <div class="runningTime" title="Running Time of User Task"><svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="history" class="svg-inline--fa fa-history fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19.03 7.39L20.45 5.97C20 5.46 19.55 5 19.04 4.56L17.62 6C16.07 4.74 14.12 4 12 4C7.03 4 3 8.03 3 13S7.03 22 12 22C17 22 21 17.97 21 13C21 10.88 20.26 8.93 19.03 7.39M13 14H11V7H13V14M15 1H9V3H15V1Z" /></svg> <span>${runningTimeString}</span></div>
      <div class="due" title="Deadline of User Task"><svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="user" class="svg-inline--fa fa-user fa-w-14" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 1V3H5C3.89 3 3 3.89 3 5V19C3 20.11 3.9 21 5 21H19C20.11 21 21 20.11 21 19V5C21 3.9 20.11 3 19 3H18V1H16V3H8V1H6M5 8H19V19H5V8M11 9V14H13V9H11M11 16V18H13V16H11Z" /></svg> <span>${endTime}</span> </div>
    </div>
  </div>`;

  return taskContent;
}

function checkUpdates() {
  window.PROCEED_DATA.get('/tasklist/api/').then((tasks) => {
    showTaskList(tasks);
  });
}

function initTasklist() {
  const filterList = document.querySelector('.selection');
  const sortList = document.querySelector('.sort');

  filterList.querySelector('.anchor').onclick = function () {
    if (filterList.classList.contains('visible')) {
      filterList.classList.remove('visible');
    } else {
      filterList.classList.add('visible');
      if (sortList.classList.contains('visible')) {
        sortList.classList.remove('visible');
      }
    }
  };

  sortList.querySelector('.anchor').onclick = function (evt) {
    if (sortList.classList.contains('visible')) {
      sortList.classList.remove('visible');
    } else {
      sortList.classList.add('visible');
      if (filterList.classList.contains('visible')) {
        filterList.classList.remove('visible');
      }
    }
  };

  const sortItems = document.querySelectorAll('.sort .items > div');
  Array.from(sortItems).forEach((sortItem) => {
    sortItem.onclick = function () {
      if (sortItem.classList.contains('selected') && sortItem.classList.contains('ascending')) {
        sortItem.classList.remove('ascending');
        sortItem.classList.add('descending');
      } else if (
        sortItem.classList.contains('selected') &&
        sortItem.classList.contains('descending')
      ) {
        sortItem.classList.remove('descending');
        sortItem.classList.add('ascending');
      } else {
        const selectedSortItem = Array.from(sortItems).find((sortItem) => {
          return sortItem.classList.contains('selected');
        });
        selectedSortItem.classList.remove('selected', 'ascending', 'descending');
        sortItem.classList.add('selected', 'ascending');
      }
    };
  });

  const lowerPrioritySlider = document.querySelector('.selection .priority input.lower');
  const upperPrioritySlider = document.querySelector('.selection .priority input.upper');
  const prioritySliderValueField = document.querySelector('.selection .priority .slider span');

  let lowerPrioritySliderValue = lowerPrioritySlider.value;
  let upperPrioritySliderValue = upperPrioritySlider.value;
  lowerPrioritySlider.oninput = function (event) {
    lowerPrioritySliderValue = event.target.value;
    prioritySliderValueField.innerHTML = `${lowerPrioritySliderValue} - ${upperPrioritySliderValue}`;
  };
  upperPrioritySlider.oninput = function (event) {
    upperPrioritySliderValue = event.target.value;
    prioritySliderValueField.innerHTML = `${lowerPrioritySliderValue} - ${upperPrioritySliderValue}`;
  };

  const lowerProgressSlider = document.querySelector('.selection .progress input.lower');
  const upperProgressSlider = document.querySelector('.selection .progress input.upper');
  const progressSliderValueField = document.querySelector('.selection .progress .slider span');

  let lowerProgressSliderValue = lowerProgressSlider.value;
  let upperProgressSliderValue = upperProgressSlider.value;
  lowerProgressSlider.oninput = function (event) {
    lowerProgressSliderValue = event.target.value;
    progressSliderValueField.innerHTML = `${lowerProgressSliderValue} - ${upperProgressSliderValue}`;
  };
  upperProgressSlider.oninput = function (event) {
    upperProgressSliderValue = event.target.value;
    progressSliderValueField.innerHTML = `${lowerProgressSliderValue} - ${upperProgressSliderValue}`;
  };
}

window.addEventListener('DOMContentLoaded', () => {
  initTasklist();
  window.setInterval(checkUpdates, 1000);
  checkUpdates();
});
