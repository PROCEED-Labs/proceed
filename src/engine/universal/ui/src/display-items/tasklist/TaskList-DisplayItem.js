const DisplayItem = require('./../../display-item.js');
const distribution = require('@proceed/distribution');
const { logging } = require('@proceed/machine');
const whiskers = require('whiskers/dist/whiskers.min.js');
const { getMilestonesFromElementById } = require('@proceed/bpmn-helper/src/getters');

class TaskListTab extends DisplayItem {
  constructor(management) {
    super('User Tasks', 'tasklist');
    this.management = management;
    this.content = `<!doctype html><html><head><style>body,html{margin:0;padding:0;font-family:sans-serif;font-size:16px;color:#464646;height:100%}.tasklist-container{width:auto;display:flex;flex-direction:row;height:100%}.tasklist-container .list{display:flex;flex-direction:column;box-shadow:0 0 6px -3px #9a9a9a;background:#fafafa;z-index:1}.tasklist-container .list .tasks-wrapper{display:flex;flex-direction:row;justify-content:center;padding:12px}.tasklist-container .list .tasks-wrapper .tasks{display:flex;flex-direction:column}.tasklist-container .list .tasks-wrapper .tasks .infoBox{text-align:center;margin:40px 10px 10px;font-size:1.1em;color:#a5a5a5;letter-spacing:.03em}.tasklist-container .list .tasks-wrapper .return{display:none}.tasklist-container .list .tools{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #d3d3d3}.tools .dropdown-check-list .anchor{position:relative;display:flex;height:100%;width:140px;padding:0 8px;margin:auto 0;cursor:pointer;box-shadow:0 3px 1px -2px rgba(0,0,0,.2),0 2px 2px 0 rgba(0,0,0,.14),0 1px 5px 0 rgba(0,0,0,.12);background-color:#f5f5f5;font-size:.8rem;color:rgba(0,0,0,.87);border-style:none;align-items:center;border-radius:4px;display:inline-flex;flex:0 0 auto;font-weight:600;letter-spacing:.0892857143em;justify-content:center;outline:0;text-decoration:none;text-indent:.0892857143em;text-transform:uppercase;transition-duration:.28s;transition-property:box-shadow,transform,opacity;transition-timing-function:cubic-bezier(.4,0,.2,1);user-select:none;vertical-align:middle;white-space:nowrap;font-family:Roboto,sans-serif}.tools .dropdown-check-list svg{height:1.6em;vertical-align:sub}.tools .dropdown-check-list div.items{display:none;margin:0;border:1px solid #ccc;box-shadow:0 5px 5px -3px rgba(0,0,0,.2),0 8px 10px 1px rgba(0,0,0,.14),0 3px 14px 2px rgba(0,0,0,.12);border-radius:4px;padding:8px 0}.tools .dropdown-check-list.visible .items{display:block;position:absolute;top:35px;z-index:10;background-color:#fff;min-width:100%}.tools .dropdown-check-list.visible.sort .items{right:0}.tools .dropdown-check-list.visible.selection .items{left:0}.tools .dropdown-check-list.visible .items>div{padding:12px 16px}.tools .dropdown-check-list.selection,.tools .dropdown-check-list.sort{display:flex;flex-direction:column;position:relative;margin:5px;height:35px}.tools .dropdown-check-list.sort .items>div{display:flex;flex-direction:row;align-items:center;position:relative;cursor:pointer}.tools .dropdown-check-list.sort .items span{white-space:nowrap}.tools .dropdown-check-list.sort .items svg{height:1.2em;fill:currentColor}.tools .dropdown-check-list.sort .items>div:not(.selected){color:rgba(0,0,0,.87)}.tools .dropdown-check-list.sort .items div:hover:before{opacity:.04}.tools .dropdown-check-list.sort .items>div:before{position:absolute;bottom:0;left:0;right:0;top:0;content:"";pointer-events:none;background-color:currentColor;opacity:0}.tools .dropdown-check-list.sort .items div.selected{color:#1976d2}.tools .dropdown-check-list.sort .items div.selected:before{opacity:.12}.tools .dropdown-check-list.sort .items div.selected.ascending:after{content:url('data:image/svg+xml; utf8, <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>arrow-up-thin</title><path fill="%231976d2" d="M7.03 9.97H11.03V18.89L13.04 16.92V9.97H17.03L12.03 4.97Z" /></svg>');display:block;width:1.2em;height:1.2em;margin-left:4px}.tools .dropdown-check-list.sort .items div.selected.descending:after{content:url('data:image/svg+xml; utf8, <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>arrow-down-thin</title><path fill="%231976d2" d="M7.03 13.92H11.03V5L13.04 4.97V13.92H17.03L12.03 18.92Z" /></svg>');display:block;width:1.2em;height:1.2em;margin-left:4px}.tools .dropdown-check-list .items .status>div{display:flex;align-items:center;margin-top:16px}.tools .dropdown-check-list .items .priority,.tools .dropdown-check-list .items .status{border-bottom:1px solid #d3d3d3}.tools .dropdown-check-list.selection .status input[type=checkbox]{height:16px;width:16px;margin-right:10px}.tools .dropdown-check-list.selection .slider{display:flex;align-items:center}.tools .dropdown-check-list.selection .slider span{white-space:nowrap}.tools .dropdown-check-list.selection input[type=range]:active,:focus{outline:none}.tools .dropdown-check-list.selection input[type=range]::-webkit-slider-thumb{height:12px;width:12px;border-radius:12px;background-color:#1976d2;position:relative;margin:5px 0;cursor:pointer;appearance:none;pointer-events:all;box-shadow:0 1px 4px .5px rgba(0,0,0,.25)}.tools .dropdown-check-list.selection input[type=range]::-webkit-slider-thumb:before{content:" ";display:block;position:absolute;top:13px;left:100%;width:2000px;height:2px}.tools .dropdown-check-list.selection input[type=range]{box-sizing:border-box;appearance:none;width:100%;height:32px;margin:0;overflow:hidden;border:0;border-radius:1px;outline:none;background:linear-gradient(#1976d2,#1976d2) no-repeat 50%;background-size:100% 2px;pointer-events:none}.tools .dropdown-check-list.selection .multi-range{position:relative;width:120px;height:32px;margin-right:10px}.tools .dropdown-check-list.selection .multi-range input[type=range]:nth-child(2){background:none}.tools .dropdown-check-list.selection .multi-range input[type=range]{position:absolute}.tasks .task{display:flex;flex-direction:column;flex-shrink:0;cursor:pointer;padding:8px;line-height:1;font-family:sans-serif;background-color:#fff;max-width:300px;margin-bottom:10px;box-shadow:0 3px 1px -2px rgba(0,0,0,.2),0 2px 2px 0 rgba(0,0,0,.14),0 1px 5px 0 rgba(0,0,0,.12);border:1px solid #d3d3d3;border-radius:8px;color:#868686}.tasks .task>.taskTitle{display:flex;flex-direction:row;justify-content:space-between;align-items:center;font-size:1em;margin-bottom:10px}.tasks .task>.taskTitle span{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.tasks .task>.taskTitle .progress-circular{display:none;vertical-align:middle;justify-content:center;align-items:center;position:relative}.tasks .task>.taskTitle .progress-circular.visible{display:flex}.tasks .task>.taskTitle .progress-circular>svg{width:100%;height:100%;margin:auto;position:absolute;top:0;bottom:0;left:0;right:0;z-index:0}.tasks .task>.taskTitle .progress-circular__underlay{stroke:#b6b6b6!important}.tasks .task>.taskTitle .progress-circular__overlay{stroke:currentColor;z-index:2;transition:all .6s ease-in-out}.tasks .task>.taskTitle .progress-circular__info{align-items:center;display:flex;justify-content:center}.tasks .task>.taskTitle .progress-circular__info .progressText{font-size:.8em}.tasks .task .mainInfo{display:flex;flex-direction:row;font-size:.8em}.tasks .task .mainInfo .user{overflow:hidden;white-space:nowrap;text-overflow:ellipsis;max-width:150px}.tasks .task .leftCol,.tasks .task .rightCol{display:flex;flex-direction:column;margin:0 5px}.tasks .task .leftCol>div,.tasks .task .rightCol>div{margin:2px 0}.tasks .task.completed,.tasks .task.paused{background-color:#868686;color:#fff;border:1px solid #868686}.tasks .task svg{fill:#868686;height:1.2em;vertical-align:text-bottom}.tasks .task.completed svg,.tasks .task.form svg,.tasks .task.paused svg{fill:#fff}.tasks .task.form{background-color:#0094a0;color:#fff;border:1px solid #0094a0}.tasklist-container .formView{flex-grow:1;height:100%;background-color:#fff;font-size:0;position:relative;display:flex;justify-content:center;align-items:center}.tasklist-container .formView .form{width:100%;height:100%;border:none;flex-grow:1}.tasklist-container .formView .form.completed,.tasklist-container .formView .form.paused{opacity:.25}.tasklist-container .formView .overlay{position:absolute;font-size:x-large;text-align:center}@media (max-width:1024px){.tasklist-container .list .tasks-wrapper .tasks .task{padding:6px}}@media (max-width:768px){body,html{height:auto;font-size:16px}.tasklist-container{width:auto;flex-direction:column;height:100vh}.tasklist-container .list{box-shadow:none;z-index:auto;width:100%;flex-grow:1}.tasklist-container .list .tasks-wrapper{display:flex;flex-direction:row;justify-content:flex-end;padding:10px 10px 0}.tasklist-container .list .tasks-wrapper .tasks{margin:auto}.tasklist-container .list .tasks-wrapper .tasks .task{padding:6px}.tasklist-container .list .tasks-wrapper .tasks .task.hidden{display:none}.tasklist-container .list .tasks-wrapper .tasks .task.form{display:flex;flex-direction:column}.tasklist-container .list .tasks-wrapper .tasks .task .form{width:100%;height:100%;border:none;flex-grow:1}.tasklist-container .list .tasks-wrapper .return:not(.hidden){display:block;cursor:pointer}.tasklist-container .list .tasks-wrapper .return>svg{fill:#868686;width:24px;height:24px}.tasklist-container .formView{border-top:1px solid #d3d3d3}.tasklist-container .formView:empty{display:none}}@media (max-width:425px){.tasklist-container .list .tasks-wrapper{display:flex;flex-direction:column-reverse;padding:8px 8px 0}.tasklist-container .list .tasks-wrapper .return:not(.hidden){display:flex;flex-direction:row;justify-content:end}}@media (max-width:375px){body,html{font-size:14px}}</style></head><body><div class="tasklist-container"><div class="list"><div class="tools"><div class="selection dropdown-check-list"><button class="anchor"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>Filter</title><path d="M14,12V19.88C14.04,20.18 13.94,20.5 13.71,20.71C13.32,21.1 12.69,21.1 12.3,20.71L10.29,18.7C10.06,18.47 9.96,18.16 10,17.87V12H9.97L4.21,4.62C3.87,4.19 3.95,3.56 4.38,3.22C4.57,3.08 4.78,3 5,3V3H19V3C19.22,3 19.43,3.08 19.62,3.22C20.05,3.56 20.13,4.19 19.79,4.62L14.03,12H14Z"/></svg> <span>Filter</span></button><div class="items"><div class="status"><span>Status:</span><div><input type="checkbox" value="ready" checked="checked"> <span>Ready</span></div><div><input type="checkbox" value="active" checked="checked"> <span>Active</span></div><div><input type="checkbox" value="paused"> <span>Paused</span></div><div><input type="checkbox" value="completed"> <span>Completed</span></div></div><div class="priority"><span>Priority:</span><div class="slider"><div class="multi-range"><input type="range" min="1" max="10" value="1" class="lower"> <input type="range" min="1" max="10" value="10" class="upper"></div><span>1 - 10</span></div></div><div class="progress"><span>Progress:</span><div class="slider"><div class="multi-range"><input type="range" min="0" max="100" value="0" class="lower"> <input type="range" min="0" max="100" value="100" class="upper"></div><span>0 - 100</span></div></div></div></div><div class="sort dropdown-check-list"><button class="anchor"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>Sort</title><path d="M18 21L14 17H17V7H14L18 3L22 7H19V17H22M2 19V17H12V19M2 13V11H9V13M2 7V5H6V7H2Z"/></svg> <span>Sort</span></button><div class="items"><div id="startTime" class="selected ascending"><span>Start Time</span></div><div id="deadline"><span>Deadline</span></div><div id="progress"><span>Progress</span></div><div id="priority"><span>Priority</span></div><div id="state"><span>State</span></div></div></div></div><div class="tasks-wrapper"><div class="tasks"><div class="infoBox">There are currently no tasks in your queue.</div></div><div class="return hidden"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>Return</title><path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/></svg></div></div></div><div class="formView"></div></div><script>!function(e){var t={};function s(a){if(t[a])return t[a].exports;var r=t[a]={i:a,l:!1,exports:{}};return e[a].call(r.exports,r,r.exports,s),r.l=!0,r.exports}s.m=e,s.c=t,s.d=function(e,t,a){s.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:a})},s.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},s.t=function(e,t){if(1&t&&(e=s(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var a=Object.create(null);if(s.r(a),Object.defineProperty(a,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var r in e)s.d(a,r,function(t){return e[t]}.bind(null,r));return a},s.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return s.d(t,"a",t),t},s.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},s.p="",s(s.s=0)}([function(e,t,s){"use strict";s.r(t);s(1);async function a(e){const t=document.querySelector(".tasks .task.form");t&&i(t);let s=e.target;for(;!s.classList.contains("task");)s=s.parentElement;s.removeEventListener("click",a),document.querySelectorAll(".tasks .task").forEach(e=>{e.classList.add("hidden")});const n=document.querySelector(".return.hidden");n&&n.classList.remove("hidden"),await r({id:s.dataset.id,instanceID:s.dataset.instanceid,state:s.dataset.state}),s.classList.add("form")}async function r(e){const t=document.querySelector(".formView"),s=await window.PROCEED_DATA.get("/tasklist/api/userTask",{instanceID:e.instanceID,userTaskID:e.id}),a=document.createElement("iframe");if(a.className="form "+e.state.toLowerCase(),a.id="form_"+e.id,t.replaceChildren(a),a.contentWindow.document.open(),a.contentWindow.document.write(s),a.contentWindow.PROCEED_DATA=window.PROCEED_DATA,a.contentWindow.document.close(),"PAUSED"===e.state){const e=document.createElement("div");e.className="overlay";const s=document.createElement("h3");s.innerText="This task is paused!";const a=document.createElement("p");a.innerText="This task was paused by your supervisor.",e.append(s,a),t.appendChild(e)}else if("COMPLETED"===e.state){const e=document.createElement("div");e.className="overlay";const s=document.createElement("h3");s.innerText="This task is completed!",e.append(s),t.appendChild(e)}}function i(e){document.querySelector(".formView").replaceChildren(),e.classList.remove("form"),document.querySelectorAll(".task.hidden").forEach(e=>e.classList.remove("hidden"));document.querySelector(".return:not(.hidden)").classList.add("hidden"),e.addEventListener("click",a)}function n(e){document.querySelector(".return").onclick=function(){i(document.querySelector(".tasks .task.form"))};const t=document.querySelectorAll(".sort .items > div"),s=Array.from(t).find(e=>e.classList.contains("selected")),r=document.querySelectorAll(".selection .status input"),n=[];Array.from(r).forEach(e=>{e.checked&&n.push(e.value.toUpperCase())});const l=document.querySelectorAll(".selection .priority input");let u=1,m=10;Array.from(l).forEach(e=>{e.classList.contains("lower")?u=e.value:e.classList.contains("upper")&&(m=e.value)});const f=document.querySelectorAll(".selection .progress input");let p=0,v=100;Array.from(f).forEach(e=>{e.classList.contains("lower")?p=e.value:e.classList.contains("upper")&&(v=e.value)});const y=document.querySelector(".tasks"),g=Array.from(y.querySelectorAll(".task")).map(e=>({id:e.dataset.id,instanceID:e.dataset.instanceid,state:e.dataset.state,progress:e.dataset.progress,priority:e.dataset.priority}));e.forEach(e=>{let t=!1;const s=n.includes(e.state)&&e.priority>=u&&e.priority<=m&&e.progress>=p&&e.progress<=v;for(const a of g)if(t=a.id===e.id&&a.instanceID===e.instanceID,t){s?a.state===e.state&&a.progress==e.progress&&a.priority==e.priority||c(e):o(e);break}!t&&s&&function(e){const t=document.createElement("div");t.dataset.id=e.id,t.dataset.instanceid=e.instanceID,t.dataset.state=e.state,t.dataset.priority=e.priority,t.dataset.progress=e.progress,t.dataset.endTime=e.endTime,t.dataset.startTime=e.startTime,t.className="READY"===e.state?"task new":"task "+e.state.toLowerCase(),t.innerHTML=d(e),t.addEventListener("click",a),document.querySelector(".tasks").appendChild(t)}(e)});g.filter(t=>e.every(e=>e.id!==t.id||e.instanceID!==t.instanceID)).forEach(e=>{o(e)});const h=Array.from(y.querySelectorAll(".task"));0!==h.length?(!function(e,t,s){switch(t){case"startTime":e.sort((e,t)=>e.dataset.startTime===t.dataset.startTime?s?e.dataset.priority-t.dataset.priority:t.dataset.priority-e.dataset.priority:s?e.dataset.startTime-t.dataset.startTime:t.dataset.startTime-e.dataset.startTime);break;case"deadline":e.sort((e,t)=>e.dataset.endTime===t.dataset.endTime?s?e.dataset.startTime-t.dataset.startTime:t.dataset.startTime-e.dataset.startTime:s?e.dataset.endTime-t.dataset.endTime:t.dataset.endTime-e.dataset.endTime);break;case"progress":e.sort((e,t)=>e.dataset.progress===t.dataset.progress?s?e.dataset.startTime-t.dataset.startTime:t.dataset.startTime-e.dataset.startTime:s?e.dataset.progress-t.dataset.progress:t.dataset.progress-e.dataset.progress);break;case"priority":e.sort((e,t)=>e.dataset.priority===t.dataset.priority?s?e.dataset.startTime-t.dataset.startTime:t.dataset.startTime-e.dataset.startTime:s?e.dataset.priority-t.dataset.priority:t.dataset.priority-e.dataset.priority);break;case"state":e.sort((e,t)=>{const a=["READY","ACTIVE","PAUSED","COMPLETED"];if(e.dataset.state===t.dataset.state)return s?e.dataset.startTime-t.dataset.startTime:t.dataset.startTime-e.dataset.startTime;const r=a.findIndex(t=>e.dataset.state===t),i=a.findIndex(e=>t.dataset.state===e);return s?r-i:i-r})}}(h,s.id,s.classList.contains("ascending")),h.forEach((e,t)=>{e.style.order=t+1}),0===g.length&&null!==y.firstElementChild&&y.removeChild(y.firstElementChild)):0!==g.length&&(y.innerHTML='\\n      <div class="infoBox">There are currently no tasks in your queue.</div>\\n      ')}function o(e){document.querySelector(".tasks").querySelector(\`.task[data-instanceid="\${e.instanceID}"][data-id="\${e.id}"]\`).remove(),function(e){const t=document.querySelector(".formView"),s=t.querySelector("#form_"+e);if(s){t.removeChild(s);document.querySelector(".return:not(.hidden)").classList.add("hidden")}}(e.id)}function c(e){const t=document.querySelector(".tasks").querySelector(\`.task[data-instanceid="\${e.instanceID}"][data-id="\${e.id}"]\`);t.classList.remove("new","active","paused","completed"),t.classList.add(e.state.toLowerCase()),t.dataset.state=e.state,t.dataset.progress=e.progress,t.dataset.priority=e.priority,t.innerHTML=d(e);document.querySelector(".formView").querySelector("#form_"+e.id)&&r(e)}function d(e){const t=new Date(e.startTime).toLocaleString(void 0,{year:"2-digit",month:"2-digit",day:"2-digit",hour:"numeric",minute:"numeric"}),s=e.endTime?new Date(e.endTime).toLocaleString(void 0,{year:"2-digit",month:"2-digit",day:"2-digit",hour:"numeric",minute:"numeric"}):"Not specified",a=(+new Date-e.startTime)/864e5,r=24*(a-Math.floor(a)),i=60*(r-Math.floor(r)),n=\`\${a>=1?Math.floor(a)+"d":""} \${r>=1?Math.floor(r)+"h":""} \${Math.floor(i)}min\`,o="READY"===e.state?"NEW":e.state,c=parseInt(e.progress);return\`\\n  <div class="taskTitle" title="\${e.name||e.id}">\\n    <span>\${e.name||e.id}</span>\\n    <div class="progress-circular \${c>0?"visible":""}" style="height: 25px; width: 25px;">\\n      <svg xmlns="http://www.w3.org/2000/svg" viewBox="21.73913043478261 21.73913043478261 43.47826086956522 43.47826086956522" style="transform: rotate(270deg);">\\n        <circle fill="transparent" cx="43.47826086956522" cy="43.47826086956522" r="20" stroke-width="3.4782608695652177" stroke-dasharray="125.664" stroke-dashoffset="0" class="progress-circular__underlay"></circle>\\n        <circle fill="transparent" cx="43.47826086956522" cy="43.47826086956522" r="20" stroke-width="3.4782608695652177" stroke-dasharray="125.664" stroke-dashoffset="\${125.664*(1-c/100)}px" class="progress-circular__overlay"></circle>\\n      </svg>\\n      <div class="progress-circular__info">\\n        <span class="progressText">\${Math.floor(c)}</span>\\n      </div>\\n    </div>\\n  </div>\\n  <div class="mainInfo"> \\n    <div class="leftCol"> \\n      <div class="user" title="Owner of User Task: Max Mustermann"><svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="user" class="svg-inline--fa fa-user fa-w-14" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" /></svg> <span class="name">Max Mustermann</span> </div>\\n      <div class="priority" title="Priority of User Task"><svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="user" class="svg-inline--fa fa-user fa-w-14" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9,7V17H11V13H13A2,2 0 0,0 15,11V9A2,2 0 0,0 13,7H9M11,9H13V11H11V9M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2Z" /></svg> <span>\${e.priority}/10</span> </div>\\n      <div class="status" title="Current Status of User Task"><svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="user" class="svg-inline--fa fa-user fa-w-14" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19.66 9.64L19.3 8.7L21.16 8C20.24 5.88 18.6 4.18 16.54 3.14L15.74 4.92L14.82 4.5L15.62 2.7C14.5 2.26 13.28 2 12 2C10.94 2 9.92 2.22 8.96 2.5L9.64 4.34L8.7 4.7L8 2.84C5.88 3.76 4.18 5.4 3.14 7.46L4.92 8.26L4.5 9.18L2.7 8.38C2.26 9.5 2 10.72 2 12C2 13.06 2.22 14.08 2.5 15.04L4.34 14.36L4.7 15.3L2.84 16C3.76 18.12 5.4 19.82 7.46 20.86L8.26 19.08L9.18 19.5L8.38 21.3C9.5 21.74 10.72 22 12 22C13.06 22 14.08 21.78 15.04 21.5L14.36 19.66L15.3 19.3L16 21.16C18.12 20.24 19.82 18.6 20.86 16.54L19.08 15.74L19.5 14.82L21.3 15.62C21.74 14.5 22 13.28 22 12C22 10.94 21.78 9.92 21.5 8.96L19.66 9.64M14.3 17.54C11.24 18.8 7.72 17.36 6.46 14.3S6.64 7.72 9.7 6.46 16.28 6.64 17.54 9.7C18.82 12.76 17.36 16.28 14.3 17.54Z" /></svg> <span>\${o}</span></div>\\n    </div>\\n    <div class="rightCol"> \\n      <div class="added" title="Start Time of User Task"><svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="user" class="svg-inline--fa fa-user fa-w-14" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1M17,12H12V17H17V12Z" /></svg> <span>\${t}</span> </div>\\n      <div class="runningTime" title="Running Time of User Task"><svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="history" class="svg-inline--fa fa-history fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19.03 7.39L20.45 5.97C20 5.46 19.55 5 19.04 4.56L17.62 6C16.07 4.74 14.12 4 12 4C7.03 4 3 8.03 3 13S7.03 22 12 22C17 22 21 17.97 21 13C21 10.88 20.26 8.93 19.03 7.39M13 14H11V7H13V14M15 1H9V3H15V1Z" /></svg> <span>\${n}</span></div>\\n      <div class="due" title="Deadline of User Task"><svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="user" class="svg-inline--fa fa-user fa-w-14" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 1V3H5C3.89 3 3 3.89 3 5V19C3 20.11 3.9 21 5 21H19C20.11 21 21 20.11 21 19V5C21 3.9 20.11 3 19 3H18V1H16V3H8V1H6M5 8H19V19H5V8M11 9V14H13V9H11M11 16V18H13V16H11Z" /></svg> <span>\${s}</span> </div>\\n    </div>\\n  </div>\`}function l(){window.PROCEED_DATA.get("/tasklist/api/").then(e=>{n(e)})}window.addEventListener("DOMContentLoaded",()=>{!function(){const e=document.querySelector(".selection"),t=document.querySelector(".sort");e.querySelector(".anchor").onclick=function(){e.classList.contains("visible")?e.classList.remove("visible"):(e.classList.add("visible"),t.classList.contains("visible")&&t.classList.remove("visible"))},t.querySelector(".anchor").onclick=function(s){t.classList.contains("visible")?t.classList.remove("visible"):(t.classList.add("visible"),e.classList.contains("visible")&&e.classList.remove("visible"))};const s=document.querySelectorAll(".sort .items > div");Array.from(s).forEach(e=>{e.onclick=function(){if(e.classList.contains("selected")&&e.classList.contains("ascending"))e.classList.remove("ascending"),e.classList.add("descending");else if(e.classList.contains("selected")&&e.classList.contains("descending"))e.classList.remove("descending"),e.classList.add("ascending");else{Array.from(s).find(e=>e.classList.contains("selected")).classList.remove("selected","ascending","descending"),e.classList.add("selected","ascending")}}});const a=document.querySelector(".selection .priority input.lower"),r=document.querySelector(".selection .priority input.upper"),i=document.querySelector(".selection .priority .slider span");let n=a.value,o=r.value;a.oninput=function(e){n=e.target.value,i.innerHTML=\`\${n} - \${o}\`},r.oninput=function(e){o=e.target.value,i.innerHTML=\`\${n} - \${o}\`};const c=document.querySelector(".selection .progress input.lower"),d=document.querySelector(".selection .progress input.upper"),l=document.querySelector(".selection .progress .slider span");let u=c.value,m=d.value;c.oninput=function(e){u=e.target.value,l.innerHTML=\`\${u} - \${m}\`},d.oninput=function(e){m=e.target.value,l.innerHTML=\`\${u} - \${m}\`}}(),window.setInterval(l,1e3),l()})},function(e,t,s){}]);</script></body></html>`;
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
    const inactiveTasks = await this.management.getInactiveUserTasks();

    const taskInfos = [...tasks, ...inactiveTasks].map((task) => {
      return {
        id: task.id,
        name: task.name,
        instanceID: task.processInstance.id,
        attrs: task.attrs,
        state: task.state,
        priority: task.priority,
        progress: task.progress,
        startTime: task.startTime,
        endTime: task.endTime,
      };
    });
    return taskInfos;
  }

