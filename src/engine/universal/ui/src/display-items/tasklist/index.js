/* eslint-disable no-use-before-define */
/* eslint-disable no-undef */
import './style.css';

function showUserTask(event) {
  const prev = document.querySelector('#tasks .task.form');
  if (prev) {
    closeUserTask(prev);
  }

  let curr = event.target;
  while (!curr.classList.contains('task')) {
    curr = curr.parentElement;
  }

  const instanceID = curr.dataset.instanceid;
  const userTaskID = curr.dataset.id;

  curr.removeEventListener('click', showUserTask);

  document.querySelectorAll('#tasks .task').forEach((task) => {
    task.classList.add('hidden');
  });

  window.PROCEED_DATA.get('/tasklist/api/userTask', {
    instanceID,
    userTaskID,
  }).then((res) => {
    curr.classList.add('form');
    const form = document.createElement('iframe');
    form.className = 'form';
    form.id = `form_${userTaskID}`;
    const formView = document.querySelector('#formView');
    formView.replaceChildren(form);
    form.contentWindow.document.open();
    form.contentWindow.document.write(res);
    form.contentWindow.PROCEED_DATA = window.PROCEED_DATA;
    form.contentWindow.document.close();
  });
}

/**
 * Removes the displayed form of a user task (does nothing if it isn't currently displayed)
 *
 * @param {String} taskId id of the user task of which we want to remove the form
 */
function removeUserTaskForm(taskId) {
  const formView = document.querySelector('#formView');
  const taskForm = formView.querySelector(`#form_${taskId}`);
  if (taskForm) {
    formView.removeChild(taskForm);
  }
}

function closeUserTask(task) {
  task.classList.remove('form');
  document.querySelector('iframe.form').remove();
  document
    .querySelectorAll('.task.hidden')
    .forEach((hiddenTask) => hiddenTask.classList.remove('hidden'));

  // Add show function again
  task.addEventListener('click', showUserTask);
}

function showTaskList(tasks) {
  const tasksDiv = document.querySelector('#tasks');
  const currentTasks = Array.from(tasksDiv.querySelectorAll('.task')).map((task) => ({
    id: task.dataset.id,
    instanceID: task.dataset.instanceid,
  }));
  const newTasks = tasks.filter((task) =>
    currentTasks.every((cTask) => cTask.id !== task.id || cTask.instanceID !== task.instanceID)
  );
  // Removed tasks are all tasks that are currently displayed but not in the
  // updated tasklist (currentTasks \ tasks)
  const removedTasks = currentTasks.filter((cTask) =>
    tasks.every((task) => task.id !== cTask.id || task.instanceID !== cTask.instanceID)
  );

  // Remove tasks
  removedTasks.forEach((task) => {
    tasksDiv
      .querySelector(`.task[data-instanceid="${task.instanceID}"][data-id="${task.id}"]`)
      .remove();
    removeUserTaskForm(task.id);
  });

  if (newTasks.length + currentTasks.length - removedTasks.length === 0) {
    if (newTasks.length !== 0 || removedTasks.length !== 0) {
      tasksDiv.innerHTML = `
      <div class="infoBox">There are currently no tasks in your queue.</div>
      `;
    }
    return;
  }

  // Hide no tasks info
  if (currentTasks.length === 0 && tasksDiv.firstElementChild !== null) {
    tasksDiv.removeChild(tasksDiv.firstElementChild);
  }

  // Add new tasks
  newTasks.forEach((task) => {
    const taskContent = `
<div class="taskInfo">
  <div class="title">${task.name || task.id}</div>
  <div class="appointees"><div class="user"><svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="user" class="svg-inline--fa fa-user fa-w-14" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M224 256c70.7 0 128-57.3 128-128S294.7 0 224 0 96 57.3 96 128s57.3 128 128 128zm89.6 32h-16.7c-22.2 10.2-46.9 16-72.9 16s-50.6-5.8-72.9-16h-16.7C60.2 288 0 348.2 0 422.4V464c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48v-41.6c0-74.2-60.2-134.4-134.4-134.4z"></path></svg><div class="name">Max Mustermann</div></div></div>
  <div class="time">
    <div class="added"><svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="history" class="svg-inline--fa fa-history fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M504 255.531c.253 136.64-111.18 248.372-247.82 248.468-59.015.042-113.223-20.53-155.822-54.911-11.077-8.94-11.905-25.541-1.839-35.607l11.267-11.267c8.609-8.609 22.353-9.551 31.891-1.984C173.062 425.135 212.781 440 256 440c101.705 0 184-82.311 184-184 0-101.705-82.311-184-184-184-48.814 0-93.149 18.969-126.068 49.932l50.754 50.754c10.08 10.08 2.941 27.314-11.313 27.314H24c-8.837 0-16-7.163-16-16V38.627c0-14.254 17.234-21.393 27.314-11.314l49.372 49.372C129.209 34.136 189.552 8 256 8c136.81 0 247.747 110.78 248 247.531zm-180.912 78.784l9.823-12.63c8.138-10.463 6.253-25.542-4.21-33.679L288 256.349V152c0-13.255-10.745-24-24-24h-16c-13.255 0-24 10.745-24 24v135.651l65.409 50.874c10.463 8.137 25.541 6.253 33.679-4.21z"></path></svg> 3h ago</div>
    <div class="due"><svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="stopwatch" class="svg-inline--fa fa-stopwatch fa-w-14" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M432 304c0 114.9-93.1 208-208 208S16 418.9 16 304c0-104 76.3-190.2 176-205.5V64h-28c-6.6 0-12-5.4-12-12V12c0-6.6 5.4-12 12-12h120c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12h-28v34.5c37.5 5.8 71.7 21.6 99.7 44.6l27.5-27.5c4.7-4.7 12.3-4.7 17 0l28.3 28.3c4.7 4.7 4.7 12.3 0 17l-29.4 29.4-.6.6C419.7 223.3 432 262.2 432 304zm-176 36V188.5c0-6.6-5.4-12-12-12h-40c-6.6 0-12 5.4-12 12V340c0 6.6 5.4 12 12 12h40c6.6 0 12-5.4 12-12z"></path></svg> 30min left</div>
  </div>
  <div class="id">
    <span class="process">Process: ${task.instanceID}</span>
    <span class="process">Task: ${task.id}</span>
  </div>
</div>
<div class="close">&#x00D7;</close>`;
    const taskDiv = document.createElement('div');
    taskDiv.className = 'task';
    taskDiv.dataset.id = task.id;
    taskDiv.dataset.instanceid = task.instanceID;
    taskDiv.innerHTML = taskContent;
    document.querySelector('#tasks').appendChild(taskDiv);

    taskDiv.addEventListener('click', showUserTask);
    taskDiv.querySelector('.close').addEventListener('click', (event) => {
      let curr = event.target;
      while (!curr.classList.contains('task')) {
        curr = curr.parentElement;
      }
      event.stopPropagation();
      closeUserTask(curr);
    });
  });
}

function checkUpdates() {
  window.PROCEED_DATA.get('/tasklist/api/').then((tasks) => {
    showTaskList(tasks);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  window.setInterval(checkUpdates, 1000);
  checkUpdates();
});
