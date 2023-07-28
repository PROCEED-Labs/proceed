import * as backendProcesses from '@/backend/shared-electron-server/data/process.js';
import {
  getBPMN,
  updateProcess,
  saveScriptTaskJS,
} from '@/backend/shared-electron-server/data/fileHandling.js';
import {
  setDefinitionsName,
  addDocumentation,
  getDefinitionsVersionInformation,
  setDefinitionsVersionInformation,
} from '@proceed/bpmn-helper';

async function getProcess(id) {
  const process = backendProcesses.getProcesses().find((p) => p.id === id);
  const bpmn = await backendProcesses.getProcessBpmn(id);
  return { ...process, bpmn };
}

async function pullProcess(id) {
  return await getProcess(id);
}

async function updateProcessName(processDefinitionsId, newName) {
  let bpmn = await getBPMN(processDefinitionsId);
  bpmn = await setDefinitionsName(bpmn, newName);
  // don't use backendProcess.updateProcess to avoid having to parse the bpmn
  await updateProcess(processDefinitionsId, bpmn);
}

async function updateProcessVersionBasedOn(processDefinitionsId, versionBasedOn) {
  let bpmn = await getBPMN(processDefinitionsId);

  const versionInformation = await getDefinitionsVersionInformation(bpmn);

  bpmn = await setDefinitionsVersionInformation(bpmn, { ...versionInformation, versionBasedOn });

  // don't use backendProcess.updateProcess to avoid having to parse the bpmn
  await updateProcess(processDefinitionsId, bpmn);
}

async function updateProcessDescription(processDefinitionsId, processId, description) {
  let bpmn = await backendProcesses.getProcessBpmn(processDefinitionsId);
  bpmn = await addDocumentation(bpmn, description);
  await updateProcess(processDefinitionsId, bpmn);
}

async function updateWholeXml(processDefinitionsId, bpmn) {
  await backendProcesses.updateProcess(processDefinitionsId, { bpmn });
}

export default {
  getProcesses: backendProcesses.getProcesses,
  getProcess,
  addProcess: backendProcesses.addProcess,
  updateWholeXml,
  updateProcess: backendProcesses.updateProcess,
  updateProcessMetaData: backendProcesses.updateProcessMetaData,
  updateProcessName,
  updateProcessVersionBasedOn,
  updateProcessDescription,
  removeProcess: backendProcesses.removeProcess,
  addProcessVersion: backendProcesses.addProcessVersion,
  getProcessVersionBpmn: backendProcesses.getProcessVersionBpmn,
  observeProcessEditing: () => {},
  stopObservingProcessEditing: () => {},
  blockProcess: () => {},
  unblockProcess: () => {},
  blockTask: () => {},
  unblockTask: () => {},
  broadcastBPMNEvents: () => {},
  broadcastScriptChangeEvent: () => {},
  getUserTasksHTML: backendProcesses.getProcessUserTasksHtml,
  saveUserTaskHTML: backendProcesses.saveProcessUserTask,
  deleteUserTaskHTML: backendProcesses.deleteProcessUserTask,
  getImages: backendProcesses.getProcessImages,
  getImage: backendProcesses.getProcessImage,
  saveImage: backendProcesses.saveProcessImage,
  saveScriptTaskJS,
  updateConstraints: () => {},
  pullProcess,
  pushToBackend: () => {},
};