  async getUserTask(query) {
    const instanceId = query.instanceID;

    let engine = this.management.getEngineWithID(instanceId);

    let userTask;
    let definitionId;
    let variables;
    let milestonesData;

    if (engine) {
      userTask = engine.userTasks.find(
        (userTask) => userTask.processInstance.id === instanceId && userTask.id === query.userTaskID
      );

      if (!userTask.processInstance) {
        throw new Error(`No pending user task with id ${query.userTaskID}`);
      }

      definitionId = engine.definitionId;
      variables = userTask.processInstance.getVariables();
      milestonesData = engine.getMilestones(query.instanceID, query.userTaskID);
    } else {
      const inactiveTasks = await this.management.getInactiveUserTasks();
      userTask = inactiveTasks.find(
        (task) => task.processInstance.id === query.instanceID && task.id === query.userTaskID
      );
      const allInstances = await distribution.db.getArchivedInstances(userTask.definitionId);
      const userTaskInstance = allInstances[query.instanceID];
      const userTaskToken = userTaskInstance.tokens.find(
        (token) => token.currentFlowElementId === query.userTaskID
      );

      definitionId = userTask.definitionId;
      variables = userTaskInstance.variables;

      if (userTaskToken) {
        milestonesData = userTaskToken.milestones;
      } else {
        const logEntry = userTaskInstance.log.find((log) => log.flowElementId === query.userTaskID);
        milestonesData = logEntry.milestones;
      }
    }

    const {
      implementation,
      attrs,
      ['_5thIndustryInspectionOrderLink']: inspectionOrderLink,
      activate,
      definitionVersion,
    } = userTask;

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
      if (activate) {
        activate();
      }

      const { 'proceed:fileName': userTaskFileName } = attrs;

      const html = await distribution.db.getHTML(definitionId, userTaskFileName);

      const bpmn = await distribution.db.getProcessVersion(definitionId, definitionVersion);

      const milestones = await getMilestonesFromElementById(bpmn, query.userTaskID);

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
