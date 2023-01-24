const DisplayItem = require('./../../display-item.js');
const distribution = require('@proceed/distribution');
const { logging } = require('@proceed/machine');
const whiskers = require('whiskers/dist/whiskers.min.js');
const { getMilestonesFromElementById } = require('@proceed/bpmn-helper/src/getters');

class TaskListTab extends DisplayItem {
  constructor(management) {
    super('User Tasks', 'tasklist');
    this.management = management;
    this.content = `<!doctype html><html><head><style>body,html{margin:0;padding:0;font-family:sans-serif;font-size:16px;color:#464646;height:100%}#wrapper{width:auto;display:flex;flex-direction:row;height:100%}.infoBox{text-align:center;margin:40px 10px 10px;font-size:1.1em;color:#a5a5a5;letter-spacing:.03em}#tasks{box-shadow:0 0 6px -3px #9a9a9a;z-index:1;flex-shrink:0}#tasks .task{background-color:#fff;margin:10px;box-shadow:0 0 5px -3px #6d6d6d;border-radius:12px;color:#868686;position:relative}#tasks .taskInfo{height:90px;display:flex;flex-direction:row;flex-shrink:0;justify-content:flex-end;cursor:pointer;position:relative;border-radius:inherit}#tasks .taskInfo>div{margin:0 20px}#tasks .taskInfo:hover{background-color:#f9f9f9}#tasks .taskInfo .title{font-size:1.3em;letter-spacing:.03em;color:#464646;flex-grow:1;min-width:100px}#tasks .taskInfo .title,#tasks .taskInfo .user{display:flex;flex-direction:column;justify-content:center}#tasks .taskInfo .user{text-align:center;height:100%}#tasks .taskInfo .user svg{height:1.7em}#tasks .taskInfo .user .name{margin-top:5px;font-size:.7em}#tasks .taskInfo .time{display:flex;flex-direction:column;justify-content:center;font-size:.85em;letter-spacing:.03em}#tasks .taskInfo .time svg{height:1em;vertical-align:top}#tasks .taskInfo .time>div{margin-top:5px}#tasks .taskInfo .time>div:first-child{margin-top:0}#tasks .taskInfo .id{position:absolute;bottom:1px;font-size:.5em;color:#c3c3c3;display:none;margin:0;width:100%;text-align:center}#tasks .taskInfo:hover .id{display:block}#tasks .task .close{display:none}#tasks .task.form .taskInfo{background-color:#0094a0;color:#fff}#tasks .task.form .taskInfo .title{color:#fff}#formView{flex-grow:1;background-color:#fff;font-size:0}#formView .form{width:100%;height:100%;border:none;flex-grow:1}@media (max-width:1024px){body,html{font-size:14px}#tasks{font-size:.85em}#tasks .task{border-radius:9px}#tasks .taskInfo{height:80px}#tasks .taskInfo>div{margin:0 10px}}@media (max-width:768px){body,html{font-size:10px}#tasks .task{margin:5px;border-radius:7px}#tasks .taskInfo{height:45px}#tasks .taskInfo>div{margin:0 5px}}@media (max-width:425px){body,html{height:auto;font-size:16px}#wrapper{width:auto;flex-direction:column;height:100vh}#tasks{box-shadow:none;z-index:auto;width:100%}#tasks .task{margin:7px}#tasks .task.hidden{display:none}#tasks .task .taskInfo{height:80px}#tasks .taskInfo>div{margin:0 15px}#tasks .task.form{display:flex;flex-direction:column;margin-top:50px;margin-bottom:0}#tasks .task .form{width:100%;height:100%;border:none;flex-grow:1}#tasks .task.form .taskInfo{border-bottom:1px solid #efefef;border-bottom-left-radius:0;border-bottom-right-radius:0}#tasks .taskInfo:hover{background-color:inherit}#tasks .task.form .close{display:block;position:absolute;top:-40px;right:0;font-size:24.48px;color:#fff;background-color:#7d7d7d;height:30px;width:30px;text-align:center;border-radius:100%;line-height:28px;font-weight:100}#tasks .task.form .close:hover{background-color:#464646;cursor:pointer}#formView{margin:0 7px 7px;box-shadow:0 0 5px -3px #6d6d6d;border-radius:0 0 7px 7px}#formView:empty{display:none}}@media (max-width:375px){body,html{font-size:13px}#tasks .task .taskInfo{height:70px}#tasks .taskInfo>div{margin:0 10px}}@media (max-width:320px){body,html{font-size:12px}#tasks .task .taskInfo{height:65px}#tasks .taskInfo>div{margin:0 8px}}</style></head><body style="background: #fafafa"><div id="wrapper"><div id="tasks"><div class="infoBox">There are currently no tasks in your queue.</div></div><div id="formView"></div></div><script>!function(e){var t={};function n(s){if(t[s])return t[s].exports;var a=t[s]={i:s,l:!1,exports:{}};return e[s].call(a.exports,a,a.exports,n),a.l=!0,a.exports}n.m=e,n.c=t,n.d=function(e,t,s){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:s})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var s=Object.create(null);if(n.r(s),Object.defineProperty(s,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var a in e)n.d(s,a,function(t){return e[t]}.bind(null,a));return s},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=0)}([function(e,t,n){"use strict";n.r(t);n(1);function s(e){const t=document.querySelector("#tasks .task.form");t&&a(t);let n=e.target;for(;!n.classList.contains("task");)n=n.parentElement;const i=n.dataset.instanceid,r=n.dataset.id;n.removeEventListener("click",s),document.querySelectorAll("#tasks .task").forEach(e=>{e.classList.add("hidden")}),window.PROCEED_DATA.get("/tasklist/api/userTask",{instanceID:i,userTaskID:r}).then(e=>{n.classList.add("form");const t=document.createElement("iframe");t.className="form",t.id="form_"+r;document.querySelector("#formView").replaceChildren(t),t.contentWindow.document.open(),t.contentWindow.document.write(e),t.contentWindow.PROCEED_DATA=window.PROCEED_DATA,t.contentWindow.document.close()})}function a(e){e.classList.remove("form"),document.querySelector("iframe.form").remove(),document.querySelectorAll(".task.hidden").forEach(e=>e.classList.remove("hidden")),e.addEventListener("click",s)}function i(e){const t=document.querySelector("#tasks"),n=Array.from(t.querySelectorAll(".task")).map(e=>({id:e.dataset.id,instanceID:e.dataset.instanceid})),i=e.filter(e=>n.every(t=>t.id!==e.id||t.instanceID!==e.instanceID)),r=n.filter(t=>e.every(e=>e.id!==t.id||e.instanceID!==t.instanceID));r.forEach(e=>{t.querySelector(\`.task[data-instanceid="\${e.instanceID}"][data-id="\${e.id}"]\`).remove(),function(e){const t=document.querySelector("#formView"),n=t.querySelector("#form_"+e);n&&t.removeChild(n)}(e.id)}),i.length+n.length-r.length!=0?(0===n.length&&null!==t.firstElementChild&&t.removeChild(t.firstElementChild),i.forEach(e=>{const t=\`\\n<div class="taskInfo">\\n  <div class="title">\${e.name||e.id}</div>\\n  <div class="appointees"><div class="user"><svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="user" class="svg-inline--fa fa-user fa-w-14" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M224 256c70.7 0 128-57.3 128-128S294.7 0 224 0 96 57.3 96 128s57.3 128 128 128zm89.6 32h-16.7c-22.2 10.2-46.9 16-72.9 16s-50.6-5.8-72.9-16h-16.7C60.2 288 0 348.2 0 422.4V464c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48v-41.6c0-74.2-60.2-134.4-134.4-134.4z"></path></svg><div class="name">Max Mustermann</div></div></div>\\n  <div class="time">\\n    <div class="added"><svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="history" class="svg-inline--fa fa-history fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M504 255.531c.253 136.64-111.18 248.372-247.82 248.468-59.015.042-113.223-20.53-155.822-54.911-11.077-8.94-11.905-25.541-1.839-35.607l11.267-11.267c8.609-8.609 22.353-9.551 31.891-1.984C173.062 425.135 212.781 440 256 440c101.705 0 184-82.311 184-184 0-101.705-82.311-184-184-184-48.814 0-93.149 18.969-126.068 49.932l50.754 50.754c10.08 10.08 2.941 27.314-11.313 27.314H24c-8.837 0-16-7.163-16-16V38.627c0-14.254 17.234-21.393 27.314-11.314l49.372 49.372C129.209 34.136 189.552 8 256 8c136.81 0 247.747 110.78 248 247.531zm-180.912 78.784l9.823-12.63c8.138-10.463 6.253-25.542-4.21-33.679L288 256.349V152c0-13.255-10.745-24-24-24h-16c-13.255 0-24 10.745-24 24v135.651l65.409 50.874c10.463 8.137 25.541 6.253 33.679-4.21z"></path></svg> 3h ago</div>\\n    <div class="due"><svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="stopwatch" class="svg-inline--fa fa-stopwatch fa-w-14" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M432 304c0 114.9-93.1 208-208 208S16 418.9 16 304c0-104 76.3-190.2 176-205.5V64h-28c-6.6 0-12-5.4-12-12V12c0-6.6 5.4-12 12-12h120c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12h-28v34.5c37.5 5.8 71.7 21.6 99.7 44.6l27.5-27.5c4.7-4.7 12.3-4.7 17 0l28.3 28.3c4.7 4.7 4.7 12.3 0 17l-29.4 29.4-.6.6C419.7 223.3 432 262.2 432 304zm-176 36V188.5c0-6.6-5.4-12-12-12h-40c-6.6 0-12 5.4-12 12V340c0 6.6 5.4 12 12 12h40c6.6 0 12-5.4 12-12z"></path></svg> 30min left</div>\\n  </div>\\n  <div class="id">\\n    <span class="process">Process: \${e.instanceID}</span>\\n    <span class="process">Task: \${e.id}</span>\\n  </div>\\n</div>\\n<div class="close">&#x00D7;</close>\`,n=document.createElement("div");n.className="task",n.dataset.id=e.id,n.dataset.instanceid=e.instanceID,n.innerHTML=t,document.querySelector("#tasks").appendChild(n),n.addEventListener("click",s),n.querySelector(".close").addEventListener("click",e=>{let t=e.target;for(;!t.classList.contains("task");)t=t.parentElement;e.stopPropagation(),a(t)})})):0===i.length&&0===r.length||(t.innerHTML='\\n      <div class="infoBox">There are currently no tasks in your queue.</div>\\n      ')}function r(){window.PROCEED_DATA.get("/tasklist/api/").then(e=>{i(e)})}window.addEventListener("DOMContentLoaded",()=>{window.setInterval(r,1e3),r()})},function(e,t,n){}]);</script></body></html>`;
    // this.badge = 'New';

    this.logger = logging.getLogger({
      moduleName: 'UI',
    });
  }

  getEndpoints() {
    return {
      // GET <engine>/tasklist/api/ ('tasklist' comes from DisplayItem.key)
      '/api/': this.getAPI.bind(this),
      // GET/POST <engine>/tasklist/api/userTask ('tasklist' comes from DisplayItem.key)
      '/api/userTask': { get: this.getUserTask.bind(this), post: this.postUserTask.bind(this) },
      '/api/variable': { put: this.putVariable.bind(this) },
      '/api/milestone': { put: this.putMilestone.bind(this) },
    };
  }

  async getAPI() {
    const tasks = this.management.getPendingUserTasks();
    const taskInfos = tasks.map((task) => {
      return {
        id: task.id,
        name: task.name,
        instanceID: task.processInstance.id,
        attrs: task.attrs,
      };
    });
    return taskInfos;
  }

  async getUserTask(query) {
    const instanceId = query.instanceID;

    let engine = this.management.getEngineWithID(instanceId);

    if (!engine) {
      throw new Error(`No process running instance with id ${instanceId}`);
    }

    const userTask = engine.userTasks.find(
      (userTask) => userTask.processInstance.id === instanceId && userTask.id === query.userTaskID
    );

    const {
      processInstance,
      implementation,
      attrs,
      ['_5thIndustryInspectionOrderLink']: inspectionOrderLink,
      activate,
      definitionVersion,
    } = userTask;

    if (!processInstance) {
      throw new Error(`No pending user task with id ${query.userTaskID}`);
    }

    if (implementation === '5thIndustry') {
      return `
        <html>
          <head>
            <base target="_blank"></base>
          </head>
          <body style="display: flex; justify-content: center; align-items: center;">
            <div style="background: #0094a0; width: 15em; height: 3em; display: flex; justify-content: center; align-items: center; border-radius: 50%;">
              <a style="color: white; text-decoration: none;" href="${inspectionOrderLink}">Open in 5thIndustry App</a>
            <div>
          </body>
        </html>`;
    } else {
      // set the user task to activated state
      activate();
      const { 'proceed:fileName': userTaskFileName } = attrs;

      const { definitionId } = engine;

      const html = await distribution.db.getHTML(definitionId, userTaskFileName);

      const bpmn = await distribution.db.getProcessVersion(definitionId, definitionVersion);

      const script = `
      const instanceID = '${query.instanceID}';
      const userTaskID = '${query.userTaskID}';
      
      window.addEventListener('submit', (event) => {
        event.preventDefault();

        const data = new FormData(event.target);
        const variables = {};
        const entries = data.entries();
        let entry = entries.next();
        while (!entry.done) {
          [, variables[entry.value[0]]] = entry.value;
          entry = entries.next();
        }

        window.PROCEED_DATA.put('/tasklist/api/variable', variables, {
            instanceID,
            userTaskID,
        }).then(() => {
          window.PROCEED_DATA.post('/tasklist/api/userTask', variables, {
            instanceID,
            userTaskID,
          });
        });
      })

      window.addEventListener('DOMContentLoaded', () => {
        const milestoneInputs = document.querySelectorAll(
          'input[class^="milestone-"]'
        );
        Array.from(milestoneInputs).forEach((milestoneInput) => {
          milestoneInput.addEventListener('click', (event) => {
            const milestoneName = Array.from(event.target.classList)
            .find((className) => className.includes('milestone-'))
            .split('milestone-')
            .slice(1)
            .join('');
            
            window.PROCEED_DATA.put(
              '/tasklist/api/milestone',
              { [milestoneName]: parseInt(event.target.value) },
              {
                instanceID,
                userTaskID,
              }
            );
          });
        });

        const variableInputs = document.querySelectorAll(
          'input[class^="variable-"]'
        );
        Array.from(variableInputs).forEach((variableInput) => {
          let variableInputTimer;

          variableInput.addEventListener('input', (event) => {
            const variableName = Array.from(event.target.classList)
            .find((className) => className.includes('variable-'))
            .split('variable-')
            .slice(1)
            .join('');

            clearTimeout(variableInputTimer);
            
            variableInputTimer = setTimeout(() => {
              window.PROCEED_DATA.put(
                '/tasklist/api/variable',
                { [variableName]: event.target.value },
                {
                  instanceID,
                  userTaskID,
                }
              );
            }, 5000) 
          });
        });
      })
      `;

      const variables = processInstance.getVariables();
      const milestones = await getMilestonesFromElementById(bpmn, query.userTaskID);
      const milestonesData = engine.getMilestones(query.instanceID, query.userTaskID);
      const parsedHtml = whiskers.render(html, {
        ...variables,
        ...milestonesData,
        milestones,
        script,
      });

      return parsedHtml;
    }
  }

  async postUserTask(body, query) {
    const engine = this.getTaskEngine(query);
    engine.completeUserTask(query.instanceID, query.userTaskID, body);

    this.logger.debug('--> Tasklist Form submitted: ', body);

    return 'true';
  }

  getTaskEngine(query) {
    let engine = this.management.getEngineWithID(query.instanceID);

    if (!engine) {
      throw new Error(`No process instance running with id ${query.instanceID}`);
    }

    return engine;
  }

  async putVariable(body, query) {
    const engine = this.getTaskEngine(query);
    engine.updateIntermediateVariablesState(query.instanceID, query.userTaskID, body);

    return 'true';
  }

  async putMilestone(body, query) {
    const engine = this.getTaskEngine(query);
    engine.updateMilestones(query.instanceID, query.userTaskID, body);

    return 'true';
  }
}

module.exports = TaskListTab;
